import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/ui/Screen';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { SessionsStackParamList } from '../../navigation/types';
import { sessionApi } from '../../api/sessions';
import { SessionSummary } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';

type Props = NativeStackScreenProps<SessionsStackParamList, 'SessionDetails'>;
type Styles = ReturnType<typeof createStyles>;

const SessionDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { sessionId } = route.params;
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();

  const {
    data: session,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['sessions', 'details', sessionId],
    queryFn: () => sessionApi.getById(sessionId),
  });

  const { data: statusData } = useQuery({
    queryKey: ['sessions', 'status', sessionId],
    queryFn: () => sessionApi.myStatus(sessionId),
  });

  const {
    data: participants = [],
    isLoading: loadingParticipants,
    refetch: refetchParticipants,
  } = useQuery({
    queryKey: ['sessions', 'participants', sessionId],
    queryFn: () => sessionApi.participants(sessionId),
  });

  const joinMutation = useMutation({
    mutationFn: () => sessionApi.join(sessionId),
    onSuccess: () => {
      showToast('Joined session', 'success');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refetch();
      refetchParticipants();
      // Navigate to session room after joining
      navigation.navigate('SessionRoom', { 
        sessionId, 
        sessionTitle: session?.title || 'Session' 
      });
    },
    onError: error => {
      const apiError = mapApiError(error);
      // Handle 409 Conflict (already joined) gracefully - also navigate to room
      if (apiError.status === 409) {
        showToast('Already joined this session', 'info');
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        refetch();
        refetchParticipants();
        // Navigate to session room even if already joined
        navigation.navigate('SessionRoom', { 
          sessionId, 
          sessionTitle: session?.title || 'Session' 
        });
      } else {
        showToast(apiError.message, 'error');
      }
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => sessionApi.leave(sessionId),
    onSuccess: () => {
      showToast('Left session', 'info');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      refetch();
      refetchParticipants();
    },
    onError: error => {
      const apiError = mapApiError(error);
      showToast(apiError.message, 'error');
    },
  });

  const actionPending = joinMutation.isPending || leaveMutation.isPending;
  const isJoined = statusData?.status?.toUpperCase() === 'JOINED';
  const canJoin = statusData?.canJoin ?? true;

  const handleToggleJoin = () => {
    if (isJoined) {
      leaveMutation.mutate();
    } else {
      joinMutation.mutate();
    }
  };

  const handleOpenLink = async () => {
    if (!session?.sessionLink) {
      return;
    }
    try {
      const supported = await Linking.canOpenURL(session.sessionLink);
      if (supported) {
        await Linking.openURL(session.sessionLink);
      } else {
        showToast('Could not open the session link on this device', 'error');
      }
    } catch (linkError) {
      showToast('Failed to open the session link', 'error');
    }
  };

  if (isLoading && !session) {
    return (
      <Screen>
        <DetailsSkeleton styles={styles} />
      </Screen>
    );
  }

  if (error && !session) {
    const apiError = mapApiError(error);
    return (
      <Screen>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to load session</Text>
          <Text style={styles.errorMessage}>{apiError.message}</Text>
          <Button label="Retry" onPress={() => refetch()} />
        </View>
      </Screen>
    );
  }

  if (!session) {
    return (
      <Screen>
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Session unavailable</Text>
          <Text style={styles.errorMessage}>This live session could not be found. It might have been removed or is no longer active.</Text>
          <Button label="Refresh" onPress={() => refetch()} variant="secondary" />
        </View>
      </Screen>
    );
  }

  const schedule = formatSessionSchedule(session) || '';
  const duration = formatDuration(session) || '';
  const primaryActionLabel = isJoined ? 'Leave session' : 'Join session';
  const actionDisabled = actionPending || (!isJoined && !canJoin);
  
  // Check if user can enter the session room
  const isSessionHost = session.expert?.id === user?.id;
  const canEnterRoom = isJoined || isSessionHost;
  const sessionIsLive = session.status === 'In Progress' || session.statusKey === 'IN_PROGRESS';

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>{session.title || ''}</Text>
        <Text style={styles.schedule}>{schedule || ''}</Text>
        <View style={styles.badgeRow}>
          {session.sessionType ? (
            <View style={styles.badge}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={styles.badgeText}>{session.sessionType || ''}</Text>
            </View>
          ) : null}
          {session.status ? (
            <View style={[styles.badge, sessionIsLive && styles.badgeLive]}>
              <Ionicons
                name={sessionIsLive ? 'radio-button-on' : 'radio-button-on-outline'}
                size={14}
                color={sessionIsLive ? colors.success : colors.textMuted}
              />
              <Text style={[styles.badgeText, sessionIsLive && { color: colors.success }]}>
                {session.status || ''}
              </Text>
            </View>
          ) : null}
          {duration ? (
            <View style={styles.badge}>
              <Ionicons name="hourglass-outline" size={14} color={colors.textMuted} />
              <Text style={styles.badgeText}>{duration || ''}</Text>
            </View>
          ) : null}
        </View>

        {/* Enter Room Button - prominent when session is live */}
        {canEnterRoom && (
          <Button
            label={sessionIsLive ? 'Join Room Now' : 'Enter Waiting Room'}
            icon={sessionIsLive ? 'videocam' : 'enter-outline'}
            onPress={() => navigation.navigate('SessionRoom', { sessionId, sessionTitle: session.title })}
            variant="primary"
            style={styles.heroAction}
          />
        )}

        {/* Join/Leave button */}
        {!isSessionHost && (
          <Button
            label={primaryActionLabel}
            onPress={handleToggleJoin}
            loading={actionPending}
            disabled={actionDisabled}
            variant={isJoined ? 'ghost' : 'secondary'}
            style={styles.heroAction}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Session info</Text>
        <InfoRow icon="time-outline" label="When" value={schedule} styles={styles} colors={colors} />
        {session.course ? (
          <InfoRow
            icon="school-outline"
            label="Course"
            value={[session.course?.code, session.course?.name].filter(Boolean).join(' ') || ''}
            styles={styles}
            colors={colors}
          />
        ) : null}
        {session.group ? (
          <InfoRow icon="people-outline" label="Group" value={session.group.name || ''} styles={styles} colors={colors} />
        ) : null}
        {session.expert ? (
          <InfoRow
            icon="briefcase-outline"
            label="Expert"
            value={session.expert.fullName ?? `Expert ${session.expert.id}`}
            styles={styles}
            colors={colors}
          />
        ) : null}
        <InfoRow
          icon="person"
          label="Capacity"
          value={`${session.currentParticipants ?? 0}/${session.maxParticipants ?? 0} participants`}
          styles={styles}
          colors={colors}
        />
      </View>

      {session.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.bodyText}>{session.description || ''}</Text>
        </View>
      ) : null}

      {session.agenda ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agenda</Text>
          <Text style={styles.bodyText}>{session.agenda || ''}</Text>
        </View>
      ) : null}

      {session.resources ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>
          <Text style={styles.bodyText}>{session.resources}</Text>
        </View>
      ) : null}

      {session.sessionLink ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Join link</Text>
          <Pressable style={styles.linkPill} onPress={handleOpenLink} accessibilityRole="button">
            <Ionicons name="link-outline" size={16} color={colors.primary} />
            <Text style={styles.linkText}>Open session room</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Participants</Text>
          <Text style={styles.sectionSubtitle}>{`${participants.length} attending`}</Text>
        </View>
        {loadingParticipants ? (
          <ActivityIndicator color={colors.primary} />
        ) : participants.length ? (
          <View style={styles.participantList}>
            {participants.map(participant => (
              <View key={participant.id} style={styles.participantRow}>
                <View style={styles.avatarStub}>
                  <Text style={styles.avatarText}>{participant.fullName?.charAt(0) ?? participant.username.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.participantName}>{participant.fullName ?? participant.username}</Text>
                  <Text style={styles.participantMeta}>{participant.role ?? 'STUDENT'}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.bodyText}>Be the first to join this session and start the conversation.</Text>
        )}
      </View>

      {isRefetching ? <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} /> : null}
    </Screen>
  );
};

