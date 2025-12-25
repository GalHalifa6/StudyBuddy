import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { SessionsStackParamList } from '../../navigation/types';
import { sessionApi } from '../../api/sessions';
import { expertsApi } from '../../api/experts';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { useSessionWebSocket, SessionMessage as WSMessage } from '../../hooks/useSessionWebSocket';
import { JitsiMeetEmbed } from '../../components/JitsiMeetEmbed';

type Props = NativeStackScreenProps<SessionsStackParamList, 'SessionRoom'>;
type Styles = ReturnType<typeof createStyles>;

type ActivePanel = 'chat' | 'participants' | 'info';

interface ChatMessage {
  id: number;
  sender: string;
  senderId?: number;
  content: string;
  timestamp: Date;
  type: 'text' | 'file' | 'system';
}

interface Participant {
  id: number;
  name: string;
  role?: 'expert' | 'student';
  isOnline: boolean;
  isHost?: boolean;
}

const SessionRoomScreen: React.FC<Props> = ({ route, navigation }) => {
  const { sessionId, sessionTitle } = route.params;
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const seenMessageIds = useRef<Set<number>>(new Set());
  const hasJoined = useRef(false);

  // State
  const [activePanel, setActivePanel] = useState<ActivePanel>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'active' | 'ended'>('waiting');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [onlineParticipants, setOnlineParticipants] = useState<Participant[]>([]);

  // Fetch session details
  const {
    data: session,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['sessions', 'details', sessionId],
    queryFn: () => sessionApi.getById(sessionId),
  });

  // Fetch participants with polling to keep list updated
  const { data: participants = [], refetch: refetchParticipants } = useQuery({
    queryKey: ['sessions', 'participants', sessionId],
    queryFn: () => sessionApi.participants(sessionId),
    refetchInterval: 5000, // Poll every 5 seconds to keep participants list fresh
  });

  // Fetch messages with polling to sync with web
  const { data: apiMessages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['sessions', 'messages', sessionId],
    queryFn: () => sessionApi.getMessages(sessionId),
    refetchInterval: 2000, // Poll every 2 seconds to get new messages from web
    enabled: !!sessionId,
  });

  // Check if current user is the expert/host
  const isExpert = user?.role === 'EXPERT';
  const isSessionHost = session?.expert?.id === user?.id;

  // Start session mutation (for experts)
  const startMutation = useMutation({
    mutationFn: () => expertsApi.startSession(sessionId),
    onSuccess: () => {
      showToast('Session started!', 'success');
      setSessionStatus('active');
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'System',
        content: '🚀 Session has started! Good luck!',
        timestamp: new Date(),
        type: 'system',
      }]);
      refetch();
    },
    onError: error => {
      const apiError = mapApiError(error);
      showToast(apiError.message, 'error');
    },
  });

  // End session mutation (for experts)
  const endMutation = useMutation({
    mutationFn: () => expertsApi.completeSession(sessionId),
    onSuccess: () => {
      showToast('Session ended', 'info');
      setSessionStatus('ended');
      refetch();
    },
    onError: error => {
      const apiError = mapApiError(error);
      showToast(apiError.message, 'error');
    },
  });

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: WSMessage) => {
    const msgId = message.id || Date.now();
    
    // Skip if we've already processed this message
    if (seenMessageIds.current.has(msgId)) {
      return;
    }
    seenMessageIds.current.add(msgId);
    
    const newMsg: ChatMessage = {
      id: msgId,
      sender: message.senderName,
      senderId: message.senderId,
      content: message.content,
      timestamp: new Date(message.timestamp),
      type: message.type as 'text' | 'file' | 'system',
    };
    
    setMessages(prev => [...prev, newMsg]);
    
    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // WebSocket participant join handler
  const handleParticipantJoin = useCallback((participant: { id: number; name: string; role?: 'expert' | 'student' }) => {
    setOnlineParticipants(prev => {
      if (prev.some(p => p.id === participant.id)) {
        return prev.map(p => p.id === participant.id ? { ...p, isOnline: true } : p);
      }
      return [...prev, { ...participant, isOnline: true }];
    });
    
    // Add system message for join
    setMessages(prev => {
      const recentJoinMsg = prev.find(m => 
        m.type === 'system' && 
        m.content.includes(participant.name) && 
        m.content.includes('joined') &&
        Date.now() - m.timestamp.getTime() < 5000
      );
      if (recentJoinMsg) return prev;
      return [...prev, {
        id: Date.now(),
        sender: 'System',
        content: `${participant.name} joined the session`,
        timestamp: new Date(),
        type: 'system',
      }];
    });
  }, []);

  // WebSocket participant leave handler
  const handleParticipantLeave = useCallback((participantId: number) => {
    setOnlineParticipants(prev => {
      const leaving = prev.find(p => p.id === participantId);
      if (leaving) {
        setMessages(msgs => [...msgs, {
          id: Date.now(),
          sender: 'System',
          content: `${leaving.name} left the session`,
          timestamp: new Date(),
          type: 'system',
        }]);
      }
      return prev.filter(p => p.id !== participantId);
    });
  }, []);

  // WebSocket session status change handler
  const handleSessionStatusChange = useCallback((status: string) => {
    if (status === 'In Progress' || status === 'ACTIVE' || status === 'IN_PROGRESS') {
      setSessionStatus('active');
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'System',
        content: '🚀 Session has started!',
        timestamp: new Date(),
        type: 'system',
      }]);
    } else if (status === 'Completed' || status === 'Cancelled' || status === 'ENDED') {
      setSessionStatus('ended');
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'System',
        content: '📋 Session has ended. Thank you for participating!',
        timestamp: new Date(),
        type: 'system',
      }]);
    }
  }, []);

  // Sync API messages to local state (for messages sent from web)
  useEffect(() => {
    if (apiMessages.length > 0) {
      const newMessages: ChatMessage[] = apiMessages
        .filter(apiMsg => !seenMessageIds.current.has(apiMsg.id))
        .map(apiMsg => {
          seenMessageIds.current.add(apiMsg.id);
          return {
            id: apiMsg.id,
            sender: apiMsg.senderName,
            senderId: apiMsg.senderId,
            content: apiMsg.content,
            timestamp: new Date(apiMsg.timestamp),
            type: apiMsg.type as 'text' | 'file' | 'system',
          };
        });
      
      if (newMessages.length > 0) {
        setMessages(prev => {
          // Merge and sort by timestamp, avoiding duplicates
          const existingIds = new Set(prev.map(m => m.id));
          const toAdd = newMessages.filter(m => !existingIds.has(m.id));
          if (toAdd.length === 0) return prev;
          
          const merged = [...prev, ...toAdd];
          merged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          return merged;
        });
        
        // Scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    }
  }, [apiMessages]);

  // Connect to WebSocket for real-time messaging
  const {
    isConnected,
    connectionError,
    sendChatMessage,
    notifyJoin,
    notifyLeave,
    reconnect,
  } = useSessionWebSocket({
    sessionId,
    userId: user?.id,
    userName: user?.fullName || user?.username || 'Anonymous',
    onMessage: handleWebSocketMessage,
    onParticipantJoin: handleParticipantJoin,
    onParticipantLeave: handleParticipantLeave,
    onSessionStatusChange: handleSessionStatusChange,
    enabled: false, // Disabled - using REST API fallback for now
  });

  // Notify join when WebSocket connected
  useEffect(() => {
    if (isConnected && session && user && !hasJoined.current && notifyJoin) {
      hasJoined.current = true;
      
      // Add self to online participants
      setOnlineParticipants(prev => {
        const selfExists = prev.some(p => p.id === user.id);
        if (selfExists) return prev;
        return [...prev, {
          id: user.id!,
          name: user.fullName || user.username || 'You',
          role: (user.role === 'EXPERT' || user.role === 'ADMIN') ? 'expert' : 'student',
          isOnline: true,
        }];
      });
      
      // Notify others that we joined
      notifyJoin();
    }
  }, [isConnected, session, user, notifyJoin]);

  // Handle leave notification when navigating away
  useEffect(() => {
    return () => {
      if (hasJoined.current) {
        hasJoined.current = false;
        notifyLeave();
      }
    };
  }, [notifyLeave]);

  // Initialize session state and welcome message
  useEffect(() => {
    if (session) {
      const isInProgress = session.status === 'In Progress' || (session as any).statusKey === 'IN_PROGRESS';
      const isCompleted = session.status === 'Completed' || session.status === 'Cancelled';
      if (isInProgress) {
        setSessionStatus('active');
      } else if (isCompleted) {
        setSessionStatus('ended');
      }

      // Load initial messages from API if we have them
      if (apiMessages.length > 0 && messages.length === 0) {
        const initialMessages: ChatMessage[] = apiMessages.map(apiMsg => {
          seenMessageIds.current.add(apiMsg.id);
          return {
            id: apiMsg.id,
            sender: apiMsg.senderName,
            senderId: apiMsg.senderId,
            content: apiMsg.content,
            timestamp: new Date(apiMsg.timestamp),
            type: apiMsg.type as 'text' | 'file' | 'system',
          };
        });
        setMessages(initialMessages);
      } else if (messages.length === 0 && apiMessages.length === 0) {
        // Add welcome message if no messages exist
        setMessages([{
          id: 1,
          sender: 'System',
          content: `Welcome to "${session.title || sessionTitle}"! 🎓`,
          timestamp: new Date(),
          type: 'system',
        }]);
      }
    }
  }, [session, sessionTitle, apiMessages, messages.length]);

  // Timer for active sessions
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (sessionStatus === 'active') {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStatus]);

  // Format elapsed time
  const formatElapsed = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle sending a message via WebSocket (fallback to REST if WebSocket not connected)
  // Memoize video component to prevent remounting when messages change
  const videoComponent = useMemo(() => {
    if (sessionStatus !== 'active' || !session?.id) return null;
    
    // Generate stable meeting link based on session ID
    const meetingLink = session?.meetingLink || `https://meet.jit.si/studybuddy-${session.id}`;
    
    return (
      <View style={styles.videoContainer}>
        <JitsiMeetEmbed
          key={`jitsi-${session.id}`} // Stable key based on session ID only
          roomName={meetingLink}
          displayName={user?.fullName || user?.username || 'Participant'}
          userEmail={user?.email}
          userId={user?.id}
          isExpert={isSessionHost} // Expert is the host
          config={{
            startWithAudioMuted: false, // Auto-join with audio enabled
            startWithVideoMuted: false, // Auto-join with video enabled
            enableWelcomePage: false, // Skip welcome page - already authenticated
            enableClosePage: false,
          }}
          style={styles.videoEmbed}
        />
      </View>
    );
  }, [sessionStatus, session?.id, session?.meetingLink, user?.fullName, user?.username, styles.videoContainer, styles.videoEmbed]);

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately

    // Try to send via WebSocket first
    if (isConnected && sendChatMessage) {
      const sent = sendChatMessage(messageContent, 'text');
      if (sent) {
        // Message will be received via WebSocket handler
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
        return;
      }
    }

    // Fallback to REST API if WebSocket not available
    sessionApi.sendMessage(sessionId, messageContent).then((sentMessage) => {
      // Add message locally since we're using REST fallback
      const localMsg: ChatMessage = {
        id: sentMessage.id,
        sender: sentMessage.senderName,
        senderId: sentMessage.senderId,
        content: sentMessage.content,
        timestamp: new Date(sentMessage.timestamp),
        type: sentMessage.type,
      };
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === sentMessage.id)) return prev;
        return [...prev, localMsg];
      });
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }).catch((error) => {
      const apiError = mapApiError(error);
      showToast(apiError.message, 'error');
      // Restore message text on error
      setNewMessage(messageContent);
    });
  }, [newMessage, isConnected, sendChatMessage, sessionId]);

  // Handle start session
  const handleStartSession = () => {
    Alert.alert(
      'Start Session',
      'Are you ready to start this session? All participants will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start', onPress: () => startMutation.mutate() },
      ]
    );
  };

  // Handle end session
  const handleEndSession = () => {
    Alert.alert(
      'End Session',
      'Are you sure you want to end this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: () => endMutation.mutate(),
        },
      ]
    );
  };

  // Handle opening external meeting link (Jitsi or other platform)
  const handleOpenMeetingLink = async () => {
    if (session?.meetingLink) {
      try {
        // For Jitsi, open in browser/app; for other platforms, use their native app if available
        const url = session.meetingLink;
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          showToast('Could not open meeting link', 'error');
        }
      } catch (error) {
        showToast('Could not open meeting link', 'error');
      }
    } else {
      showToast('No meeting link available', 'error');
    }
  };

  // Render chat message
  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => {
    const isSystem = item.type === 'system';
    const isMe = item.senderId === user?.id;

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.messageContainer, isMe && styles.messageContainerMe]}>
        {!isMe && (
          <View style={styles.messageAvatar}>
            <Text style={styles.messageAvatarText}>{item.sender.charAt(0)}</Text>
          </View>
        )}
        <View style={[styles.messageBubble, isMe && styles.messageBubbleMe]}>
          {!isMe && <Text style={styles.messageSender}>{item.sender}</Text>}
          <Text style={[styles.messageContent, isMe && styles.messageContentMe]}>
            {item.content}
          </Text>
          <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  }, [user?.id, styles]);

  // Render participant item
  const renderParticipant = useCallback(({ item }: { item: { id: number; fullName?: string; username: string } }) => (
    <View style={styles.participantItem}>
      <View style={styles.participantAvatar}>
        <Text style={styles.participantAvatarText}>
          {(item.fullName || item.username).charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>{item.fullName || item.username}</Text>
        <View style={styles.participantStatus}>
          <View style={styles.onlineDot} />
          <Text style={styles.participantStatusText}>Online</Text>
        </View>
      </View>
    </View>
  ), [styles]);

  if (isLoading && !session) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Joining session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[colors.heroGradientStart, colors.heroGradientMid, colors.heroGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerTitleArea}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {session?.title || sessionTitle || 'Session'}
              </Text>
              {sessionStatus === 'active' && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </View>
            <View style={styles.headerMeta}>
              <Ionicons name="people" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={styles.headerMetaText}>
                {Math.max(participants.length, onlineParticipants.length)} participants
              </Text>
              {sessionStatus === 'active' ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: spacing.sm }}>
                  <Ionicons name="time" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={[styles.headerMetaText, { marginLeft: 4 }]}>{formatElapsed(elapsedSeconds)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Session Controls */}
        <View style={styles.headerActions}>
          {session?.meetingLink && sessionStatus === 'active' && session?.meetingPlatform !== 'JITSI' && (
            <Pressable style={styles.actionButton} onPress={handleOpenMeetingLink}>
              <Ionicons name="videocam" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Video Call</Text>
            </Pressable>
          )}
          {isSessionHost && sessionStatus === 'waiting' && (
            <Pressable
              style={[styles.actionButton, styles.startButton]}
              onPress={handleStartSession}
              disabled={startMutation.isPending}
            >
              {startMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>Start</Text>
                </>
              )}
            </Pressable>
          )}
          {isSessionHost && sessionStatus === 'active' && (
            <Pressable
              style={[styles.actionButton, styles.endButton]}
              onPress={handleEndSession}
              disabled={endMutation.isPending}
            >
              {endMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="stop" size={18} color="#fff" />
                  <Text style={styles.actionButtonText}>End</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </LinearGradient>

      {/* Tab Selector */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activePanel === 'chat' && styles.tabActive]}
          onPress={() => setActivePanel('chat')}
        >
          <Ionicons
            name="chatbubbles"
            size={20}
            color={activePanel === 'chat' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activePanel === 'chat' && styles.tabTextActive]}>Chat</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activePanel === 'participants' && styles.tabActive]}
          onPress={() => setActivePanel('participants')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activePanel === 'participants' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activePanel === 'participants' && styles.tabTextActive]}>
            People ({participants.length + 1})
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activePanel === 'info' && styles.tabActive]}
          onPress={() => setActivePanel('info')}
        >
          <Ionicons
            name="information-circle"
            size={20}
            color={activePanel === 'info' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activePanel === 'info' && styles.tabTextActive]}>Info</Text>
        </Pressable>
      </View>

      {/* Video Call Area - Show when session is active - memoized to prevent remounting */}
      {videoComponent}

      {/* Content Area */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {activePanel === 'chat' && (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => String(item.id)}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />
            <View style={styles.inputArea}>
              <TextInput
                style={styles.input}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={1000}
              />
              <Pressable
                style={[styles.sendButton, !newMessage.trim() && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!newMessage.trim()}
              >
                <Ionicons name="send" size={20} color={newMessage.trim() ? '#fff' : colors.textMuted} />
              </Pressable>
            </View>
          </>
        )}

        {activePanel === 'participants' && (
          <FlatList
            data={(() => {
              // Merge API participants with online participants
              const allParticipants: Array<{
                id: number;
                fullName?: string;
                username: string;
                isHost: boolean;
                isOnline: boolean;
              }> = [];
              
              // Add expert/host first (always mark as online since they're the host)
              if (session?.expert) {
                allParticipants.push({
                  id: session.expert.id,
                  fullName: session.expert.fullName || 'Expert',
                  username: 'expert',
                  isHost: true,
                  isOnline: true, // Host is always considered online
                });
              }
              
              // Add API participants (mark all as online since we can't track real-time without WebSocket)
              const seenIds = new Set(allParticipants.map(p => p.id));
              participants.forEach(p => {
                if (!seenIds.has(p.id)) {
                  allParticipants.push({
                    id: p.id,
                    fullName: p.fullName,
                    username: p.username,
                    isHost: false,
                    isOnline: true, // Assume online since they're participants in the session
                  });
                  seenIds.add(p.id);
                }
              });
              
              // Add any online participants not in API list
              onlineParticipants.forEach(op => {
                if (!seenIds.has(op.id)) {
                  allParticipants.push({
                    id: op.id,
                    fullName: op.name,
                    username: op.name,
                    isHost: op.role === 'expert',
                    isOnline: true,
                  });
                  seenIds.add(op.id);
                }
              });
              
              return allParticipants;
            })()}
            renderItem={({ item }) => (
              <View style={styles.participantItem}>
                <View style={[styles.participantAvatar, item.isHost && styles.participantAvatarHost]}>
                  <Text style={styles.participantAvatarText}>
                    {(item.fullName || item.username).charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.participantInfo}>
                  <View style={styles.participantNameRow}>
                    <Text style={styles.participantName}>{item.fullName || item.username}</Text>
                    {item.isHost ? (
                      <View style={styles.hostBadge}>
                        <Ionicons name="star" size={10} color={colors.secondary} />
                        <Text style={styles.hostBadgeText}>Host</Text>
                      </View>
                    ) : null}
                    {item.id === user?.id ? (
                      <View style={[styles.hostBadge, { backgroundColor: `${colors.primary}20` }]}>
                        <Text style={[styles.hostBadgeText, { color: colors.primary }]}>You</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.participantStatus}>
                    <View style={[styles.onlineDot, { backgroundColor: item.isOnline ? '#10B981' : colors.textMuted }]} />
                    <Text style={styles.participantStatusText}>{item.isOnline ? 'Online' : 'Offline'}</Text>
                  </View>
                </View>
              </View>
            )}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.participantsList}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No other participants yet</Text>
              </View>
            }
          />
        )}

        {activePanel === 'info' && (
          <View style={styles.infoPanel}>
            {session?.description && (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Description</Text>
                <Text style={styles.infoValue}>{session.description}</Text>
              </View>
            )}
            {session?.agenda && (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Agenda</Text>
                <Text style={styles.infoValue}>{session.agenda}</Text>
              </View>
            )}
            {session?.course && (session.course.code || session.course.name) ? (
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>Course</Text>
                <Text style={styles.infoValue}>
                  {[session.course.code, session.course.name].filter(Boolean).join(' - ')}
                </Text>
              </View>
            ) : null}
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Status</Text>
              <View style={[styles.statusBadge, sessionStatus === 'active' && styles.statusBadgeActive]}>
                <Text style={[styles.statusText, sessionStatus === 'active' && styles.statusTextActive]}>
                  {sessionStatus === 'waiting' ? 'Waiting to start' : sessionStatus === 'active' ? 'In Progress' : 'Ended'}
                </Text>
              </View>
            </View>
          </View>
        )}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
    },
    loadingText: {
      fontSize: typography.body,
      color: colors.textSecondary,
    },
    header: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      paddingTop: spacing.sm,
    },
    headerTop: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    headerTitleArea: {
      flex: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerTitle: {
      fontSize: typography.subheading,
      fontWeight: '700',
      color: '#fff',
      flex: 1,
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(16, 185, 129, 0.3)',
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      gap: 4,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10B981',
    },
    liveText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#10B981',
    },
    headerMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 4,
    },
    headerMetaText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.8)',
    },
    connectionDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 4,
    },
    headerActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    startButton: {
      backgroundColor: '#10B981',
    },
    endButton: {
      backgroundColor: '#EF4444',
    },
    actionButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: spacing.md,
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    tabText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.primary,
      fontWeight: '600',
    },
    videoContainer: {
      height: 300, // Fixed height to prevent stretching
      backgroundColor: '#000',
      minHeight: 300,
      maxHeight: 300,
      flexShrink: 0, // Prevent shrinking when messages grow
    },
    videoEmbed: {
      flex: 1,
      height: '100%',
    },
    content: {
      flex: 1,
    },
    messagesList: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    systemMessageContainer: {
      alignItems: 'center',
      marginVertical: spacing.sm,
    },
    systemMessageText: {
      fontSize: 13,
      color: colors.textMuted,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    messageContainer: {
      flexDirection: 'row',
      marginVertical: spacing.xs,
      alignItems: 'flex-end',
    },
    messageContainerMe: {
      flexDirection: 'row-reverse',
    },
    messageAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    messageAvatarText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#fff',
    },
    messageBubble: {
      maxWidth: '75%',
      backgroundColor: colors.surfaceAlt,
      borderRadius: borderRadius.lg,
      borderBottomLeftRadius: 4,
      padding: spacing.md,
    },
    messageBubbleMe: {
      backgroundColor: colors.primary,
      borderBottomLeftRadius: borderRadius.lg,
      borderBottomRightRadius: 4,
    },
    messageSender: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
      marginBottom: 4,
    },
    messageContent: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    messageContentMe: {
      color: '#fff',
    },
    messageTime: {
      fontSize: 10,
      color: colors.textMuted,
      marginTop: 4,
      alignSelf: 'flex-end',
    },
    messageTimeMe: {
      color: 'rgba(255,255,255,0.7)',
    },
    inputArea: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: spacing.sm,
    },
    input: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 14,
      color: colors.textPrimary,
      maxHeight: 100,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: colors.surfaceAlt,
    },
    participantsList: {
      padding: spacing.md,
    },
    participantItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    participantAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    participantAvatarHost: {
      backgroundColor: colors.secondary,
    },
    participantAvatarText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#fff',
    },
    participantInfo: {
      flex: 1,
    },
    participantNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    participantName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    hostBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      backgroundColor: `${colors.secondary}20`,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
    },
    hostBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: colors.secondary,
    },
    participantStatus: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    onlineDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#10B981',
    },
    participantStatusText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl,
      gap: spacing.md,
    },
    emptyText: {
      fontSize: typography.body,
      color: colors.textMuted,
    },
    infoPanel: {
      padding: spacing.md,
    },
    infoSection: {
      marginBottom: spacing.lg,
    },
    infoLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    infoValue: {
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 20,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
    },
    statusBadgeActive: {
      backgroundColor: `${colors.success}20`,
    },
    statusText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    statusTextActive: {
      color: colors.success,
    },
  });

export default SessionRoomScreen;
