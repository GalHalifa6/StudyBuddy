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
  Animated,
  Dimensions,
  ScrollView,
  Modal,
  Share,
} from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { SessionsStackParamList } from '../../navigation/types';
import { sessionApi, JitsiAuthResponse } from '../../api/sessions';
import { expertsApi } from '../../api/experts';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { useSessionWebSocket, SessionMessage as WSMessage } from '../../hooks/useSessionWebSocket';
import { JitsiMeetEmbed } from '../../components/JitsiMeetEmbed';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CONFETTI_COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444'];

type Props = NativeStackScreenProps<SessionsStackParamList, 'SessionRoom'>;
type Styles = ReturnType<typeof createStyles>;

type ActivePanel = 'chat' | 'files' | 'board' | 'code' | 'notes';

interface ChatMessage {
  id: number;
  sender: string;
  senderId?: number;
  content: string;
  timestamp: Date;
  type: 'text' | 'file' | 'code' | 'system';
  fileName?: string;
  language?: string;
}

interface SessionFile {
  id: number;
  name: string;
  uploadedBy: string;
  uploadedAt: Date;
  size: string;
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
  const [jitsiAuth, setJitsiAuth] = useState<JitsiAuthResponse | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [onlineParticipants, setOnlineParticipants] = useState<Participant[]>([]);
  
  // Files state
  const [files, setFiles] = useState<SessionFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Code editor state
  const [code, setCode] = useState('// Collaborative code editor\n// Changes are shared in real-time\n\nfunction example() {\n  console.log("Hello, World!");\n}');
  const [codeLanguage, setCodeLanguage] = useState('JavaScript');
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Notes state
  const [sessionNotes, setSessionNotes] = useState('');
  const [notesSaved, setNotesSaved] = useState(true);
  
