import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/ui/Screen';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { MainTabParamList } from '../../navigation/types';
import { directMessageApi, Conversation, DirectMessage, SendDirectMessageRequest } from '../../api/directMessages';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';

type Route = RouteProp<MainTabParamList, 'Messages'>;
type Navigation = NativeStackNavigationProp<MainTabParamList>;
type Styles = ReturnType<typeof createStyles>;

interface DirectMessagesScreenProps {
  selectedConversationId?: number | null;
  onBack?: () => void;
  embedded?: boolean; // When true, don't render header and use View instead of Screen
}

const DirectMessagesScreen: React.FC<DirectMessagesScreenProps> = ({ selectedConversationId: initialSelectedId, embedded = false }) => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<FlatList>(null);

  const {
    data: conversations = [],
    isLoading: loadingConversations,
    isRefetching: refetchingConversations,
    refetch: refetchConversations,
    isError: conversationsError,
  } = useQuery({
    queryKey: ['directMessages', 'conversations'],
    queryFn: directMessageApi.getConversations,
    retry: 2,
    staleTime: 30000, // 30 seconds
  });

  const {
    data: messages = [],
    isLoading: loadingMessages,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ['directMessages', 'messages', selectedConversation?.id],
    queryFn: () => directMessageApi.getMessages(selectedConversation!.id),
    enabled: !!selectedConversation,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (payload: SendDirectMessageRequest) =>
      directMessageApi.sendMessage(selectedConversation!.id, payload),
    onSuccess: () => {
      setNewMessage('');
      queryClient.invalidateQueries({ queryKey: ['directMessages', 'messages', selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['directMessages', 'conversations'] });
      refetchMessages();
    },
    onError: (error) => {
      showToast(mapApiError(error).message, 'error');
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: directMessageApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directMessages', 'conversations'] });
    },
  });

  useEffect(() => {
    if (initialSelectedId && conversations.length > 0) {
      const conv = conversations.find((c) => c.id === initialSelectedId);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }, [initialSelectedId, conversations]);

  useEffect(() => {
    if (selectedConversation) {
      markAsReadMutation.mutate(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    setNewMessage('');
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!selectedConversation || !newMessage.trim() || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate({
      content: newMessage.trim(),
      messageType: 'text',
    });
  }, [selectedConversation, newMessage, sendMessageMutation]);

  const formatTime = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }, []);

  const Container = embedded ? View : Screen;
  const containerProps = embedded ? { style: { flex: 1 } } : { scrollable: false };

  // Show conversation list if no conversation is selected
  if (!selectedConversation) {
    if (loadingConversations && !conversationsError) {
      return (
        <Container {...containerProps}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading conversations...</Text>
          </View>
        </Container>
      );
    }

    // Show error state if conversations failed to load
    if (conversationsError) {
      return (
        <Container {...containerProps}>
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="alert-circle-outline" size={48} color={colors.error || colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Failed to load conversations</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Check your connection and try again
            </Text>
            <Pressable 
              onPress={() => refetchConversations()} 
              style={{ marginTop: spacing.md, padding: spacing.sm }}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Retry</Text>
            </Pressable>
          </View>
        </Container>
      );
    }

    return (
      <Container {...containerProps}>
        {!embedded && (
          /* Header */
          <LinearGradient
            colors={[colors.heroGradientStart, colors.heroGradientMid, colors.heroGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <View style={styles.headerRow}>
              <View>
                <View style={styles.heroBadge}>
                  <Ionicons name="chatbubbles" size={14} color={colors.primary} />
                  <Text style={[styles.heroBadgeText, { color: colors.primary }]}>DIRECT MESSAGES</Text>
                </View>
                <Text style={[styles.heading, { color: colors.textPrimary }]}>Direct Messages</Text>
              </View>
            </View>
            <Text style={[styles.subheading, { color: colors.textSecondary }]}>Chat directly with other users</Text>
          </LinearGradient>
        )}

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No conversations yet</Text>
            <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
              Start a conversation by messaging another user
            </Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item: conversation }) => {
              const hasUnread = conversation.unreadCount > 0;
              const initials = (conversation.otherUser.fullName || conversation.otherUser.username)
                .charAt(0)
                .toUpperCase();

              return (
                <Pressable
                  style={[
                    styles.conversationCard,
                    {
                      backgroundColor: hasUnread ? colors.primaryLight : colors.surface,
                      borderColor: hasUnread ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSelectConversation(conversation)}
                >
                  <View style={styles.avatarContainer}>
                    <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials}</Text>
                    </LinearGradient>
                    {hasUnread && (
                      <View style={[styles.unreadBadge, { backgroundColor: colors.success }]}>
                        <Text style={styles.unreadBadgeText}>
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.conversationInfo}>
                    <View style={styles.conversationHeader}>
                      <Text
                        style={[
                          styles.conversationName,
                          { color: hasUnread ? colors.textPrimary : colors.textSecondary, fontWeight: hasUnread ? '700' : '600' },
                        ]}
                        numberOfLines={1}
                      >
                        {conversation.otherUser.fullName || conversation.otherUser.username}
                      </Text>
                      {conversation.lastMessageAt && (
                        <Text style={[styles.conversationTime, { color: hasUnread ? colors.primary : colors.textMuted }]}>
                          {formatTime(conversation.lastMessageAt)}
                        </Text>
                      )}
                    </View>
                    {conversation.lastMessagePreview && (
                      <Text
                        style={[
                          styles.lastMessagePreview,
                          {
                            color: hasUnread ? colors.textSecondary : colors.textMuted,
                            fontWeight: hasUnread ? '500' : '400',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {conversation.lastMessagePreview}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              );
            }}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <RefreshControl
                refreshing={refetchingConversations}
                onRefresh={refetchConversations}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </Container>
    );
  }

  // Show chat view
  const otherUser = selectedConversation.otherUser;
  const initials = (otherUser.fullName || otherUser.username).charAt(0).toUpperCase();

  return (
    <Container {...containerProps}>
      <KeyboardAvoidingView style={styles.chatContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Chat Header */}
        <View style={[styles.chatHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => setSelectedConversation(null)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.headerAvatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: colors.textPrimary }]} numberOfLines={1}>
              {otherUser.fullName || otherUser.username}
            </Text>
            <Text style={[styles.headerSubtext, { color: colors.textMuted }]}>Direct message</Text>
          </View>
        </View>

        {/* Messages */}
        {loadingMessages && messages.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            ref={messagesEndRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item: message }) => {
              const isOwn = message.sender.id === user?.id;
              return (
                <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : styles.messageRowOther]}>
                  {!isOwn && (
                    <Text style={[styles.messageSender, { color: colors.textMuted }]}>
                      {message.sender.fullName || message.sender.username}
                    </Text>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      {
                        backgroundColor: isOwn ? colors.primary : colors.surfaceAlt,
                        alignSelf: isOwn ? 'flex-end' : 'flex-start',
                      },
                    ]}
                  >
                    <Text style={[styles.messageText, { color: isOwn ? colors.textOnPrimary : colors.textPrimary }]}>
                      {message.content}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        { color: isOwn ? colors.textOnPrimary + 'CC' : colors.textMuted },
                      ]}
                    >
                      {formatTime(message.createdAt)}
                    </Text>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.messagesContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceAlt }]}>
                  <Ionicons name="chatbubbles-outline" size={48} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No messages yet</Text>
                <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>Start the conversation!</Text>
              </View>
            }
          />
        )}

        {/* Message Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            style={[
              styles.input,
              {
                backgroundColor: colors.surfaceAlt,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            multiline
            maxLength={1000}
          />
          <Pressable
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            style={[
              styles.sendButton,
              {
                backgroundColor: colors.primary,
                opacity: !newMessage.trim() || sendMessageMutation.isPending ? 0.5 : 1,
              },
            ]}
          >
            {sendMessageMutation.isPending ? (
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
            ) : (
              <Ionicons name="send" size={20} color={colors.textOnPrimary} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Container>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
    },
    loadingText: {
      fontSize: 14,
    },
    header: {
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    heroBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
    },
    heading: {
      fontSize: 26,
      fontWeight: '700',
      marginTop: spacing.xs,
    },
    subheading: {
      fontSize: 15,
      lineHeight: 22,
    },
    listContent: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    separator: {
      height: spacing.sm,
    },
    conversationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      borderWidth: 1,
    },
    avatarContainer: {
      position: 'relative',
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 20,
      fontWeight: '700',
      color: '#FFF',
    },
    unreadBadge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 4,
    },
    unreadBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFF',
    },
    conversationInfo: {
      flex: 1,
      gap: 4,
    },
    conversationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    conversationName: {
      fontSize: 16,
      flex: 1,
    },
    conversationTime: {
      fontSize: 12,
      marginLeft: spacing.sm,
    },
    lastMessagePreview: {
      fontSize: 14,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    emptyIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
    emptyMessage: {
      fontSize: 15,
      textAlign: 'center',
      lineHeight: 22,
    },
    chatContainer: {
      flex: 1,
    },
    chatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderBottomWidth: 1,
    },
    backButton: {
      padding: spacing.xs,
    },
    headerInfo: {
      flex: 1,
    },
    headerName: {
      fontSize: 18,
      fontWeight: '700',
    },
    headerSubtext: {
      fontSize: 12,
    },
    messagesContent: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    messageRow: {
      marginBottom: spacing.sm,
    },
    messageRowOwn: {
      alignItems: 'flex-end',
    },
    messageRowOther: {
      alignItems: 'flex-start',
    },
    messageSender: {
      fontSize: 12,
      marginBottom: spacing.xs / 2,
      marginLeft: spacing.xs,
    },
    messageBubble: {
      maxWidth: '75%',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      gap: spacing.xs,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
    },
    messageTime: {
      fontSize: 11,
      alignSelf: 'flex-end',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      padding: spacing.md,
      borderTopWidth: 1,
    },
    input: {
      flex: 1,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      maxHeight: 100,
      fontSize: 15,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default DirectMessagesScreen;

