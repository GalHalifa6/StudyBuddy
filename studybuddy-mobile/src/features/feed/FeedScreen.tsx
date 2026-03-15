import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { feedApi, FeedItem, FeedResponse } from '../../api/feed';
import { RootStackParamList } from '../../navigation/types';
import { mapApiError } from '../../api/errors';

type Navigation = NativeStackNavigationProp<RootStackParamList>;
type Styles = ReturnType<typeof createStyles>;

const FeedScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    data: feedData,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery<FeedResponse>({
    queryKey: ['feed', 'student'],
    queryFn: feedApi.getStudentFeed,
  });

  const feedItems = feedData?.feedItems ?? [];
  const userProfile = feedData?.userProfile;

  const handleFeedItemPress = (item: FeedItem) => {
    switch (item.itemType) {
      case 'QUIZ_REMINDER':
        // Navigate to quiz/onboarding
        break;
      case 'GROUP_ACTIVITY':
        if (item.groupId) {
          navigation.navigate('MainTabs', {
            screen: 'Groups',
            params: { screen: 'GroupDetails', params: { groupId: item.groupId } },
          } as any);
        }
        break;
      case 'UPCOMING_SESSION':
        if (item.sessionId) {
          navigation.navigate('MainTabs', {
            screen: 'Sessions',
            params: { screen: 'SessionDetails', params: { sessionId: item.sessionId } },
          } as any);
        }
        break;
      case 'GROUP_MATCH':
        if (item.groupId) {
          navigation.navigate('MainTabs', {
            screen: 'Groups',
            params: { screen: 'GroupDetails', params: { groupId: item.groupId } },
          } as any);
        }
        break;
    }
  };

  const renderFeedItem = (item: FeedItem, index: number) => {
    const icon = getFeedItemIcon(item.itemType);
    const color = getFeedItemColor(item.itemType, colors);

    return (
      <Pressable
        key={`${item.itemType}-${index}`}
        style={({ pressed }) => [styles.feedCard, pressed && styles.feedCardPressed]}
        onPress={() => handleFeedItemPress(item)}
      >
        <View style={[styles.feedIconWrap, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        <View style={styles.feedContent}>
          <Text style={styles.feedTitle}>{getFeedItemTitle(item)}</Text>
          <Text style={styles.feedMessage}>{getFeedItemMessage(item)}</Text>
          {item.timestamp && (
            <Text style={styles.feedTime}>{formatRelativeTime(item.timestamp)}</Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your personalized feed...</Text>
        </View>
      </Screen>
    );
  }

  if (error) {
    const errorMessage = mapApiError(error).message;
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline-outline" size={64} color={colors.textMuted} />
          <Text style={styles.errorTitle}>Couldn't load feed</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <Button label="Try Again" onPress={() => refetch()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <LinearGradient
          colors={[colors.heroGradientStart, colors.heroGradientMid, colors.heroGradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroContent}>
            <View style={styles.heroBadge}>
              <Ionicons name="sparkles" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroBadgeText}>PERSONALIZED FOR YOU</Text>
            </View>
            <Text style={styles.heroTitle}>Your Activity Feed</Text>
            <Text style={styles.heroSubtitle}>
              {userProfile?.message || 'Stay up to date with your groups, sessions, and recommendations'}
            </Text>
          </View>
        </LinearGradient>

        {/* Feed Items */}
        {feedItems.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="newspaper-outline" size={56} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Your feed is empty</Text>
            <Text style={styles.emptyMessage}>
              Join groups and sessions to see personalized recommendations and updates here.
            </Text>
            <View style={styles.emptyActions}>
              <Button
                label="Browse Groups"
                onPress={() => navigation.navigate('MainTabs', { screen: 'Groups' } as any)}
                variant="primary"
              />
              <Button
                label="Find Sessions"
                onPress={() => navigation.navigate('MainTabs', { screen: 'Sessions' } as any)}
                variant="secondary"
              />
            </View>
          </View>
        ) : (
          <View style={styles.feedContainer}>
            {feedItems.map((item, index) => renderFeedItem(item, index))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const getFeedItemIcon = (type: FeedItem['itemType']): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'QUIZ_REMINDER':
      return 'clipboard-outline';
    case 'GROUP_ACTIVITY':
      return 'chatbubbles-outline';
    case 'UPCOMING_SESSION':
      return 'calendar-outline';
    case 'GROUP_MATCH':
      return 'people-outline';
    default:
      return 'notifications-outline';
  }
};

const getFeedItemColor = (type: FeedItem['itemType'], colors: Palette): string => {
  switch (type) {
    case 'QUIZ_REMINDER':
      return colors.warning;
    case 'GROUP_ACTIVITY':
      return colors.primary;
    case 'UPCOMING_SESSION':
      return colors.success;
    case 'GROUP_MATCH':
      return colors.secondary;
    default:
      return colors.textMuted;
  }
};

const getFeedItemTitle = (item: FeedItem): string => {
  switch (item.itemType) {
    case 'QUIZ_REMINDER':
      return 'Complete Your Profile';
    case 'GROUP_ACTIVITY':
      return item.groupName || 'Group Activity';
    case 'UPCOMING_SESSION':
      return item.sessionTitle || 'Upcoming Session';
    case 'GROUP_MATCH':
      return item.groupName || 'Group Recommendation';
    default:
      return 'Update';
  }
};

const getFeedItemMessage = (item: FeedItem): string => {
  switch (item.itemType) {
    case 'QUIZ_REMINDER':
      return item.quizMessage || 'Take the personality quiz for better group matches';
    case 'GROUP_ACTIVITY':
      return item.activityMessage || `${item.actorName || 'Someone'} posted in the group`;
    case 'UPCOMING_SESSION':
      return `${item.courseName || 'Session'} with ${item.expertName || 'an expert'}${item.availableSpots !== undefined ? ` • ${item.availableSpots} spots left` : ''}`;
    case 'GROUP_MATCH':
      return `${item.matchPercentage || 0}% match • ${item.matchReason || 'Recommended for you'}`;
    default:
      return 'View details';
  }
};

const formatRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: spacing.xxl,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
    },
    loadingText: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.xl,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    errorMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    hero: {
      borderRadius: borderRadius.xxl,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      marginBottom: spacing.lg,
      overflow: 'hidden',
    },
    heroContent: {
      padding: spacing.lg,
      gap: spacing.sm,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    heroBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 1.5,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    heroSubtitle: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.85)',
      lineHeight: 22,
    },
    feedContainer: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    feedCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: colors.border,
    },
    feedCardPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },
    feedIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    feedContent: {
      flex: 1,
      gap: 2,
    },
    feedTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    feedMessage: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    feedTime: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    emptyState: {
      alignItems: 'center',
      padding: spacing.xxl,
      gap: spacing.md,
    },
    emptyIconWrap: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    emptyTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    emptyMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: spacing.lg,
    },
    emptyActions: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.md,
    },
  });

export default FeedScreen;