  // Whiteboard state
  const [drawingPaths, setDrawingPaths] = useState<Array<{ points: {x: number, y: number}[], color: string, width: number }>>([]);
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);
  const [brushColor, setBrushColor] = useState('#8B5CF6');
  const [brushSize, setBrushSize] = useState(3);
  const [drawTool, setDrawTool] = useState<'pen' | 'eraser'>('pen');
  
  // Session ended state
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSessionEndedScreen, setShowSessionEndedScreen] = useState(false);
  const [studentRating, setStudentRating] = useState(0);
  const [endSessionSummary, setEndSessionSummary] = useState('');
  const [showEndModal, setShowEndModal] = useState(false);
  
  // Confetti animation refs
  const confettiAnims = useRef<Animated.Value[]>(
    Array(30).fill(0).map(() => new Animated.Value(0))
  ).current;

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
      setSessionStatus('ended');
      setShowEndModal(false);
      // Trigger confetti animation
      setShowConfetti(true);
      startConfettiAnimation();
      // Show session ended screen after confetti
      setTimeout(() => {
        setShowConfetti(false);
        setShowSessionEndedScreen(true);
      }, 2500);
      refetch();
    },
    onError: error => {
      const apiError = mapApiError(error);
      showToast(apiError.message, 'error');
    },
  });
  
  // Confetti animation function
  const startConfettiAnimation = useCallback(() => {
    confettiAnims.forEach((anim, index) => {
      anim.setValue(0);
      Animated.timing(anim, {
        toValue: 1,
        duration: 2500 + Math.random() * 1000,
        delay: Math.random() * 300,
        useNativeDriver: true,
      }).start();
    });
  }, [confettiAnims]);

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

  // Fetch Jitsi auth (JWT + meeting URL) when session is active
  useEffect(() => {
    if (sessionStatus !== 'active') {
      setJitsiAuth(null);
      return;
    }

    let cancelled = false;
    sessionApi
      .jitsiAuth(sessionId)
      .then((data) => {
        if (!cancelled) {
          setJitsiAuth(data);
        }
      })
      .catch((error) => {
        console.warn('Failed to fetch Jitsi auth', error);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId, sessionStatus]);

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
    
    // Prefer server-provided Jitsi auth/link; fall back to stored link
    const meetingLink = jitsiAuth?.meetingUrl || session?.meetingLink || `https://8x8.vc/studybuddy/${session.id}`;
    
    return (
      <View style={styles.videoContainer}>
        <JitsiMeetEmbed
          key={`jitsi-${session.id}`} // Stable key based on session ID only
          roomName={meetingLink}
          jwtToken={jitsiAuth?.jwt}
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
  }, [sessionStatus, session?.id, session?.meetingLink, user?.fullName, user?.username, styles.videoContainer, styles.videoEmbed, jitsiAuth]);

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

  // Handle file upload using expo-document-picker
  const handleFileUpload = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      
      if (result.canceled || !result.assets?.[0]) return;
      
      const file = result.assets[0];
      setIsUploading(true);
      
      // Format file size
      const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      };
      
      // Add to local files list
      const newFile: SessionFile = {
        id: Date.now(),
        name: file.name,
        uploadedBy: user?.fullName || 'You',
        uploadedAt: new Date(),
        size: formatSize(file.size || 0),
      };
      setFiles(prev => [...prev, newFile]);
      
      // Send message notification about the file
      const fileMessage = `📎 Shared file: ${file.name}`;
      await sessionApi.sendMessage(sessionId, fileMessage, 'file', { fileName: file.name });
      
      // Add to chat
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: user?.fullName || 'You',
        senderId: user?.id,
        content: fileMessage,
        timestamp: new Date(),
        type: 'file',
        fileName: file.name,
      }]);
      
      showToast('File shared successfully', 'success');
    } catch (error) {
      console.error('File upload error:', error);
      showToast('Failed to share file', 'error');
    } finally {
      setIsUploading(false);
    }
  }, [sessionId, user, showToast]);

  // Handle file download (opens in browser/external app)
  const handleFileDownload = useCallback((file: SessionFile) => {
    // For now, show info since files are stored locally
    Alert.alert(
      'File Info',
      `${file.name}\nShared by: ${file.uploadedBy}\nSize: ${file.size}`,
      [{ text: 'OK' }]
    );
  }, []);

  // Handle sharing code to chat
  const handleShareCode = useCallback(async () => {
    if (!code.trim()) return;
    
    try {
      // Send code as a message
      await sessionApi.sendMessage(sessionId, code, 'code', { language: codeLanguage });
      
      // Add to chat
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: user?.fullName || 'You',
        senderId: user?.id,
        content: code,
        timestamp: new Date(),
        type: 'code',
        language: codeLanguage,
      }]);
      
      showToast('Code shared to chat', 'success');
      setActivePanel('chat');
    } catch (error) {
      showToast('Failed to share code', 'error');
    }
  }, [code, codeLanguage, sessionId, user, showToast]);

  // Handle copying code to clipboard
  const handleCopyCode = useCallback(async () => {
    try {
      await ExpoClipboard.setStringAsync(code);
      setCopiedCode(true);
      showToast('Code copied to clipboard', 'success');
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      showToast('Failed to copy code', 'error');
    }
  }, [code, showToast]);

  // Load notes from storage on mount
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const savedNotes = await SecureStore.getItemAsync(`session_notes_${sessionId}`);
        if (savedNotes) {
          setSessionNotes(savedNotes);
        }
      } catch (error) {
        console.error('Failed to load notes:', error);
      }
    };
    loadNotes();
  }, [sessionId]);

  // Auto-save notes with debounce
  useEffect(() => {
    const saveNotes = async () => {
      if (!sessionNotes) return;
      try {
        setNotesSaved(false);
        await SecureStore.setItemAsync(`session_notes_${sessionId}`, sessionNotes);
        setNotesSaved(true);
      } catch (error) {
        console.error('Failed to save notes:', error);
      }
    };
    
    const timeoutId = setTimeout(saveNotes, 1000); // Save after 1 second of no typing
    return () => clearTimeout(timeoutId);
  }, [sessionNotes, sessionId]);

  // Whiteboard drawing handlers
  const handleDrawStart = useCallback((x: number, y: number) => {
    setCurrentPath([{ x, y }]);
  }, []);

  const handleDrawMove = useCallback((x: number, y: number) => {
    if (currentPath.length > 0) {
      setCurrentPath(prev => [...prev, { x, y }]);
    }
  }, [currentPath.length]);

  const handleDrawEnd = useCallback(() => {
    if (currentPath.length > 0) {
      const newPath = {
        points: currentPath,
        color: drawTool === 'eraser' ? '#1F2937' : brushColor,
        width: drawTool === 'eraser' ? brushSize * 3 : brushSize,
      };
      setDrawingPaths(prev => [...prev, newPath]);
      setCurrentPath([]);
    }
  }, [currentPath, drawTool, brushColor, brushSize]);

  const handleClearBoard = useCallback(() => {
    Alert.alert(
      'Clear Whiteboard',
      'Are you sure you want to clear the whiteboard?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => setDrawingPaths([]) },
      ]
    );
  }, []);

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

  // Handle end session - show modal instead of alert
  const handleEndSession = () => {
    setShowEndModal(true);
  };
  
  // Confirm end session from modal
  const confirmEndSession = () => {
    endMutation.mutate();
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
    const isCode = item.type === 'code';
    const isFile = item.type === 'file';

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
        </View>
      );
    }

    // Code message
    if (isCode) {
      return (
        <View style={[styles.messageContainer, isMe && styles.messageContainerMe]}>
          {!isMe && (
            <View style={styles.messageAvatar}>
              <Text style={styles.messageAvatarText}>{item.sender.charAt(0)}</Text>
            </View>
          )}
          <View style={[styles.messageBubble, styles.codeMessageBubble, isMe && styles.messageBubbleMe]}>
            {!isMe && <Text style={styles.messageSender}>{item.sender}</Text>}
            <View style={styles.codeMessageHeader}>
              <Ionicons name="code-slash" size={14} color={colors.primary} />
              <Text style={styles.codeMessageLanguage}>{item.language || 'Code'}</Text>
            </View>
            <ScrollView horizontal style={styles.codePreviewContainer}>
              <Text style={styles.codePreviewText}>{item.content}</Text>
            </ScrollView>
            <Pressable 
              style={styles.copyCodeInChat}
              onPress={() => {
                ExpoClipboard.setStringAsync(item.content);
                showToast('Code copied!', 'success');
              }}
            >
              <Ionicons name="copy-outline" size={14} color={colors.textMuted} />
              <Text style={styles.copyCodeInChatText}>Copy</Text>
            </Pressable>
            <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
              {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      );
    }

    // File message
    if (isFile) {
      return (
        <View style={[styles.messageContainer, isMe && styles.messageContainerMe]}>
          {!isMe && (
            <View style={styles.messageAvatar}>
              <Text style={styles.messageAvatarText}>{item.sender.charAt(0)}</Text>
            </View>
          )}
          <View style={[styles.messageBubble, styles.fileMessageBubble, isMe && styles.messageBubbleMe]}>
            {!isMe && <Text style={styles.messageSender}>{item.sender}</Text>}
            <View style={styles.fileMessageContent}>
              <Ionicons name="document-attach" size={24} color={colors.primary} />
              <View style={styles.fileMessageInfo}>
                <Text style={styles.fileMessageName} numberOfLines={1}>
                  {item.fileName || 'File'}
                </Text>
                <Text style={styles.fileMessageAction}>Tap to view</Text>
              </View>
            </View>
            <Text style={[styles.messageTime, isMe && styles.messageTimeMe]}>
              {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      );
    }

    // Regular text message
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
  }, [user?.id, styles, colors, showToast]);

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

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Confetti Component
  const renderConfetti = () => {
    if (!showConfetti) return null;
    
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {confettiAnims.map((anim, index) => {
          const startX = Math.random() * SCREEN_WIDTH;
          const randomColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
          const size = Math.random() * 10 + 6;
          const rotation = anim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', `${720 + Math.random() * 360}deg`],
          });
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [-50, SCREEN_HEIGHT + 50],
          });
          const translateX = anim.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, (Math.random() - 0.5) * 100, (Math.random() - 0.5) * 150],
          });
          const opacity = anim.interpolate({
            inputRange: [0, 0.8, 1],
            outputRange: [1, 1, 0],
          });

          return (
            <Animated.View
              key={index}
              style={{
                position: 'absolute',
                left: startX,
                top: 0,
                width: size,
                height: size,
                backgroundColor: randomColor,
                borderRadius: Math.random() > 0.5 ? size / 2 : 0,
                transform: [{ translateY }, { translateX }, { rotate: rotation }],
                opacity,
              }}
            />
          );
        })}
      </View>
    );
  };

  // Session Ended Screen
  if (showSessionEndedScreen) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.heroGradientStart, colors.heroGradientMid, colors.heroGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sessionEndedContainer}
        >
          <View style={styles.sessionEndedContent}>
            {/* Success Icon */}
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.successIconContainer}
            >
              <Ionicons name="checkmark" size={48} color="#fff" />
            </LinearGradient>
            
            <Text style={styles.sessionEndedTitle}>Session Complete! 🎉</Text>
            <Text style={styles.sessionEndedSubtitle}>
              Great session with {session?.expert?.fullName || 'the expert'}
            </Text>
            
            {/* Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={24} color={colors.primary} />
                <Text style={styles.statValue}>{formatTime(elapsedSeconds)}</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="chatbubble-outline" size={24} color="#3B82F6" />
                <Text style={styles.statValue}>{messages.filter(m => m.type === 'text').length}</Text>
                <Text style={styles.statLabel}>Messages</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="people-outline" size={24} color="#10B981" />
                <Text style={styles.statValue}>{participants.length + 1}</Text>
                <Text style={styles.statLabel}>Participants</Text>
              </View>
            </View>
            
            {/* Rating (for students) */}
            {!isSessionHost && (
              <View style={styles.ratingSection}>
                <Text style={styles.ratingTitle}>Rate your experience</Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => setStudentRating(star)}
                      style={styles.starButton}
                    >
                      <Ionicons
                        name={star <= studentRating ? 'star' : 'star-outline'}
                        size={36}
                        color={star <= studentRating ? '#F59E0B' : colors.textMuted}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
            
            {/* Buttons */}
            <View style={styles.endedButtonsRow}>
              <Pressable
                style={styles.endedButtonSecondary}
                onPress={() => navigation.navigate('SessionsList')}
              >
                <Text style={styles.endedButtonSecondaryText}>Browse Sessions</Text>
              </Pressable>
              <Pressable
                style={styles.endedButtonPrimary}
                onPress={() => navigation.getParent()?.goBack()}
              >
                <LinearGradient
                  colors={[colors.primary, '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.endedButtonGradient}
                >
                  <Text style={styles.endedButtonPrimaryText}>
                    {isSessionHost ? 'Dashboard' : 'Home'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Confetti Animation */}
      {renderConfetti()}
      
      {/* End Session Modal */}
      <Modal
        visible={showEndModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEndModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Ionicons name="stop-circle" size={28} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.modalTitle}>End Session?</Text>
                <Text style={styles.modalSubtitle}>All participants will be notified</Text>
              </View>
            </View>
            
            <TextInput
              style={styles.modalTextArea}
              value={endSessionSummary}
              onChangeText={setEndSessionSummary}
              placeholder="Session summary (optional)..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButtonCancel}
                onPress={() => setShowEndModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalButtonEnd}
                onPress={confirmEndSession}
                disabled={endMutation.isPending}
              >
                <LinearGradient
                  colors={['#EF4444', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.modalButtonGradient}
                >
                  {endMutation.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="gift" size={18} color="#fff" />
                      <Text style={styles.modalButtonEndText}>End Session</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      
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

      {/* Tab Selector - Like web: Chat, Files, Board, Code, Notes */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tab, activePanel === 'chat' && styles.tabActive]}
          onPress={() => setActivePanel('chat')}
        >
          <Ionicons
            name="chatbubbles"
            size={18}
            color={activePanel === 'chat' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activePanel === 'chat' && styles.tabTextActive]}>Chat</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activePanel === 'files' && styles.tabActive]}
          onPress={() => setActivePanel('files')}
        >
          <Ionicons
            name="document-text"
            size={18}
            color={activePanel === 'files' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activePanel === 'files' && styles.tabTextActive]}>Files</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activePanel === 'board' && styles.tabActive]}
          onPress={() => setActivePanel('board')}
        >
          <Ionicons
            name="pencil"
            size={18}
            color={activePanel === 'board' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activePanel === 'board' && styles.tabTextActive]}>Board</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activePanel === 'code' && styles.tabActive]}
          onPress={() => setActivePanel('code')}
        >
          <Ionicons
            name="code-slash"
            size={18}
            color={activePanel === 'code' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activePanel === 'code' && styles.tabTextActive]}>Code</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activePanel === 'notes' && styles.tabActive]}
          onPress={() => setActivePanel('notes')}
        >
          <Ionicons
            name="document"
            size={18}
            color={activePanel === 'notes' ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.tabText, activePanel === 'notes' && styles.tabTextActive]}>Notes</Text>
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
        {/* Chat Panel */}
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

        {/* Files Panel */}
        {activePanel === 'files' && (
          <View style={styles.filesPanel}>
            <View style={styles.filesPanelHeader}>
              <Text style={styles.filesPanelTitle}>Session Files</Text>
              <Pressable 
                style={[styles.uploadButton, isUploading && styles.uploadButtonDisabled]}
                onPress={handleFileUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color={colors.primary} />
                    <Text style={styles.uploadButtonText}>Upload</Text>
                  </>
                )}
              </Pressable>
            </View>
            {files.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
                <Text style={styles.emptyText}>No files shared yet</Text>
                <Text style={styles.emptySubtext}>Tap Upload to share files with participants</Text>
              </View>
            ) : (
              <FlatList
                data={files}
                keyExtractor={item => String(item.id)}
                renderItem={({ item }) => (
                  <Pressable 
                    style={styles.fileItem}
                    onPress={() => handleFileDownload(item)}
                  >
                    <View style={styles.fileIcon}>
                      <Ionicons name="document" size={24} color={colors.primary} />
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.fileMeta}>{item.uploadedBy} • {item.size}</Text>
                    </View>
                    <Pressable style={styles.fileDownload} onPress={() => handleFileDownload(item)}>
                      <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                    </Pressable>
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              />
            )}
          </View>
        )}

        {/* Board (Whiteboard) Panel */}
        {activePanel === 'board' && (
          <View style={styles.boardPanel}>
            <View style={styles.boardToolbar}>
              <Pressable 
                style={[styles.boardTool, drawTool === 'pen' && styles.boardToolActive]}
                onPress={() => setDrawTool('pen')}
              >
                <Ionicons name="pencil" size={20} color={drawTool === 'pen' ? '#fff' : colors.textMuted} />
              </Pressable>
              <Pressable 
                style={[styles.boardTool, drawTool === 'eraser' && styles.boardToolActive]}
                onPress={() => setDrawTool('eraser')}
              >
                <Ionicons name="color-wand" size={20} color={drawTool === 'eraser' ? '#fff' : colors.textMuted} />
              </Pressable>
              <View style={styles.colorPicker}>
                {['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#ffffff'].map(color => (
                  <Pressable
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      brushColor === color && styles.colorOptionActive,
                    ]}
                    onPress={() => setBrushColor(color)}
                  />
                ))}
              </View>
              <View style={styles.boardToolSeparator} />
              <Pressable style={styles.boardTool} onPress={handleClearBoard}>
                <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <View 
              style={styles.boardCanvas}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const { locationX, locationY } = e.nativeEvent;
                handleDrawStart(locationX, locationY);
              }}
              onResponderMove={(e) => {
                const { locationX, locationY } = e.nativeEvent;
                handleDrawMove(locationX, locationY);
              }}
              onResponderRelease={handleDrawEnd}
            >
              {/* SVG-like canvas using View and absolute positioning */}
              {drawingPaths.map((path, pathIndex) => (
                path.points.map((point, pointIndex) => {
                  if (pointIndex === 0) return null;
                  const prevPoint = path.points[pointIndex - 1];
                  return (
                    <View
                      key={`${pathIndex}-${pointIndex}`}
                      style={{
                        position: 'absolute',
                        left: Math.min(prevPoint.x, point.x) - path.width / 2,
                        top: Math.min(prevPoint.y, point.y) - path.width / 2,
                        width: Math.abs(point.x - prevPoint.x) + path.width,
                        height: Math.abs(point.y - prevPoint.y) + path.width,
                        backgroundColor: path.color,
                        borderRadius: path.width / 2,
                      }}
                    />
                  );
                })
              ))}
              {/* Current path being drawn */}
              {currentPath.map((point, pointIndex) => {
                if (pointIndex === 0) return null;
                const prevPoint = currentPath[pointIndex - 1];
                const currentColor = drawTool === 'eraser' ? '#1F2937' : brushColor;
                const currentWidth = drawTool === 'eraser' ? brushSize * 3 : brushSize;
                return (
                  <View
                    key={`current-${pointIndex}`}
                    style={{
                      position: 'absolute',
                      left: Math.min(prevPoint.x, point.x) - currentWidth / 2,
                      top: Math.min(prevPoint.y, point.y) - currentWidth / 2,
                      width: Math.abs(point.x - prevPoint.x) + currentWidth,
                      height: Math.abs(point.y - prevPoint.y) + currentWidth,
                      backgroundColor: currentColor,
                      borderRadius: currentWidth / 2,
                    }}
                  />
                );
              })}
              {drawingPaths.length === 0 && currentPath.length === 0 && (
                <View style={styles.boardPlaceholder}>
                  <Ionicons name="brush-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.boardPlaceholderText}>Draw with your finger</Text>
                  <Text style={styles.boardPlaceholderSubtext}>Select a color and start drawing</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Code Panel */}
        {activePanel === 'code' && (
          <View style={styles.codePanel}>
            <View style={styles.codeHeader}>
              <Pressable 
                style={styles.languageSelector}
                onPress={() => {
                  Alert.alert(
                    'Select Language',
                    '',
                    ['JavaScript', 'Python', 'Java', 'TypeScript', 'C++', 'HTML/CSS'].map(lang => ({
                      text: lang,
                      onPress: () => setCodeLanguage(lang),
                    })).concat([{ text: 'Cancel', style: 'cancel' }])
                  );
                }}
              >
                <Text style={styles.languageText}>{codeLanguage}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
              </Pressable>
              <View style={styles.codeActions}>
                <Pressable style={styles.copyCodeButton} onPress={handleCopyCode}>
                  <Ionicons name={copiedCode ? "checkmark" : "copy-outline"} size={16} color={colors.primary} />
                </Pressable>
                <Pressable style={styles.shareCodeButton} onPress={handleShareCode}>
                  <Ionicons name="paper-plane" size={16} color="#fff" />
                  <Text style={styles.shareCodeText}>Share</Text>
                </Pressable>
              </View>
            </View>
            <View style={styles.codeEditor}>
              <TextInput
                style={styles.codeInput}
                value={code}
                onChangeText={setCode}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="// Write your code here..."
                placeholderTextColor={colors.textMuted}
                textAlignVertical="top"
              />
            </View>
            <View style={styles.codeFooter}>
              <Ionicons name="information-circle" size={14} color={colors.textMuted} />
              <Text style={styles.codeFooterText}>Tap Share to send code to chat</Text>
            </View>
          </View>
        )}

        {/* Notes Panel */}
        {activePanel === 'notes' && (
          <View style={styles.notesPanel}>
            <View style={styles.notesHeader}>
              <Text style={styles.notesTitle}>Session Notes</Text>
              <View style={styles.autoSaveBadge}>
                {notesSaved ? (
                  <>
                    <Ionicons name="cloud-done" size={14} color={colors.success} />
                    <Text style={[styles.autoSaveText, { color: colors.success }]}>Saved</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={14} color={colors.warning} />
                    <Text style={[styles.autoSaveText, { color: colors.warning }]}>Saving...</Text>
                  </>
                )}
              </View>
            </View>
            <TextInput
              style={styles.notesInput}
              value={sessionNotes}
              onChangeText={setSessionNotes}
              multiline
              placeholder="Take notes during your session...

• Key points discussed
• Action items  
• Questions to follow up

Your notes are saved automatically."
              placeholderTextColor={colors.textMuted}
              textAlignVertical="top"
            />
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
    // Code message styles
    codeMessageBubble: {
      maxWidth: '90%',
      backgroundColor: '#1a1a2e',
    },
    codeMessageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    codeMessageLanguage: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    codePreviewContainer: {
      backgroundColor: '#0d0d1a',
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      maxHeight: 200,
    },
    codePreviewText: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 12,
      color: '#10B981',
      lineHeight: 18,
    },
    copyCodeInChat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-end',
      marginTop: spacing.sm,
    },
    copyCodeInChatText: {
      fontSize: 11,
      color: colors.textMuted,
    },
    // File message styles
    fileMessageBubble: {
      backgroundColor: colors.surfaceAlt,
    },
    fileMessageContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
    },
    fileMessageInfo: {
      flex: 1,
    },
    fileMessageName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    fileMessageAction: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
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
    // Files Panel Styles
    filesPanel: {
      flex: 1,
      padding: spacing.md,
    },
    filesPanelHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    filesPanelTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    uploadButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    uploadButtonDisabled: {
      opacity: 0.6,
    },
    uploadButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.primary,
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
    fileItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    fileIcon: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    fileInfo: {
      flex: 1,
    },
    fileName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    fileMeta: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    fileDownload: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Board Panel Styles
    boardPanel: {
      flex: 1,
    },
    boardToolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    boardTool: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    boardToolActive: {
      backgroundColor: colors.primary,
    },
    boardToolSeparator: {
      width: 1,
      height: 24,
      backgroundColor: colors.border,
      marginHorizontal: spacing.sm,
    },
    colorPicker: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginLeft: spacing.sm,
    },
    colorOption: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorOptionActive: {
      borderColor: '#fff',
    },
    boardCanvas: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      margin: spacing.md,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    boardPlaceholder: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.sm,
    },
    boardPlaceholderText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    boardPlaceholderSubtext: {
      fontSize: 13,
      color: colors.textMuted,
    },
    // Code Panel Styles
    codePanel: {
      flex: 1,
    },
    codeHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    languageSelector: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    languageText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    codeActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    copyCodeButton: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.md,
      backgroundColor: colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
    },
    shareCodeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    shareCodeText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#fff',
    },
    codeEditor: {
      flex: 1,
      backgroundColor: '#1a1a2e',
      margin: spacing.md,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    codeInput: {
      flex: 1,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 13,
      color: '#10B981',
      padding: spacing.md,
      lineHeight: 20,
    },
    codeFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    codeFooterText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    // Notes Panel Styles
    notesPanel: {
      flex: 1,
      padding: spacing.md,
    },
    notesHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    notesTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    autoSaveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: `${colors.success}20`,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
    },
    autoSaveText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.success,
    },
    notesInput: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      fontSize: 14,
      color: colors.textPrimary,
      lineHeight: 22,
      borderWidth: 1,
      borderColor: colors.border,
    },
    // Session Ended Styles
    sessionEndedContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    sessionEndedContent: {
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
    },
    successIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    sessionEndedTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    sessionEndedSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: spacing.xl,
      textAlign: 'center',
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: spacing.xl,
      gap: spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
      marginVertical: spacing.xs,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    ratingSection: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    ratingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    starsContainer: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    starButton: {
      padding: spacing.xs,
    },
    endedButtonsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      width: '100%',
    },
    endedButtonSecondary: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      paddingVertical: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    endedButtonSecondaryText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    endedButtonPrimary: {
      flex: 1,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
    },
    endedButtonGradient: {
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    endedButtonPrimaryText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    modalContent: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    modalIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    modalSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    modalTextArea: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      fontSize: 14,
      color: colors.textPrimary,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: spacing.lg,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    modalButtonCancel: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    modalButtonCancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    modalButtonEnd: {
      flex: 1,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    modalButtonGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.md,
    },
    modalButtonEndText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
  });

export default SessionRoomScreen;
