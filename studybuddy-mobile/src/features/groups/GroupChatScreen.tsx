import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/ui/Screen';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { GroupsStackParamList } from '../../navigation/types';
import { messagesApi } from '../../api/messages';
import { Message } from '../../api/types';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import { filesApi } from '../../api/files';

type Props = NativeStackScreenProps<GroupsStackParamList, 'GroupChat'>;

type Styles = ReturnType<typeof createStyles>;

const GroupChatScreen: React.FC<Props> = ({ navigation, route }) => {
  const { groupId, groupName } = route.params;
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [composer, setComposer] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pinningMessageId, setPinningMessageId] = useState<number | null>(null);
  const flatListRef = useRef<FlatList<Message> | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: groupName ?? 'Group chat',
      headerLeft: () => (
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ marginRight: spacing.md, padding: spacing.xs }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => navigation.navigate('GroupDetails', { groupId })}
          style={{ marginLeft: spacing.md, padding: spacing.xs }}
          accessibilityRole="button"
          accessibilityLabel="Group details"
        >
          <Ionicons name="information-circle-outline" size={24} color={colors.textPrimary} />
        </Pressable>
      ),
    });
  }, [groupName, navigation, groupId, colors.textPrimary]);

  const {
    data: messages = [],
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery({
    queryKey: ['groups', 'messages', groupId],
    queryFn: () => messagesApi.getGroupMessages(groupId),
    refetchInterval: 10000,
  });

  const { data: pinnedMessages = [] } = useQuery({
    queryKey: ['groups', 'messages', 'pinned', groupId],
    queryFn: () => messagesApi.getPinnedMessages(groupId),
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
      messagesApi.markGroupAsRead(groupId).catch(() => null);
    }, [groupId, refetch])
  );

  useEffect(() => {
    if (messages.length) {
      messagesApi.markGroupAsRead(groupId).catch(() => null);
      requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
    }
  }, [groupId, messages.length]);

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => messagesApi.sendMessage(groupId, { content, messageType: 'text' }),
    onSuccess: message => {
      queryClient.setQueryData<Message[]>(['groups', 'messages', groupId], previous =>
        previous ? [...previous, message] : [message]
      );
      setComposer('');
      requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
      messagesApi.markGroupAsRead(groupId).catch(() => null);
    },
    onError: err => showToast(mapApiError(err).message, 'error'),
  });

  const togglePinMutation = useMutation({
    mutationFn: (messageId: number) => messagesApi.togglePin(messageId),
    onMutate: messageId => setPinningMessageId(messageId),
    onSuccess: updated => {
      queryClient.setQueryData<Message[]>(['groups', 'messages', groupId], previous =>
        previous ? previous.map(message => (message.id === updated.id ? updated : message)) : previous
      );
      queryClient.invalidateQueries({ queryKey: ['groups', 'messages', 'pinned', groupId] });
      showToast(updated.isPinned ? 'Message pinned' : 'Pin removed', 'info');
    },
    onError: err => showToast(mapApiError(err).message, 'error'),
    onSettled: () => setPinningMessageId(null),
  });

  const uploadFileMutation = useMutation({
    mutationFn: async (asset: DocumentPicker.DocumentPickerAsset) => {
      const uploaded = await filesApi.uploadToGroup(groupId, asset);
      const message = await messagesApi.sendMessage(groupId, {
        content: uploaded.originalFilename ?? 'Shared a file',
        messageType: 'file',
        fileId: uploaded.id,
      });
      return { message, uploaded };
    },
    onSuccess: ({ message }) => {
      queryClient.setQueryData<Message[]>(['groups', 'messages', groupId], previous =>
        previous ? [...previous, message] : [message]
      );
      requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
      queryClient.invalidateQueries({ queryKey: ['groups', 'files', groupId] });
      messagesApi.markGroupAsRead(groupId).catch(() => null);
    },
    onError: err => showToast(mapApiError(err).message, 'error'),
  });

  const handleSend = () => {
    const trimmed = composer.trim();
    if (!trimmed || sendMessageMutation.isPending) {
      return;
    }
    sendMessageMutation.mutate(trimmed);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) {
        return;
      }
      uploadFileMutation.mutate(result.assets[0]);
    } catch (err) {
      showToast('Could not open files. Please try again.', 'error');
    }
  };

  const handleTogglePin = (messageId: number) => {
    if (pinningMessageId === messageId || togglePinMutation.isPending) {
      return;
    }
    togglePinMutation.mutate(messageId);
  };

  const handleNavigateToPinned = (messageId: number) => {
    const index = messages.findIndex(message => message.id === messageId);
    if (index === -1) {
      showToast('Pinned message is not loaded yet.', 'info');
      return;
    }

    try {
      flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
    } catch (error) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      }, 250);
    }

    setHighlightedMessageId(messageId);
    if (highlightTimer.current) {
      clearTimeout(highlightTimer.current);
    }
    highlightTimer.current = setTimeout(() => setHighlightedMessageId(null), 3000);
  };

  const handleAttachmentPress = (fileId: number) => {
    const url = filesApi.getDownloadUrl(fileId);
    Linking.openURL(url).catch(() => showToast('Unable to open file link.', 'error'));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (item.messageType === 'system') {
      return (
        <View style={styles.systemMessage}>
          <Text style={styles.systemMessageText}>{item.content}</Text>
          <Text style={styles.systemMessageMeta}>{formatDateTime(item.createdAt)}</Text>
        </View>
      );
    }

    const isOwn = item.sender.id === user?.id;
    const isHighlighted = highlightedMessageId === item.id;
    const isPinning = pinningMessageId === item.id && togglePinMutation.isPending;

    return (
      <View style={[styles.messageRow, isOwn ? styles.messageRowOwn : null]}>
        <View
          style={[styles.messageBubble, isOwn ? styles.messageBubbleOwn : null, isHighlighted ? styles.highlightedMessage : null]}
        >
          <View style={styles.messageHeader}>
            <Text style={[styles.senderName, isOwn ? styles.messageTextOnPrimary : null]} numberOfLines={1}>
              {item.sender.fullName ?? item.sender.username}
            </Text>
            <View style={styles.headerMeta}>
              {item.isPinned ? <Ionicons name="pin" size={14} color={isOwn ? colors.surface : colors.accent} /> : null}
              <Text style={[styles.timestamp, isOwn ? styles.timestampOnPrimary : null]}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>
          {item.content ? (
            <Text style={[styles.messageText, isOwn ? styles.messageTextOnPrimary : null]}>{item.content}</Text>
          ) : null}
          {item.attachedFile ? (
            <Pressable
              style={[styles.attachment, isOwn ? styles.attachmentOwn : null]}
              onPress={() => handleAttachmentPress(item.attachedFile!.id)}
              accessibilityRole="button"
            >
              <Ionicons name="document" size={16} color={isOwn ? colors.surface : colors.accent} />
              <View style={styles.attachmentMetaWrap}>
                <Text style={[styles.attachmentText, isOwn ? styles.messageTextOnPrimary : null]} numberOfLines={1}>
                  {item.attachedFile.originalFilename}
                </Text>
                <Text
                  style={[styles.attachmentMeta, isOwn ? styles.timestampOnPrimary : null]}
                  numberOfLines={1}
                >
                  {filesApi.formatFileSize(item.attachedFile.fileSize)}
                </Text>
              </View>
            </Pressable>
          ) : null}
          <View style={[styles.actionsRow, isOwn ? styles.actionsRowOwn : null]}>
            <Pressable
              style={styles.actionButton}
              onPress={() => handleTogglePin(item.id)}
              accessibilityRole="button"
            >
              {isPinning ? (
                <ActivityIndicator color={isOwn ? colors.surface : colors.accent} size="small" />
              ) : (
                <Ionicons
                  name={item.isPinned ? 'pin' : 'pin-outline'}
                  size={16}
                  color={isOwn ? colors.surface : colors.accent}
                />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  const queryError = error ? mapApiError(error).message : null;
  const trimmedComposer = composer.trim();
  const isSendDisabled = !trimmedComposer || sendMessageMutation.isPending;
  const showDisabledState = !trimmedComposer;

  useEffect(
    () => () => {
      if (highlightTimer.current) {
        clearTimeout(highlightTimer.current);
      }
    },
    []
  );

  return (
    <Screen scrollable={false} style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 95 : 20}
      >
        <View style={styles.flex}>
          {isLoading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : queryError ? (
            <View style={styles.errorState}>
              <Text style={styles.errorText}>{queryError}</Text>
              <Pressable style={styles.retryButton} onPress={() => refetch()} accessibilityRole="button">
                <Text style={styles.retryLabel}>Try again</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {pinnedMessages.length ? (
                <View style={styles.pinnedBar}>
                  <View style={styles.pinnedHeader}>
                    <Ionicons name="pin" size={16} color={colors.accent} />
                    <Text style={styles.pinnedTitle}>Pinned messages</Text>
                    <Text style={styles.pinnedCount}>{pinnedMessages.length}</Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pinnedChips}>
                    {pinnedMessages.map(message => (
                      <Pressable
                        key={message.id}
                        style={styles.pinnedChip}
                        onPress={() => handleNavigateToPinned(message.id)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.pinnedChipText} numberOfLines={1}>
                          {message.messageType === 'file' && message.attachedFile
                            ? message.attachedFile.originalFilename
                            : message.content || 'Pinned message'}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id.toString()}
                renderItem={renderMessage}
                contentContainerStyle={messages.length ? styles.chatContent : styles.emptyContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing || isRefetching}
                    onRefresh={handleRefresh}
                    tintColor={colors.primary}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Ionicons name="chatbubble-ellipses" size={36} color={colors.textMuted} />
                    <Text style={styles.emptyTitle}>Say hello to your study group</Text>
                    <Text style={styles.emptySubtitle}>
                      Share updates, study plans, and quick questions to keep everyone on track.
                    </Text>
                  </View>
                }
                onScrollToIndexFailed={({ index }) => {
                  setTimeout(() => flatListRef.current?.scrollToIndex({ index, animated: true }), 250);
                }}
              />
            </>
          )}

          <View style={styles.composerContainer}>
            <Pressable
              style={[styles.attachButton, uploadFileMutation.isPending ? styles.attachButtonDisabled : null]}
              onPress={handlePickFile}
              accessibilityRole="button"
              disabled={uploadFileMutation.isPending}
            >
              {uploadFileMutation.isPending ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Ionicons name="attach" size={18} color={colors.surface} />
              )}
            </Pressable>
            <TextInput
              value={composer}
              onChangeText={setComposer}
              placeholder="Message your group"
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.composerInput}
              maxLength={1000}
            />
            <Pressable
              style={[styles.sendButton, showDisabledState ? styles.sendButtonDisabled : null]}
              onPress={handleSend}
              accessibilityRole="button"
              disabled={isSendDisabled}
            >
              {sendMessageMutation.isPending ? (
                <ActivityIndicator color={colors.surface} size="small" />
              ) : (
                <Ionicons name="send" size={18} color={colors.surface} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const formatTime = (isoDate: string) =>
  new Date(isoDate).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

const formatDateTime = (isoDate: string) =>
  new Date(isoDate).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: 0,
      paddingVertical: 0,
      gap: 0,
    },
    flex: {
      flex: 1,
    },
    loader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pinnedBar: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    pinnedHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    pinnedTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    pinnedCount: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    pinnedChips: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    pinnedChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      maxWidth: 220,
    },
    pinnedChipText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    chatContent: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    emptyContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    messageRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingHorizontal: spacing.xs,
    },
    messageRowOwn: {
      justifyContent: 'flex-end',
    },
    highlightedMessage: {
      borderColor: colors.accent,
      shadowColor: colors.accent,
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    messageBubble: {
      maxWidth: '80%',
      borderRadius: 18,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.xs,
    },
    messageBubbleOwn: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    messageHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    senderName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    timestamp: {
      fontSize: 12,
      color: colors.textMuted,
    },
    messageText: {
      fontSize: typography.body,
      color: colors.textPrimary,
    },
    attachment: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    attachmentOwn: {
      backgroundColor: colors.primaryDark,
      borderColor: colors.primaryDark,
    },
    attachmentMetaWrap: {
      flex: 1,
      gap: 2,
    },
    attachmentText: {
      fontSize: 13,
      color: colors.accent,
      flexShrink: 1,
    },
    attachmentMeta: {
      fontSize: 11,
      color: colors.textMuted,
    },
    messageTextOnPrimary: {
      color: colors.surface,
    },
    timestampOnPrimary: {
      color: colors.surfaceAlt,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    actionsRowOwn: {
      justifyContent: 'flex-end',
    },
    actionButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    systemMessage: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
      gap: spacing.xs,
    },
    systemMessageText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    systemMessageMeta: {
      fontSize: 11,
      color: colors.textMuted,
    },
    emptyState: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    emptyTitle: {
      fontSize: typography.subheading,
      fontWeight: '600',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    composerContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.sm,
      padding: spacing.lg,
      borderTopWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    attachButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    attachButtonDisabled: {
      opacity: 0.5,
    },
    composerInput: {
      flex: 1,
      minHeight: 44,
      maxHeight: 120,
      borderRadius: 16,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surfaceAlt,
      color: colors.textPrimary,
      fontSize: typography.body,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    sendButtonDisabled: {
      backgroundColor: colors.surfaceAlt,
    },
    errorState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      padding: spacing.lg,
    },
    errorText: {
      fontSize: typography.body,
      color: colors.error,
      textAlign: 'center',
    },
    retryButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    retryLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.surface,
    },
  });

export default GroupChatScreen;
