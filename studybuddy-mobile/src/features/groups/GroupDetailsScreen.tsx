import React, { useLayoutEffect, useMemo } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/ui/Screen';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { groupApi } from '../../api/groups';
import { calendarApi, Event as CalendarEvent } from '../../api/calendar';
import { GroupMemberRequest, StudyGroup } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { GroupsStackParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthContext';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<GroupsStackParamList, 'GroupDetails'>;

const GroupDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { groupId } = route.params;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    data: group,
    isLoading: loadingGroup,
    isFetching: refreshingGroup,
  } = useQuery({
    queryKey: ['groups', 'detail', groupId],
    queryFn: () => groupApi.getById(groupId),
  });

  const {
    data: status,
    isLoading: loadingStatus,
  } = useQuery({
    queryKey: ['groups', 'status', groupId],
    queryFn: () => groupApi.myStatus(groupId),
  });

  const {
    data: pendingRequests,
    isLoading: loadingPending,
  } = useQuery({
    queryKey: ['groups', 'pending', groupId],
    queryFn: () => groupApi.pendingRequests(groupId),
    enabled: !!status?.isCreator,
  });

  const {
    data: groupEvents,
    isLoading: loadingEvents,
  } = useQuery({
    queryKey: ['groups', 'events', groupId],
    queryFn: () => calendarApi.getUpcomingGroupEvents(groupId),
    enabled: !!status?.isMember,
  });

  useLayoutEffect(() => {
    if (group?.name) {
      navigation.setOptions({ title: group.name });
    }
  }, [group?.name, navigation]);

  const invalidateGroupQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['groups', 'detail', groupId] });
    queryClient.invalidateQueries({ queryKey: ['groups', 'status', groupId] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  };

  const joinMutation = useMutation({
    mutationFn: () => groupApi.join(groupId),
    onSuccess: () => {
      showToast('You joined the group', 'success');
      invalidateGroupQueries();
    },
    onError: error => showToast(mapApiError(error).message, 'error'),
  });

  const requestJoinMutation = useMutation({
    mutationFn: () => groupApi.requestJoin(groupId),
    onSuccess: () => {
      showToast('Join request sent', 'info');
      invalidateGroupQueries();
    },
    onError: error => showToast(mapApiError(error).message, 'error'),
  });

  const leaveMutation = useMutation({
    mutationFn: () => groupApi.leave(groupId),
    onSuccess: () => {
      showToast('You left the group', 'info');
      invalidateGroupQueries();
    },
    onError: error => showToast(mapApiError(error).message, 'error'),
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (requestId: number) => groupApi.acceptRequest(requestId),
    onSuccess: () => {
      showToast('Request approved', 'success');
      invalidateGroupQueries();
      queryClient.invalidateQueries({ queryKey: ['groups', 'pending', groupId] });
    },
    onError: error => showToast(mapApiError(error).message, 'error'),
  });

  const rejectRequestMutation = useMutation({
    mutationFn: (requestId: number) => groupApi.rejectRequest(requestId),
    onSuccess: () => {
      showToast('Request declined', 'info');
      queryClient.invalidateQueries({ queryKey: ['groups', 'pending', groupId] });
    },
    onError: error => showToast(mapApiError(error).message, 'error'),
  });

  const isPrimaryBusy = joinMutation.isPending || requestJoinMutation.isPending || leaveMutation.isPending;

  if (loadingGroup || loadingStatus) {
    return (
      <Screen>
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </Screen>
    );
  }

  if (!group || !status) {
    return (
      <Screen>
        <View style={styles.loadingState}>
          <Text style={styles.errorText}>We could not load that group. Please try again later.</Text>
        </View>
      </Screen>
    );
  }

  const memberList = group.members ?? [];

  let primaryLabel = 'Unavailable';
  let primaryVariant: 'primary' | 'secondary' = 'primary';
  let primaryDisabled = false;
  let primaryHandler: (() => void) | undefined;

  if (status?.isMember) {
    if (status?.isCreator) {
      primaryLabel = 'You manage this group';
      primaryVariant = 'secondary';
      primaryDisabled = true;
    } else {
      primaryLabel = 'Leave group';
      primaryVariant = 'secondary';
      primaryDisabled = isPrimaryBusy;
      primaryHandler = () => leaveMutation.mutate();
    }
  } else if (status?.hasPendingRequest) {
    primaryLabel = 'Awaiting approval';
    primaryVariant = 'secondary';
    primaryDisabled = true;
  } else if (status?.canJoin) {
    primaryLabel = 'Join now';
    primaryVariant = 'primary';
    primaryDisabled = isPrimaryBusy;
    primaryHandler = () => joinMutation.mutate();
  } else if (status?.canRequestJoin) {
    primaryLabel = 'Request access';
    primaryVariant = 'primary';
    primaryDisabled = isPrimaryBusy;
    primaryHandler = () => requestJoinMutation.mutate();
  } else {
    primaryLabel = 'Invite only';
    primaryVariant = 'secondary';
    primaryDisabled = true;
  }

  const primaryLoading = isPrimaryBusy && !!primaryHandler;
  const joinRequests = (pendingRequests ?? []).filter(request => request.requestType === 'JOIN_REQUEST');

  const renderMember = ({ item }: { item: NonNullable<StudyGroup['members']>[number] }) => (
    <View style={styles.memberCard}>
      <View>
        <Text style={styles.memberName}>{item.fullName ?? item.username}</Text>
        {item.id === group.creator.id ? <Text style={styles.memberMeta}>Group owner</Text> : null}
        {item.id === user?.id ? <Text style={styles.memberMeta}>You</Text> : null}
      </View>
    </View>
  );

  const renderRequest = ({ item }: { item: GroupMemberRequest }) => (
    <View style={styles.requestCard}>
      {/* Avatar placeholder */}
      <View style={styles.requestAvatar}>
        <Ionicons name="person" size={24} color={colors.textMuted} />
      </View>
      {/* User info */}
      <View style={styles.requestInfo}>
        <Text style={styles.memberName}>{item.user.fullName || item.user.username || 'User'}</Text>
        {item.message ? <Text style={styles.memberMeta} numberOfLines={2}>{item.message}</Text> : null}
        <Text style={styles.requestDate}>Requested {new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      {/* Action buttons - vertical layout */}
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.requestActionBtn, styles.requestApproveBtn]}
          onPress={() => acceptRequestMutation.mutate(item.id)}
          disabled={acceptRequestMutation.isPending}
        >
          <Ionicons name="checkmark" size={18} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.requestActionBtn, styles.requestDeclineBtn]}
          onPress={() => rejectRequestMutation.mutate(item.id)}
          disabled={rejectRequestMutation.isPending}
        >
          <Ionicons name="close" size={18} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Screen scrollable={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>{group.name || ''}</Text>
          <Text style={styles.subtitle}>
            {[group.course?.code, group.course?.name].filter(Boolean).join(' ') || 'Course'} · {group.visibility || 'Unknown'}
          </Text>
          {status?.isCreator ? <Text style={styles.helper}>You created this group.</Text> : null}
          {group.topic ? <Text style={styles.helper}>{group.topic}</Text> : null}
          {group.description ? <Text style={styles.description}>{group.description}</Text> : null}
          
          {/* Action buttons row */}
          <View style={styles.actionButtonsRow}>
            {status?.isMember && !status?.isCreator ? (
              <Button
                label={primaryLabel}
                onPress={primaryHandler ?? (() => {})}
                variant={primaryVariant}
                disabled={primaryDisabled}
                loading={primaryLoading}
                style={styles.actionButton}
                icon="exit-outline"
              />
            ) : !status?.isMember ? (
              <Button
                label={primaryLabel}
                onPress={primaryHandler ?? (() => {})}
                variant={primaryVariant}
                disabled={primaryDisabled}
                loading={primaryLoading}
                style={styles.actionButton}
                icon="enter-outline"
              />
            ) : null}
            {status?.isMember ? (
              <Button
                label="Group Chat"
                onPress={() => navigation.navigate('GroupChat', { groupId, groupName: group.name || '' })}
                style={styles.actionButton}
                icon="chatbubbles-outline"
                variant="secondary"
              />
            ) : null}
          </View>
          
          <View style={styles.metaRow}>
            <Badge text={`Members ${group.memberCount ?? memberList.length}`} styles={styles} />
            <Badge text={`Created ${group.createdAt ? new Date(group.createdAt).toLocaleDateString() : ''}`} styles={styles} />
            {refreshingGroup ? <ActivityIndicator color={colors.primary} /> : null}
          </View>
        </View>

        <Section
          title="Members"
          isEmpty={!memberList.length}
          emptyMessage="No members yet."
          colors={colors}
          styles={styles}
        >
          <FlatList
            data={memberList}
            keyExtractor={item => item.id.toString()}
            renderItem={renderMember}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
          />
        </Section>

        {status?.isCreator ? (
          <Section
            title="Pending requests"
            loading={loadingPending}
            isEmpty={!joinRequests.length}
            emptyMessage="No pending join requests."
            colors={colors}
            styles={styles}
          >
            <FlatList
              data={joinRequests}
              keyExtractor={item => item.id.toString()}
              renderItem={renderRequest}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
            />
          </Section>
        ) : null}

        {status?.isMember ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            {loadingEvents ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                {groupEvents && groupEvents.length > 0 ? (
                  (groupEvents || []).slice(0, 3).map((event: CalendarEvent) => (
                    <EventCard key={event.id} event={event} styles={styles} colors={colors} />
                  ))
                ) : (
                  <Text style={styles.helper}>No upcoming events scheduled.</Text>
                )}
                <TouchableOpacity
                  style={styles.createEventButton}
                  onPress={() => navigation.navigate('CreateEvent', { groupId, groupName: group.name })}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.createEventText}>Create Event</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        <Section
          title="House rules"
          isEmpty={!group.topic && !group.description}
          emptyMessage="No guidelines posted yet."
          colors={colors}
          styles={styles}
        >
          <Text style={styles.helper}>Come prepared, support each other, and keep discussions on-topic.</Text>
        </Section>
      </ScrollView>
    </Screen>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      gap: spacing.xl,
      paddingBottom: spacing.xl,
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    errorText: {
      fontSize: typography.body,
      color: colors.error,
      textAlign: 'center',
    },
    hero: {
      gap: spacing.sm,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    description: {
      fontSize: typography.body,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    helper: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    actionButtonsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    actionButton: {
      flex: 1,
      minWidth: 0,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
      alignItems: 'center',
    },
    badge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
    },
    badgeText: {
      fontSize: 12,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    section: {
      gap: spacing.sm,
    },
    sectionTitle: {
      fontSize: typography.subheading,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    memberCard: {
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    memberName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    memberMeta: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    requestCard: {
      flexDirection: 'row',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    requestAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    requestInfo: {
      flex: 1,
      gap: 2,
    },
    requestDate: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    requestActions: {
      flexDirection: 'column',
      gap: spacing.xs,
    },
    requestActionBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    requestApproveBtn: {
      backgroundColor: colors.success,
    },
    requestDeclineBtn: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    eventCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderLeftWidth: 3,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.xs,
    },
    eventIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eventContent: {
      flex: 1,
    },
    eventTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    eventMeta: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    eventLocation: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    createEventButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.md,
      marginTop: spacing.sm,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      borderStyle: 'dashed',
    },
    createEventText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
  });

type Styles = ReturnType<typeof createStyles>;

type SectionProps = {
  title: string;
  loading?: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
  styles: Styles;
  colors: Palette;
};

const Section: React.FC<SectionProps> = ({ title, loading = false, isEmpty, emptyMessage, children, styles, colors }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {loading ? (
      <ActivityIndicator color={colors.primary} />
    ) : isEmpty ? (
      <Text style={styles.helper}>{emptyMessage}</Text>
    ) : (
      children
    )}
  </View>
);

const Badge: React.FC<{ text: string; styles: Styles }> = ({ text, styles }) => (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>{text}</Text>
  </View>
);

const getEventTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'STUDY_SESSION': return 'book-outline';
    case 'MEETING': return 'people-outline';
    case 'DEADLINE': return 'alarm-outline';
    case 'EXAM': return 'document-text-outline';
    default: return 'calendar-outline';
  }
};

const getEventTypeColor = (type: string): string => {
  switch (type) {
    case 'STUDY_SESSION': return '#10B981';
    case 'MEETING': return '#6366F1';
    case 'DEADLINE': return '#F59E0B';
    case 'EXAM': return '#EF4444';
    default: return '#8B5CF6';
  }
};

const EventCard: React.FC<{ event: CalendarEvent; styles: Styles; colors: Palette }> = ({ event, styles, colors }) => {
  const eventDate = new Date(event.startDateTime);
  const typeColor = getEventTypeColor(event.eventType);
  
  return (
    <View style={[styles.eventCard, { borderLeftColor: typeColor }]}>
      <View style={[styles.eventIconContainer, { backgroundColor: typeColor + '20' }]}>
        <Ionicons name={getEventTypeIcon(event.eventType)} size={18} color={typeColor} />
      </View>
      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventMeta}>
          {eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </Text>
        {event.location && <Text style={styles.eventLocation}>{event.location}</Text>}
      </View>
    </View>
  );
};

export default GroupDetailsScreen;