const InfoRow: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; value: string; styles: Styles; colors: Palette }> = ({
  icon,
  label,
  value,
  styles,
  colors,
}) => (
  <View style={styles.infoRow}>
    <Ionicons name={icon} size={16} color={colors.textSecondary} style={styles.infoIcon} />
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || ''}</Text>
    </View>
  </View>
);

const DetailsSkeleton: React.FC<{ styles: Styles }> = ({ styles }) => (
  <View style={styles.skeletonStack}>
    <View style={styles.skeletonHero} />
    <View style={styles.skeletonBlock} />
    <View style={styles.skeletonBlock} />
    <View style={styles.skeletonBlock} />
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

const formatDuration = (session: SessionSummary) => {
  const start = new Date(session.scheduledStartTime);
  const end = new Date(session.scheduledEndTime);
  const diffMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  if (!diffMinutes) {
    return null;
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (!minutes) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }
  return `${hours} hr${hours > 1 ? 's' : ''} ${minutes} min`;
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    hero: {
      borderRadius: 24,
      padding: spacing.lg,
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    schedule: {
      fontSize: 15,
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
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    badgeLive: {
      backgroundColor: `${colors.success}15`,
      borderColor: colors.success,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textMuted,
    },
    heroAction: {
      marginTop: spacing.sm,
    },
    heroActionLive: {
      backgroundColor: colors.success,
    },
    section: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontSize: typography.subheading,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    bodyText: {
      fontSize: 15,
      lineHeight: 22,
      color: colors.textSecondary,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xs,
    },
    infoIcon: {
      width: 24,
    },
    infoLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    infoValue: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    linkPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    linkText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    participantList: {
      gap: spacing.sm,
    },
    participantRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.xs,
    },
    avatarStub: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    participantName: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    participantMeta: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    errorCard: {
      borderRadius: 22,
      padding: spacing.lg,
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    errorTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    errorMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    skeletonStack: {
      gap: spacing.md,
    },
    skeletonHero: {
      height: 160,
      borderRadius: 24,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      opacity: 0.5,
    },
    skeletonBlock: {
      height: 90,
      borderRadius: 20,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      opacity: 0.5,
    },
  });

export default SessionDetailsScreen;
