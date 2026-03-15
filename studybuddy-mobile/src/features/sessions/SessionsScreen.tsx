import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/ui/Screen';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { SessionsStackParamList } from '../../navigation/types';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { sessionApi } from '../../api/sessions';
import { expertsApi } from '../../api/experts';
import { SessionSummary, ExpertManagedSession } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';

type Props = NativeStackScreenProps<SessionsStackParamList, 'SessionsHome'>;
type Styles = ReturnType<typeof createStyles>;

const MIN_SEARCH_CHARS = 2;

const SessionsScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();
  const isExpert = user?.role === 'EXPERT';

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const searchTerm = debouncedSearch.length >= MIN_SEARCH_CHARS ? debouncedSearch : undefined;

  const {
    data: mySessions = [],
    isLoading: loadingMySessions,
    isRefetching: refetchingMySessions,
    refetch: refetchMySessions,
  } = useQuery({
    queryKey: ['sessions', 'myUpcoming'],
    queryFn: sessionApi.myUpcoming,
  });

  // Fetch expert-created sessions if user is an expert
  const {
    data: myExpertSessions = [],
    isLoading: loadingExpertSessions,
    isRefetching: refetchingExpertSessions,
    refetch: refetchExpertSessions,
  } = useQuery({
    queryKey: ['experts', 'mySessions'],
    queryFn: expertsApi.mySessions,
    enabled: isExpert,
  });

  // Combine participant sessions with expert-created sessions (avoiding duplicates)
  // Filter out completed and cancelled sessions to match web frontend behavior
  const allMySessions = useMemo(() => {
    // Filter out completed and cancelled sessions
    const filterActiveSessions = (sessions: SessionSummary[]) => {
      return sessions.filter(s => {
        const status = s.status?.toLowerCase() || s.statusKey?.toLowerCase() || '';
        return status !== 'completed' && status !== 'cancelled';
      });
    };

    const filteredMySessions = filterActiveSessions(mySessions);
    
    if (!isExpert) return filteredMySessions;
    
    const sessionIds = new Set(filteredMySessions.map(s => s.id));
    const expertSessionsAsSummary: SessionSummary[] = myExpertSessions
      .filter(s => !sessionIds.has(s.id))
      .map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        sessionType: s.sessionType,
        status: s.status,
        statusKey: (s as any).statusKey,
        scheduledStartTime: s.scheduledStartTime,
        scheduledEndTime: s.scheduledEndTime,
        currentParticipants: s.currentParticipants ?? 0,
        maxParticipants: s.maxParticipants ?? 10,
        course: s.course,
        group: s.group,
        // Expert-created sessions are hosted by the current user
        host: user ? { id: user.id, fullName: user.fullName ?? user.username, username: user.username } : undefined,
        isExpertCreated: true,
      } as SessionSummary & { isExpertCreated?: boolean }));
    
    return [...filteredMySessions, ...filterActiveSessions(expertSessionsAsSummary)];
  }, [mySessions, myExpertSessions, isExpert, user]);

  const {
    data: browseSessions = [],
    isLoading: loadingBrowse,
    isRefetching: refetchingBrowse,
    refetch: refetchBrowse,
  } = useQuery({
    queryKey: ['sessions', 'browse', { type: selectedType ?? null, search: searchTerm ?? null }],
    queryFn: () =>
      sessionApi.browse({
        type: selectedType ?? undefined,
        search: searchTerm,
      }),
  });

  const joinMutation = useMutation({
    mutationFn: (sessionId: number) => sessionApi.join(sessionId),
    onSuccess: (_, sessionId) => {
      showToast('Joined session', 'success');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'status', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'participants', sessionId] });
    },
    onError: (error, sessionId) => {
      const apiError = mapApiError(error);
      // If 409 Conflict (already joined), just refresh data silently
      if (apiError.status === 409) {
        showToast('Already joined this session', 'info');
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        queryClient.invalidateQueries({ queryKey: ['sessions', 'status', sessionId] });
      } else {
        showToast(apiError.message, 'error');
      }
    },
  });

  const leaveMutation = useMutation({
    mutationFn: (sessionId: number) => sessionApi.leave(sessionId),
    onSuccess: (_, sessionId) => {
      showToast('Left session', 'info');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'status', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['sessions', 'participants', sessionId] });
    },
    onError: error => {
      const apiError = mapApiError(error);
      showToast(apiError.message, 'error');
    },
  });

  const isMutating = joinMutation.isPending || leaveMutation.isPending;
  const refreshing = refetchingMySessions || refetchingBrowse || (isExpert && refetchingExpertSessions);
  const pendingSessionId = joinMutation.isPending
    ? joinMutation.variables ?? null
    : leaveMutation.isPending
    ? leaveMutation.variables ?? null
    : null;
  const showRefreshSpinner = refreshing || isMutating;

  const typeOptions = useMemo(() => {
    const unique = new Set<string>();
    [...allMySessions, ...browseSessions].forEach(session => {
      if (session.sessionType) {
        unique.add(session.sessionType);
      }
    });

    return Array.from(unique).sort();
  }, [allMySessions, browseSessions]);

  const mySessionIds = useMemo(() => new Set(allMySessions.map(session => session.id)), [allMySessions]);

  const browseEmpty = !loadingBrowse && browseSessions.length === 0;
  const myEmpty = !(loadingMySessions || (isExpert && loadingExpertSessions)) && allMySessions.length === 0;

  const handleRefreshAll = () => {
    refetchMySessions();
    refetchBrowse();
    if (isExpert) {
      refetchExpertSessions();
    }
  };

  const handleToggleType = (type: string | null) => {
    setSelectedType(prev => (prev === type ? null : type));
  };

  const handleJoinToggle = (session: SessionSummary, joined: boolean) => {
    if (joined) {
      leaveMutation.mutate(session.id);
    } else {
      joinMutation.mutate(session.id);
    }
  };

  return (
    <Screen>
      {/* Hero Card */}
      <LinearGradient
        colors={[colors.heroGradientStart, colors.heroGradientMid, colors.heroGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.heroBadge}>
          <Ionicons name="videocam" size={14} color={colors.primary} />
          <Text style={styles.heroBadgeText}>LIVE LEARNING</Text>
        </View>
        <Text style={styles.heading}>Live sessions</Text>
        <Text style={styles.subheading}>
          {isExpert 
            ? 'Manage your sessions and help students learn together.'
            : 'Reserve spots, join collaborative study rooms, and stay aligned with your learning plan.'}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Ionicons name="calendar" size={16} color={colors.primary} />
            <Text style={styles.statValue}>{allMySessions?.length ?? 0}</Text>
            <Text style={styles.statLabel}>{isExpert ? 'My Sessions' : 'Upcoming'}</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="globe" size={16} color={colors.secondary} />
            <Text style={styles.statValue}>{browseSessions?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>
        <Pressable style={styles.refreshButton} onPress={handleRefreshAll} accessibilityRole="button">
          {showRefreshSpinner ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          )}
        </Pressable>
      </LinearGradient>

      <View style={styles.filters}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by title, course, or host"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length ? (
            <Pressable onPress={() => setSearch('')} accessibilityRole="button">
              <Ionicons name="close" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {typeOptions.length ? (
          <View style={styles.chipRow}>
            <FilterChip
              label="All"
              active={!selectedType}
              onPress={() => handleToggleType(null)}
              styles={styles}
            />
            {typeOptions.map(option => (
              <FilterChip
                key={option}
                label={option}
                active={selectedType === option}
                onPress={() => handleToggleType(option)}
                styles={styles}
              />
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader 
          title={isExpert ? "Your sessions" : "Your upcoming sessions"} 
          styles={styles} 
          actionLabel="Refresh" 
          onAction={handleRefreshAll} 
        />
        {(loadingMySessions || (isExpert && loadingExpertSessions)) ? (
          <SkeletonList styles={styles} />
        ) : myEmpty ? (
          <EmptyState
            styles={styles}
            title="No sessions yet"
            message={isExpert 
              ? "Create a session to help students learn together."
              : "Join a session to see it here and get reminders as the start time approaches."}
            actionLabel={isExpert ? "Create session" : "Discover sessions"}
            onAction={refetchBrowse}
          />
        ) : (
          allMySessions.map(session => {
            const isHosting = (session as any).isExpertCreated === true;
            return (
              <SessionCard
                key={session.id}
                session={session}
                joined={!isHosting}
                isHosting={isHosting}
                loading={refreshing || (isMutating && pendingSessionId === session.id)}
                styles={styles}
                palette={colors}
                onPress={() => navigation.navigate('SessionDetails', { sessionId: session.id })}
                onAction={() => !isHosting && handleJoinToggle(session, true)}
              />
            );
          })
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Discover sessions" styles={styles} actionLabel="Reload" onAction={refetchBrowse} />
        {loadingBrowse ? (
          <SkeletonList styles={styles} />
        ) : browseEmpty ? (
          <EmptyState
            styles={styles}
            title={searchTerm ? 'No matches found' : 'No sessions available'}
            message={
              searchTerm
                ? 'Try a different keyword or session type to keep exploring.'
                : 'Check back soon for new live sessions tailored to your courses.'
            }
          />
        ) : (
          browseSessions.map(session => {
            // Use isJoined from API if available, fallback to local check
            const joined = session.isJoined ?? mySessionIds.has(session.id);
            return (
              <SessionCard
                key={session.id}
                session={session}
                joined={joined}
                loading={refreshing || (isMutating && pendingSessionId === session.id)}
                styles={styles}
                palette={colors}
                onPress={() => navigation.navigate('SessionDetails', { sessionId: session.id })}
                onAction={() => handleJoinToggle(session, joined)}
              />
            );
          })
        )}
      </View>
    </Screen>
  );
};

const FilterChip: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
  styles: Styles;
}> = ({ label, active, onPress, styles }) => (
  <Pressable
    style={[styles.chip, active ? styles.chipActive : null]}
    onPress={onPress}
    accessibilityRole="button"
  >
    <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{label}</Text>
  </Pressable>
);

type SessionCardProps = {
  session: SessionSummary;
  joined: boolean;
  isHosting?: boolean;
  loading: boolean;
  onPress: () => void;
  onAction: () => void;
  styles: Styles;
  palette: Palette;
};

const SessionCard: React.FC<SessionCardProps> = ({ session, joined, isHosting = false, loading, onPress, onAction, styles, palette }) => {
  const schedule = formatSessionSchedule(session) || '';
  const capacityText = `${session.currentParticipants ?? 0}/${session.maxParticipants ?? 0} seats`;
  const isAlmostFull = (session.currentParticipants ?? 0) >= (session.maxParticipants ?? 0) * 0.8;
  const isActive = joined || isHosting;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, isActive && styles.cardActive, isHosting && styles.cardHosting, pressed && styles.cardPressed]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.sessionIcon, isActive && styles.sessionIconJoined, isHosting && styles.sessionIconHosting]}>
          <Ionicons
            name={isHosting ? 'megaphone' : joined ? 'checkmark-circle' : 'videocam'}
            size={20}
            color={isActive ? palette.textOnPrimary : palette.primary}
          />
        </View>
        <View style={styles.cardTitleArea}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {session.title || ''}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={palette.textMuted} />
            <Text style={styles.metaText}>{schedule || ''}</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
      </View>

      <View style={styles.badgeRow}>
        {isHosting ? (
          <View style={[styles.badge, styles.badgeHost]}>
            <Ionicons name="star" size={12} color={palette.secondary} />
            <Text style={[styles.badgeText, { color: palette.secondary }]}>Hosting</Text>
          </View>
        ) : null}
        {session.sessionType ? (
          <View style={styles.badge}>
            <Ionicons name="pricetag" size={12} color={palette.primary} />
            <Text style={[styles.badgeText, { color: palette.primary }]}>{session.sessionType || ''}</Text>
          </View>
        ) : null}
        {session.status ? (
          <View style={[styles.badge, (session.statusKey === 'IN_PROGRESS' || session.status === 'In Progress') && styles.badgeLive]}>
            <Ionicons
              name={(session.statusKey === 'IN_PROGRESS' || session.status === 'In Progress') ? 'radio-button-on' : 'radio-button-off'}
              size={12}
              color={(session.statusKey === 'IN_PROGRESS' || session.status === 'In Progress') ? palette.success : palette.textMuted}
            />
            <Text style={[styles.badgeText, (session.statusKey === 'IN_PROGRESS' || session.status === 'In Progress') && { color: palette.success }]}>
              {session.status || ''}
            </Text>
          </View>
        ) : null}
        <View style={[styles.badge, isAlmostFull && styles.badgeWarning]}>
          <Ionicons name="people" size={12} color={isAlmostFull ? palette.warning : palette.textMuted} />
          <Text style={[styles.badgeText, isAlmostFull && { color: palette.warning }]}>{capacityText}</Text>
        </View>
      </View>

      {session.course ? (
        <View style={styles.metaRow}>
          <Ionicons name="school-outline" size={14} color={palette.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {[session.course?.code, session.course?.name].filter(Boolean).join(' • ') || ''}
          </Text>
        </View>
      ) : null}

      {session.group ? (
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={14} color={palette.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>{session.group.name || ''}</Text>
        </View>
      ) : null}

      <Button
        label={isHosting ? 'Manage' : joined ? 'Leave' : 'Join'}
        icon={isHosting ? 'settings-outline' : joined ? 'exit-outline' : 'enter-outline'}
        variant={isHosting ? 'secondary' : joined ? 'ghost' : 'primary'}
        size="sm"
        onPress={isHosting ? onPress : onAction}
        loading={loading}
        style={styles.cardAction}
      />
    </Pressable>
  );
};

const SectionHeader: React.FC<{
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  styles: Styles;
}> = ({ title, actionLabel, onAction, styles }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {actionLabel && onAction ? (
      <Pressable onPress={onAction} accessibilityRole="button">
        <Text style={styles.sectionAction}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

const SkeletonList: React.FC<{ styles: Styles }> = ({ styles }) => (
  <View style={styles.skeletonStack}>
    <View style={styles.skeletonCard} />
    <View style={styles.skeletonCard} />
  </View>
);

const EmptyState: React.FC<{
  styles: Styles;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ styles, title, message, actionLabel, onAction }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {actionLabel && onAction ? (
      <Button label={actionLabel} onPress={onAction} variant="secondary" />
    ) : null}
  </View>
);

const formatSessionSchedule = (session: SessionSummary): string => {
  try {
    if (!session.scheduledStartTime || !session.scheduledEndTime) {
      return '';
    }
    const start = new Date(session.scheduledStartTime);
    const end = new Date(session.scheduledEndTime);

    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return '';
    }

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
  } catch (error) {
    return '';
  }
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    header: {
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
      position: 'relative',
    },
    heroBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    heroBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 1,
    },
    heading: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subheading: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    statPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
    },
    statLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    refreshButton: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.md,
      width: 36,
      height: 36,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filters: {
      gap: spacing.md,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: spacing.xs,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.md,
      fontSize: 16,
      color: colors.textPrimary,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    chipLabelActive: {
      color: colors.textOnPrimary,
    },
    section: {
      gap: spacing.md,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
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
    card: {
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardActive: {
      borderColor: colors.success,
      backgroundColor: colors.successLight,
    },
    cardHosting: {
      borderColor: colors.secondary,
      backgroundColor: colors.secondaryLight,
    },
    cardPressed: {
      opacity: 0.95,
      transform: [{ scale: 0.99 }],
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    sessionIcon: {
      width: 40,
      height: 40,
      borderRadius: borderRadius.md,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sessionIconJoined: {
      backgroundColor: colors.success,
    },
    sessionIconHosting: {
      backgroundColor: colors.secondary,
    },
    cardTitleArea: {
      flex: 1,
      gap: 4,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 22,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    metaText: {
      fontSize: 13,
      color: colors.textSecondary,
      flex: 1,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceAlt,
    },
    badgeLive: {
      backgroundColor: colors.successLight,
    },
    badgeWarning: {
      backgroundColor: colors.warningLight,
    },
    badgeHost: {
      backgroundColor: colors.secondaryLight,
    },
    badgeText: {
      fontSize: 11,
      color: colors.textMuted,
      fontWeight: '600',
    },
    cardAction: {
      marginTop: spacing.sm,
    },
    emptyState: {
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    emptyMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
      textAlign: 'center',
    },
    skeletonStack: {
      gap: spacing.md,
    },
    skeletonCard: {
      height: 140,
      borderRadius: borderRadius.xl,
      backgroundColor: colors.surfaceAlt,
      opacity: 0.4,
    },
  });

export default SessionsScreen;
