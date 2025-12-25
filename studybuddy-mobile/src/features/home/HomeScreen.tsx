import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { dashboardApi } from '../../api/dashboard';
import { notificationsApi } from '../../api/notifications';
import { mapApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import type {
  CourseHighlight,
  DashboardMetrics,
  DashboardOverview,
  SessionPreview,
} from '../../api/types';
import { Button } from '../../components/ui/Button';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';

type Navigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;
type Styles = ReturnType<typeof createStyles>;

type MetricConfigItem = {
  key: keyof DashboardMetrics;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  formatter?: (value: number) => string;
};

const metricConfig: ReadonlyArray<MetricConfigItem> = [
  { key: 'enrolledCourses', label: 'Enrolled courses', icon: 'book-outline' },
  { key: 'myGroups', label: 'Study groups', icon: 'people-outline' },
  { key: 'focusMinutesThisWeek', label: 'Focus minutes', icon: 'time-outline', formatter: value => `${value} min` },
  { key: 'studyPalsCount', label: 'Study pals', icon: 'heart-outline' },
  { key: 'upcomingSessions', label: 'Upcoming sessions', icon: 'calendar-outline' },
  { key: 'unreadMessages', label: 'Unread messages', icon: 'chatbubble-ellipses-outline' },
  { key: 'notifications', label: 'Alerts', icon: 'notifications-outline' },
];

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isExpert = user?.role === 'EXPERT';

  const {
    data: overview,
    isLoading,
    isRefetching,
    refetch,
    error,
  } = useQuery<DashboardOverview>({
    queryKey: ['dashboard', 'overview'],
    queryFn: dashboardApi.overview,
  });

  // Fetch notification count
  const { data: unreadNotifications = 0 } = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const metricItems = useMemo(() => buildMetricItems(overview?.metrics), [overview]);
  const quickActions = useMemo(
    () => [
      { label: 'Browse courses', icon: 'book-outline' as const, onPress: () => navigation.navigate('Courses', { screen: 'CoursesHome' }) },
      { label: 'Find groups', icon: 'people-outline' as const, onPress: () => navigation.navigate('Groups', { screen: 'GroupsHome' }) },
      { label: isExpert ? 'My Sessions' : 'Upcoming sessions', icon: 'calendar-outline' as const, onPress: () => navigation.navigate('Sessions') },
      { label: isExpert ? 'Expert Dashboard' : 'Meet experts', icon: isExpert ? 'stats-chart-outline' as const : 'briefcase-outline' as const, onPress: () => navigation.navigate('Experts') },
    ],
    [navigation, isExpert]
  );

  if (isLoading && !overview) {
    return (
      <Screen>
        <DashboardSkeleton styles={styles} />
      </Screen>
    );
  }

  if (error && !overview) {
    const message = mapApiError(error).message;
    return (
      <Screen>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{message}</Text>
          <Button label="Retry" onPress={() => refetch()} />
        </View>
      </Screen>
    );
  }

  if (!overview) {
    return (
      <Screen>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>We could not load your dashboard yet. Pull to refresh in a moment.</Text>
          <Button label="Refresh" onPress={() => refetch()} variant="secondary" />
        </View>
      </Screen>
    );
  }

  const greetingName = (user?.fullName ?? user?.username ?? 'there').split(' ')[0];
  const greeting = getGreeting();

  const nextSession = overview.nextSession;
  const courseHighlights = overview.courseHighlights.slice(0, 4);
  const unreadGroups = overview.unreadMessages.groups.slice(0, 3);

  return (
    <Screen>
      {/* Gradient Hero Section */}
      <LinearGradient
        colors={[colors.heroGradientStart, colors.heroGradientMid, colors.heroGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <View style={styles.heroHeader}>
            <View style={styles.heroCopy}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={14} color="#FFF" />
                <Text style={styles.heroBadgeText}>LEARNING HUB</Text>
              </View>
              <Text style={styles.greeting}>{`${greeting}, ${greetingName}`}</Text>
              <Text style={styles.heroSubtitle}>Here's a snapshot of your study activity and what's coming up next.</Text>
            </View>
            <View style={styles.heroActions}>
              {/* Notification Bell */}
              <Pressable
                style={styles.notificationButton}
                onPress={() => navigation.navigate('Notifications')}
                accessibilityRole="button"
                accessibilityLabel={`Notifications${unreadNotifications > 0 ? `, ${unreadNotifications} unread` : ''}`}
              >
                <Ionicons name="notifications" size={20} color="rgba(255,255,255,0.9)" />
                {unreadNotifications > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotifications > 99 ? '99+' : unreadNotifications}
                    </Text>
                  </View>
                )}
              </Pressable>
              {/* Refresh Button */}
              <Pressable
                style={[styles.refreshButton, isRefetching ? styles.refreshButtonDisabled : null]}
                onPress={() => refetch()}
                accessibilityRole="button"
                disabled={isRefetching}
              >
                {isRefetching ? <ActivityIndicator color="#FFF" size="small" /> : <Ionicons name="refresh" size={18} color="rgba(255,255,255,0.9)" />}
              </Pressable>
            </View>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{overview.metrics.focusMinutesThisWeek}</Text>
              <Text style={styles.heroStatLabel}>Focus mins</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{overview.metrics.studyPalsCount}</Text>
              <Text style={styles.heroStatLabel}>Study pals</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <SectionHeader title="Quick actions" styles={styles} />
        <View style={styles.quickActionsGrid}>
          {quickActions.map(action => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [styles.quickAction, pressed && styles.quickActionPressed]}
              onPress={action.onPress}
              accessibilityRole="button"
            >
              <LinearGradient
                colors={[colors.surfaceAlt, colors.surface]}
                style={styles.quickActionGradient}
              >
                <View style={styles.quickActionIcon}>
                  <Ionicons name={action.icon} size={22} color={colors.primary} />
                </View>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </LinearGradient>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="At a glance" styles={styles} actionLabel="Refresh" onAction={() => refetch()} />
        <View style={styles.metricsGrid}>
          {metricItems.map(item => (
            <View key={item.key} style={styles.metricCard}>
              <View style={styles.metricIconWrap}>
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <Text style={styles.metricValue}>{item.display}</Text>
              <Text style={styles.metricLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {nextSession ? (
        <View style={styles.section}>
          <SectionHeader title="Next session" styles={styles} actionLabel="View all" onAction={() => navigation.navigate('Sessions')} />
          <Pressable
            style={styles.nextSessionCard}
            onPress={() => navigation.navigate('Sessions', { screen: 'SessionDetails', params: { sessionId: nextSession.id } })}
            accessibilityRole="button"
          >
            <View style={styles.nextSessionHeader}>
              <Ionicons name="flash-outline" size={20} color={colors.primary} />
              <Text style={styles.nextSessionTitle} numberOfLines={2}>
                {nextSession.title}
              </Text>
            </View>
            <View style={styles.nextSessionMeta}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.metaText}>{formatSessionSchedule(nextSession)}</Text>
            </View>
            {nextSession.course ? (
              <View style={styles.nextSessionMeta}>
                <Ionicons name="school-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.metaText}>
                  {[nextSession.course.code, nextSession.course.name].filter(Boolean).join(' • ')}
                </Text>
              </View>
            ) : null}
            {nextSession.group ? (
              <View style={styles.nextSessionMeta}>
                <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.metaText}>{nextSession.group.name || ''}</Text>
              </View>
            ) : null}
            <View style={styles.badgeRow}>
              {nextSession.status ? (
                <View style={styles.badge}>
                  <Ionicons name="radio-button-on-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.badgeText}>{nextSession.status}</Text>
                </View>
              ) : null}
              {nextSession.sessionType ? (
                <View style={styles.badge}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                  <Text style={styles.badgeText}>{nextSession.sessionType}</Text>
                </View>
              ) : null}
              <View style={styles.badge}>
                <Ionicons name="people-outline" size={14} color={colors.textMuted} />
                <Text style={styles.badgeText}>
                  {`${nextSession.currentParticipants ?? 0}/${nextSession.maxParticipants ?? 0} joined`}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>
      ) : null}

      {courseHighlights.length ? (
        <View style={styles.section}>
          <SectionHeader title="Focus courses" styles={styles} actionLabel="Browse catalog" onAction={() => navigation.navigate('Courses', { screen: 'CoursesHome' })} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlightScroll}>
            {courseHighlights.map(highlight => (
              <CourseHighlightCard
                key={highlight.courseId}
                highlight={highlight}
                styles={styles}
                palette={colors}
                onPress={() =>
                  navigation.navigate('Courses', {
                    screen: 'CourseDetails',
                    params: { courseId: highlight.courseId, title: highlight.name },
                  })
                }
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Unread messages" styles={styles} actionLabel="Open groups" onAction={() => navigation.navigate('Groups', { screen: 'GroupsHome' })} />
        <View style={styles.unreadCard}>
          <Text style={styles.unreadSummary}>
            {overview.unreadMessages.total ? `${overview.unreadMessages.total} unread messages` : 'You are all caught up'}
          </Text>
          <Text style={styles.unreadDescription}>
            {overview.unreadMessages.total
              ? 'Top conversations that need your attention.'
              : 'Jump into a group to start collaborating with your peers.'}
          </Text>
          {overview.unreadMessages.total && unreadGroups.length ? (
            unreadGroups.map(group => (
              <Pressable
                key={group.groupId}
                style={styles.unreadRow}
                onPress={() =>
                  navigation.navigate('Groups', {
                    screen: 'GroupDetails',
                    params: { groupId: group.groupId, title: group.groupName },
                  })
                }
                accessibilityRole="button"
              >
                <View style={styles.unreadLeft}>
                  <Text style={styles.unreadGroup} numberOfLines={1}>
                    {group.groupName}
                  </Text>
                  <Text style={styles.unreadPreview} numberOfLines={1}>
                    {group.lastMessagePreview ?? 'Catch up and keep the discussion moving.'}
                  </Text>
                </View>
                <View style={styles.unreadRight}>
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{group.unreadCount}</Text>
                  </View>
                  <Text style={styles.metaText}>{formatRelativeTime(group.lastMessageAt)}</Text>
                </View>
              </Pressable>
            ))
          ) : (
            <Text style={styles.emptyNotice}>No unread messages right now.</Text>
          )}
        </View>
      </View>
    </Screen>
  );
};

type CourseHighlightProps = {
  highlight: CourseHighlight;
  styles: Styles;
  palette: Palette;
  onPress: () => void;
};

const CourseHighlightCard: React.FC<CourseHighlightProps> = ({ highlight, styles, palette, onPress }) => {
  return (
    <Pressable style={styles.highlightCard} onPress={onPress} accessibilityRole="button">
      <View style={styles.highlightHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.highlightCode}>{highlight.code}</Text>
          <Text style={styles.highlightName} numberOfLines={2}>
            {highlight.name}
          </Text>
        </View>
        <Ionicons
          name={highlight.enrolled ? 'checkmark-circle' : 'arrow-forward-circle-outline'}
          size={24}
          color={highlight.enrolled ? palette.success : palette.primary}
        />
      </View>

      <View style={styles.highlightStatsRow}>
        <HighlightStat icon="people-outline" label={`${highlight.groupCount} groups`} palette={palette} styles={styles} />
        <HighlightStat icon="sparkles-outline" label={`${highlight.expertCount} experts`} palette={palette} styles={styles} />
        <HighlightStat icon="chatbubble-ellipses-outline" label={`${highlight.questionCount} questions`} palette={palette} styles={styles} />
      </View>

      <View style={styles.highlightFooter}>
        {highlight.upcomingSession ? (
          <View style={styles.badge}>
            <Ionicons name="calendar-outline" size={14} color={palette.textMuted} />
            <Text style={styles.badgeText} numberOfLines={1}>
              {formatSessionSchedule(highlight.upcomingSession)}
            </Text>
          </View>
        ) : highlight.recentQuestion ? (
          <View style={styles.badge}>
            <Ionicons
              name={highlight.recentQuestion.answered ? 'checkmark-done-outline' : 'help-circle-outline'}
              size={14}
              color={palette.textMuted}
            />
            <Text style={styles.badgeText} numberOfLines={1}>
              {highlight.recentQuestion.title}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
};

type HighlightStatProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  palette: Palette;
  styles: Styles;
};

const HighlightStat: React.FC<HighlightStatProps> = ({ icon, label, palette, styles }) => (
  <View style={styles.highlightStat}>
    <Ionicons name={icon} size={16} color={palette.textSecondary} />
    <Text style={styles.highlightStatText}>{label}</Text>
  </View>
);

const SectionHeader: React.FC<{ title: string; actionLabel?: string; onAction?: () => void; styles: Styles }> = ({
  title,
  actionLabel,
  onAction,
  styles,
}) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {actionLabel && onAction ? (
      <Pressable onPress={onAction} accessibilityRole="button">
        <Text style={styles.sectionAction}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

const DashboardSkeleton: React.FC<{ styles: Styles }> = ({ styles }) => (
  <View style={styles.skeletonStack}>
    <View style={styles.skeletonCardLarge} />
    <View style={styles.skeletonGrid}>
      <View style={styles.skeletonMetric} />
      <View style={styles.skeletonMetric} />
      <View style={styles.skeletonMetric} />
      <View style={styles.skeletonMetric} />
    </View>
    <View style={styles.skeletonCardLarge} />
    <View style={styles.skeletonRow} />
    <View style={styles.skeletonRow} />
  </View>
);

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    hero: {
      borderRadius: borderRadius.xxl,
      overflow: 'hidden',
      marginBottom: spacing.lg,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.1)',
    },
    heroContent: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    heroHeader: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    heroCopy: {
      flex: 1,
      gap: spacing.sm,
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    heroBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 1.5,
    },
    greeting: {
      fontSize: 28,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    heroSubtitle: {
      fontSize: 15,
      color: 'rgba(255,255,255,0.85)',
      lineHeight: 22,
    },
    heroActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    notificationButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      position: 'relative',
    },
    notificationBadge: {
      position: 'absolute',
      top: 2,
      right: 2,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      borderWidth: 2,
      borderColor: colors.heroGradientStart,
    },
    notificationBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    refreshButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
    },
    refreshButtonDisabled: {
      opacity: 0.6,
    },
    heroStats: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    heroStatCard: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.15)',
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.2)',
    },
    heroStatValue: {
      fontSize: 28,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    heroStatLabel: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.8)',
      marginTop: 2,
    },
    section: {
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    sectionAction: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    quickActionsGrid: {
      gap: spacing.sm,
    },
    quickAction: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    quickActionPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    quickActionGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickActionIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickActionLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    metricCard: {
      width: '48%',
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    metricIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      marginBottom: spacing.sm,
    },
    metricValue: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    metricLabel: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    nextSessionCard: {
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.successLight,
    },
    nextSessionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    nextSessionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    nextSessionMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    metaText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceAlt,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    highlightScroll: {
      gap: spacing.md,
      paddingRight: spacing.md,
    },
    highlightCard: {
      width: 280,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      shadowOpacity: 1,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 3,
    },
    highlightHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    highlightCode: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    highlightName: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 22,
    },
    highlightStatsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    highlightStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    highlightStatText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    highlightFooter: {
      gap: spacing.xs,
    },
    unreadCard: {
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    unreadSummary: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    unreadDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    unreadRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    unreadLeft: {
      flex: 1,
      gap: 2,
    },
    unreadGroup: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    unreadPreview: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    unreadRight: {
      alignItems: 'flex-end',
      gap: spacing.xs,
    },
    unreadBadge: {
      minWidth: 28,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    unreadBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textOnPrimary,
    },
    emptyNotice: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    skeletonStack: {
      gap: spacing.lg,
    },
    skeletonCardLarge: {
      height: 180,
      borderRadius: borderRadius.xxl,
      backgroundColor: colors.surfaceAlt,
      opacity: 0.5,
    },
    skeletonGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    skeletonMetric: {
      flexBasis: '48%',
      height: 100,
      borderRadius: borderRadius.xl,
      backgroundColor: colors.surfaceAlt,
      opacity: 0.5,
    },
    skeletonRow: {
      height: 60,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surfaceAlt,
      opacity: 0.5,
    },
    errorCard: {
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    errorText: {
      fontSize: 15,
      color: colors.textPrimary,
      lineHeight: 22,
    },
  });

const buildMetricItems = (metrics: DashboardMetrics | undefined) =>
  metricConfig.map(item => {
    const raw = metrics ? metrics[item.key] ?? 0 : 0;
    return {
      key: item.key,
      label: item.label,
      icon: item.icon,
      display: item.formatter ? item.formatter(raw) : raw.toString(),
    };
  });

const formatSessionSchedule = (session: SessionPreview) => {
  const start = new Date(session.scheduledStartTime);
  const end = new Date(session.scheduledEndTime);

  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return `${dateFormatter.format(start)} · ${timeFormatter.format(start)} – ${timeFormatter.format(end)}`;
};

const formatRelativeTime = (value?: string) => {
  if (!value) {
    return '—';
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return '—';
  }

  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  const diffWeeks = Math.round(diffDays / 7);
  if (diffWeeks < 4) {
    return `${diffWeeks}w ago`;
  }
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) {
    return `${diffMonths}mo ago`;
  }
  const diffYears = Math.round(diffDays / 365);
  return `${diffYears}y ago`;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  if (hour < 17) {
    return 'Good afternoon';
  }
  return 'Good evening';
};

export default HomeScreen;
