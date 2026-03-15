import React, { useMemo, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { SessionsStackParamList } from '../../navigation/types';
import { sessionRequestApi, SessionRequest } from '../../api/experts';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';

type Navigation = NativeStackNavigationProp<SessionsStackParamList>;
type Styles = ReturnType<typeof createStyles>;

const SessionRequestsScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>('');

  const {
    data: requests = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['sessionRequests', 'mine'],
    queryFn: sessionRequestApi.getMyRequests,
  });

  const cancelMutation = useMutation({
    mutationFn: sessionRequestApi.cancelRequest,
    onSuccess: () => {
      showToast('Session request cancelled', 'success');
      queryClient.invalidateQueries({ queryKey: ['sessionRequests'] });
    },
    onError: (error) => {
      showToast(mapApiError(error).message, 'error');
    },
  });

  const filteredRequests = useMemo(() => {
    if (!filterStatus) return requests;
    return requests.filter((r) => r.status === filterStatus);
  }, [requests, filterStatus]);

  const handleCancelRequest = useCallback(
    (requestId: number) => {
      Alert.alert('Cancel Request', 'Are you sure you want to cancel this session request?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(requestId),
        },
      ]);
    },
    [cancelMutation]
  );

  const getStatusBadge = useCallback(
    (status: string) => {
      const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: keyof typeof Ionicons.glyphMap }> = {
        PENDING: {
          label: 'Pending',
          color: colors.warning || '#F59E0B',
          bgColor: colors.warning + '26' || '#FEF3C7',
          icon: 'time-outline',
        },
        APPROVED: {
          label: 'Approved',
          color: colors.success,
          bgColor: colors.success + '26',
          icon: 'checkmark-circle',
        },
        REJECTED: {
          label: 'Rejected',
          color: colors.error,
          bgColor: colors.error + '26',
          icon: 'close-circle',
        },
        COUNTER_PROPOSED: {
          label: 'Counter Proposed',
          color: colors.primary,
          bgColor: colors.primaryLight,
          icon: 'swap-horizontal',
        },
        CANCELLED: {
          label: 'Cancelled',
          color: colors.textMuted,
          bgColor: colors.surfaceAlt,
          icon: 'ban',
        },
      };
      const config = statusConfig[status] || statusConfig.PENDING;
      return (
        <View style={[styles.statusBadge, { backgroundColor: config.bgColor, borderColor: config.color }]}>
          <Ionicons name={config.icon} size={12} color={config.color} />
          <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
        </View>
      );
    },
    [colors, styles]
  );

  const formatDateTime = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  }, []);

  const renderRequest = useCallback(
    ({ item: request }: { item: SessionRequest }) => {
      return (
        <View style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.requestHeader}>
            <View style={styles.requestTitleRow}>
              <Text style={[styles.requestTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                {request.title}
              </Text>
              {getStatusBadge(request.status)}
            </View>
          </View>

          <View style={styles.requestMeta}>
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                {request.expert?.fullName || request.expert?.username || 'Expert'}
              </Text>
            </View>
            {request.course && (
              <View style={styles.metaRow}>
                <Ionicons name="book-outline" size={14} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {[request.course.code, request.course.name].filter(Boolean).join(' - ')}
                </Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {new Date(request.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {request.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
              {request.description}
            </Text>
          )}

          {request.agenda && (
            <View style={styles.agendaSection}>
              <Text style={[styles.agendaLabel, { color: colors.textPrimary }]}>Agenda:</Text>
              <Text style={[styles.agendaText, { color: colors.textSecondary }]}>{request.agenda}</Text>
            </View>
          )}

          {request.preferredTimeSlots && request.preferredTimeSlots.length > 0 && (
            <View style={styles.timeSlotsSection}>
              <Text style={[styles.timeSlotsLabel, { color: colors.textPrimary }]}>Preferred Times:</Text>
              {request.preferredTimeSlots.slice(0, 2).map((slot, index) => (
                <View key={index} style={styles.timeSlotRow}>
                  <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.timeSlotText, { color: colors.textSecondary }]}>
                    {formatDateTime(slot.start)} - {formatDateTime(slot.end)}
                  </Text>
                </View>
              ))}
              {request.preferredTimeSlots.length > 2 && (
                <Text style={[styles.moreTimes, { color: colors.textMuted }]}>
                  +{request.preferredTimeSlots.length - 2} more
                </Text>
              )}
            </View>
          )}

          {request.chosenStart && request.chosenEnd && (
            <View style={[styles.scheduledTimeCard, { backgroundColor: colors.success + '26', borderColor: colors.success }]}>
              <Text style={[styles.scheduledTimeLabel, { color: colors.success }]}>Scheduled Time:</Text>
              <Text style={[styles.scheduledTimeText, { color: colors.success }]}>
                {formatDateTime(request.chosenStart)} - {formatDateTime(request.chosenEnd)}
              </Text>
            </View>
          )}

          {request.expertResponseMessage && (
            <View style={[styles.responseCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Text style={[styles.responseLabel, { color: colors.primary }]}>Expert Response:</Text>
              <Text style={[styles.responseText, { color: colors.textPrimary }]}>{request.expertResponseMessage}</Text>
            </View>
          )}

          {request.rejectionReason && (
            <View style={[styles.responseCard, { backgroundColor: colors.error + '26', borderColor: colors.error }]}>
              <Text style={[styles.responseLabel, { color: colors.error }]}>Rejection Reason:</Text>
              <Text style={[styles.responseText, { color: colors.textPrimary }]}>{request.rejectionReason}</Text>
            </View>
          )}

          {request.createdSessionId && (
            <Button
              label="View Session"
              onPress={() => navigation.navigate('SessionDetails', { sessionId: request.createdSessionId! })}
              variant="primary"
              size="sm"
            />
          )}

          {request.status === 'PENDING' && (
            <View style={styles.actionsRow}>
              <Button
                label="Cancel Request"
                onPress={() => handleCancelRequest(request.id)}
                variant="danger"
                size="sm"
                disabled={cancelMutation.isPending}
              />
            </View>
          )}
        </View>
      );
    },
    [colors, styles, getStatusBadge, formatDateTime, handleCancelRequest, cancelMutation, navigation]
  );

  const statusFilters = ['', 'PENDING', 'APPROVED', 'COUNTER_PROPOSED', 'REJECTED'];
  const statusLabels: Record<string, string> = {
    '': 'All',
    PENDING: 'Pending',
    APPROVED: 'Approved',
    COUNTER_PROPOSED: 'Counter Proposed',
    REJECTED: 'Rejected',
  };

  const getStatusCount = (status: string) => {
    if (!status) return requests.length;
    return requests.filter((r) => r.status === status).length;
  };

  if (isLoading && requests.length === 0) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading session requests...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      {/* Header */}
      <LinearGradient
        colors={[colors.heroGradientStart, colors.heroGradientMid, colors.heroGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View>
            <View style={styles.heroBadge}>
              <Ionicons name="calendar" size={14} color={colors.primary} />
              <Text style={[styles.heroBadgeText, { color: colors.primary }]}>SESSION REQUESTS</Text>
            </View>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>My Session Requests</Text>
          </View>
        </View>
        <Text style={[styles.subheading, { color: colors.textSecondary }]}>
          View and manage your session requests with experts
        </Text>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusFilters}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const count = getStatusCount(item);
            const isActive = filterStatus === item;
            return (
              <Pressable
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.primary : colors.surfaceAlt,
                    borderColor: isActive ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFilterStatus(item)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isActive ? colors.textOnPrimary : colors.textSecondary,
                      fontWeight: isActive ? '700' : '600',
                    },
                  ]}
                >
                  {statusLabels[item]} ({count})
                </Text>
              </Pressable>
            );
          }}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {filterStatus ? `No ${statusLabels[filterStatus].toLowerCase()} requests` : 'No session requests found'}
          </Text>
          <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
            {filterStatus
              ? `You don't have any ${statusLabels[filterStatus].toLowerCase()} session requests`
              : "You haven't requested any sessions yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderRequest}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        />
      )}
    </Screen>
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
    filtersContainer: {
      marginTop: spacing.lg,
    },
    filtersList: {
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      borderWidth: 1,
    },
    filterChipText: {
      fontSize: 13,
    },
    listContent: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
    },
    separator: {
      height: spacing.md,
    },
    requestCard: {
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      gap: spacing.md,
    },
    requestHeader: {
      gap: spacing.sm,
    },
    requestTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    requestTitle: {
      flex: 1,
      fontSize: 18,
      fontWeight: '700',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs / 2,
      borderRadius: borderRadius.full,
      borderWidth: 1,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
    },
    requestMeta: {
      gap: spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    metaText: {
      fontSize: 13,
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
    },
    agendaSection: {
      gap: spacing.xs,
    },
    agendaLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    agendaText: {
      fontSize: 13,
      lineHeight: 18,
    },
    timeSlotsSection: {
      gap: spacing.xs,
    },
    timeSlotsLabel: {
      fontSize: 13,
      fontWeight: '600',
    },
    timeSlotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    timeSlotText: {
      fontSize: 12,
    },
    moreTimes: {
      fontSize: 11,
      fontStyle: 'italic',
      marginLeft: spacing.md,
    },
    scheduledTimeCard: {
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      gap: spacing.xs,
    },
    scheduledTimeLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    scheduledTimeText: {
      fontSize: 13,
      fontWeight: '600',
    },
    responseCard: {
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      gap: spacing.xs,
    },
    responseLabel: {
      fontSize: 12,
      fontWeight: '700',
    },
    responseText: {
      fontSize: 13,
      lineHeight: 18,
    },
    actionsRow: {
      marginTop: spacing.sm,
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
  });

export default SessionRequestsScreen;

