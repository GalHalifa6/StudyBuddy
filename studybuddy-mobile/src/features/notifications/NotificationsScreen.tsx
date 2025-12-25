import React, { useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/ui/Screen';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { RootStackParamList } from '../../navigation/types';
import { notificationsApi, Notification, NotificationType } from '../../api/notifications';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;
type Styles = ReturnType<typeof createStyles>;

const NotificationsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const {
    data: notifications = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.getAll,
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: error => {
      const apiError = mapApiError(error);
      showToast(apiError.message, 'error');
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showToast('All marked as read', 'success');
    },
    onError: error => {
      const apiError = mapApiError(error);
      showToast(apiError.message, 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: error => {
      const apiError = mapApiError(error);
      showToast(apiError.message, 'error');
    },
  });

  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  const getNotificationIcon = useCallback((type: NotificationType): { name: keyof typeof Ionicons.glyphMap; color: string } => {
    switch (type) {
      case 'NEW_QUESTION':
      case 'QUESTION_ANSWERED':
        return { name: 'help-circle', color: colors.primary };
      case 'SESSION_INVITATION':
      case 'SESSION_REMINDER':
        return { name: 'calendar', color: colors.success };
      case 'SESSION_STARTED':
        return { name: 'play-circle', color: colors.success };
      case 'NEW_REVIEW':
        return { name: 'star', color: '#F59E0B' };
      case 'GROUP_INVITE':
        return { name: 'people', color: colors.primary };
      case 'GROUP_MESSAGE':
        return { name: 'chatbubbles', color: colors.secondary };
      default:
        return { name: 'notifications', color: colors.textMuted };
    }
  }, [colors]);

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }, []);

  const handleNotificationPress = useCallback((notif: Notification) => {
    // Mark as read when tapped
    if (!notif.isRead) {
      markReadMutation.mutate(notif.id);
    }

    // Navigate based on notification type
    if (notif.referenceType === 'SESSION' && notif.referenceId) {
      navigation.navigate('MainTabs', { 
        screen: 'Sessions',
        params: { screen: 'SessionDetails', params: { sessionId: notif.referenceId } }
      } as any);
    } else if (notif.referenceType === 'QUESTION' && notif.referenceId) {
      navigation.navigate('MainTabs', {
        screen: 'Experts',
        params: { screen: 'QuestionDetail', params: { questionId: notif.referenceId } }
      } as any);
    } else if (notif.referenceType === 'GROUP' && notif.referenceId) {
      navigation.navigate('MainTabs', {
        screen: 'Groups',
        params: { screen: 'GroupDetails', params: { groupId: notif.referenceId } }
      } as any);
    }
  }, [navigation, markReadMutation]);

  const renderNotificationCard = useCallback((notif: Notification) => {
    const icon = getNotificationIcon(notif.type);
    
    return (
      <Pressable
        key={notif.id}
        style={({ pressed }) => [
          styles.notificationCard,
          !notif.isRead && styles.notificationCardUnread,
          pressed && styles.notificationCardPressed,
        ]}
        onPress={() => handleNotificationPress(notif)}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
          <Ionicons name={icon.name} size={22} color={icon.color} />
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.notificationTitle, !notif.isRead && styles.notificationTitleUnread]} numberOfLines={1}>
              {notif.title}
            </Text>
            <View style={styles.rightActions}>
              <Text style={styles.timeText}>{formatTime(notif.createdAt)}</Text>
              {!notif.isRead && <View style={styles.unreadDot} />}
            </View>
          </View>
          <Text style={styles.notificationMessage} numberOfLines={2}>
            {notif.message}
          </Text>

          {/* Action buttons for actionable notifications */}
          {notif.type === 'SESSION_STARTED' && notif.referenceId && (
            <Pressable
              style={styles.actionButton}
              onPress={() => handleNotificationPress(notif)}
            >
              <Ionicons name="videocam" size={14} color="#fff" />
              <Text style={styles.actionButtonText}>Join Session Now</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          style={styles.deleteButton}
          onPress={() => deleteMutation.mutate(notif.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    );
  }, [colors, styles, getNotificationIcon, formatTime, handleNotificationPress, deleteMutation]);

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Hero Header */}
      <LinearGradient
        colors={[colors.heroGradientStart, colors.heroGradientMid, colors.heroGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTitleRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <View>
            <Text style={styles.heading}>Notifications</Text>
            {unreadCount > 0 && (
              <Text style={styles.subheading}>{unreadCount} unread</Text>
            )}
          </View>
        </View>
        {unreadCount > 0 && (
          <Pressable
            style={styles.markAllButton}
            onPress={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            {markAllReadMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="checkmark-done" size={16} color={colors.primary} />
                <Text style={styles.markAllText}>Mark all read</Text>
              </>
            )}
          </Pressable>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="notifications-off" size={48} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyMessage}>You're all caught up!</Text>
          </View>
        ) : (
          notifications.map(renderNotificationCard)
        )}
      </ScrollView>
    </Screen>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      borderBottomLeftRadius: borderRadius.xl,
      borderBottomRightRadius: borderRadius.xl,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.full,
      backgroundColor: `${colors.surface}80`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    heading: {
      fontSize: typography.heading,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subheading: {
      fontSize: typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    markAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-end',
      marginTop: spacing.md,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      backgroundColor: `${colors.primary}20`,
      borderRadius: borderRadius.md,
    },
    markAllText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.primary,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.md,
      paddingBottom: spacing.xxl,
    },
    notificationCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    notificationCardUnread: {
      backgroundColor: `${colors.primary}08`,
      borderColor: `${colors.primary}30`,
    },
    notificationCardPressed: {
      opacity: 0.8,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.full,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    contentContainer: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.xs,
    },
    notificationTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      flex: 1,
      marginRight: spacing.sm,
    },
    notificationTitleUnread: {
      fontWeight: '700',
    },
    rightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    timeText: {
      fontSize: typography.caption,
      color: colors.textMuted,
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary,
    },
    notificationMessage: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.success,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.md,
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
    },
    actionButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#fff',
    },
    deleteButton: {
      padding: spacing.xs,
      marginLeft: spacing.xs,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xxl,
    },
    emptyIconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surfaceAlt,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    emptyTitle: {
      fontSize: typography.subheading,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    emptyMessage: {
      fontSize: typography.body,
      color: colors.textSecondary,
    },
  });

export default NotificationsScreen;
