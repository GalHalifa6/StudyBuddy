import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { Screen } from '../../components/ui/Screen';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { expertsApi, sessionRequestApi, SessionRequest } from '../../api/experts';
import {
  ExpertDashboardStats,
  ExpertDashboardSummary,
  ExpertManagedSession,
  ExpertQuestionItem,
  ExpertReview,
} from '../../api/types';
import { ExpertsStackParamList } from '../../navigation/types';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';

 type Navigation = NativeStackNavigationProp<ExpertsStackParamList>;

const ExpertDashboardScreen: React.FC = () => {
   const navigation = useNavigation<Navigation>();
   const { user } = useAuth();
   const { colors } = useAppTheme();
   const styles = useMemo(() => createStyles(colors), [colors]);
   const { showToast } = useToast();
   const queryClient = useQueryClient();
   const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: 'Expert workspace' });
  }, [navigation]);

  const dashboardQuery = useQuery<ExpertDashboardSummary | undefined>({
    queryKey: ['experts', 'dashboard'],
    queryFn: async () => {
      try {
        return await expertsApi.dashboard();
      } catch (error) {
        const status = (error as AxiosError)?.response?.status;
        if (status && status >= 400 && status < 500) {
          return undefined;
        }
        throw error;
      }
    },
    retry: (failureCount, error) => {
      const status = (error as AxiosError)?.response?.status;
      if (status && status >= 400 && status < 500) {
        return false;
      }
      return failureCount < 2;
    },
  });

   const sessionsQuery = useQuery({
     queryKey: ['experts', 'my-sessions'],
     queryFn: expertsApi.mySessions,
   });

   const questionsQuery = useQuery({
     queryKey: ['experts', 'pending-questions'],
     queryFn: expertsApi.pendingQuestions,
   });

   const reviewsQuery = useQuery({
     queryKey: ['experts', 'my-reviews'],
     queryFn: expertsApi.myReviews,
   });

   const sessionRequestsQuery = useQuery({
     queryKey: ['experts', 'session-requests'],
     queryFn: () => sessionRequestApi.getExpertRequests('PENDING'),
   });

   const startSessionMutation = useMutation({
     mutationFn: (sessionId: number) => expertsApi.startSession(sessionId),
     onSuccess: () => {
       showToast('Session marked as live', 'success');
       queryClient.invalidateQueries({ queryKey: ['experts', 'dashboard'] });
       queryClient.invalidateQueries({ queryKey: ['experts', 'my-sessions'] });
     },
     onError: error => showToast(mapApiError(error).message, 'error'),
   });

   const completeSessionMutation = useMutation({
     mutationFn: (sessionId: number) => expertsApi.completeSession(sessionId),
     onSuccess: () => {
       showToast('Session completed', 'success');
       queryClient.invalidateQueries({ queryKey: ['experts', 'dashboard'] });
       queryClient.invalidateQueries({ queryKey: ['experts', 'my-sessions'] });
     },
     onError: error => showToast(mapApiError(error).message, 'error'),
   });

   const approveRequestMutation = useMutation({
     mutationFn: ({ requestId, payload }: { requestId: number; payload: { chosenStart: string; chosenEnd: string; message?: string } }) =>
       sessionRequestApi.approveRequest(requestId, payload),
     onSuccess: () => {
       showToast('Session request approved! A session has been created.', 'success');
       queryClient.invalidateQueries({ queryKey: ['experts', 'session-requests'] });
       queryClient.invalidateQueries({ queryKey: ['experts', 'my-sessions'] });
     },
     onError: error => showToast(mapApiError(error).message, 'error'),
   });

   const rejectRequestMutation = useMutation({
     mutationFn: ({ requestId, payload }: { requestId: number; payload: { reason: string } }) =>
       sessionRequestApi.rejectRequest(requestId, payload),
     onSuccess: () => {
       showToast('Session request rejected', 'success');
       queryClient.invalidateQueries({ queryKey: ['experts', 'session-requests'] });
     },
     onError: error => showToast(mapApiError(error).message, 'error'),
   });

  const stats: ExpertDashboardStats | undefined = dashboardQuery.data?.stats;
  const upcomingSessions: ExpertManagedSession[] = dashboardQuery.data?.upcomingSessions ?? sessionsQuery.data ?? [];
  const pendingQuestions: ExpertQuestionItem[] = dashboardQuery.data?.pendingQuestions ?? questionsQuery.data ?? [];
  const recentReviews: ExpertReview[] = dashboardQuery.data?.recentReviews ?? reviewsQuery.data ?? [];
  const pendingSessionRequests: SessionRequest[] = sessionRequestsQuery.data ?? [];

  const isLoading =
    !dashboardQuery.data &&
    !sessionsQuery.data &&
    !questionsQuery.data &&
    !reviewsQuery.data &&
    !sessionRequestsQuery.data &&
    (dashboardQuery.isLoading || sessionsQuery.isLoading || questionsQuery.isLoading || reviewsQuery.isLoading || sessionRequestsQuery.isLoading);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['experts', 'dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['experts', 'my-sessions'] }),
      queryClient.invalidateQueries({ queryKey: ['experts', 'pending-questions'] }),
      queryClient.invalidateQueries({ queryKey: ['experts', 'my-reviews'] }),
      queryClient.invalidateQueries({ queryKey: ['experts', 'session-requests'] }),
    ]);
    setRefreshing(false);
  };

  const SectionTitle = ({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) => (
    <View style={styles.sectionTitle}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <Text style={[styles.sectionTitleText, { color: colors.textPrimary }]}>{label}</Text>
    </View>
  );

  const StatPill = ({
    icon,
    label,
    value,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: number | string;
  }) => (
    <View style={[styles.statPill, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  const StatusBadge = ({ label, tone = 'default' }: { label: string; tone?: 'default' | 'info' }) => (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: tone === 'info' ? colors.surfaceAlt : colors.success + '26',
          borderColor: tone === 'info' ? colors.border : colors.success,
        },
      ]}
    >
      <Text
        style={[
          styles.statusText,
          { color: tone === 'info' ? colors.textSecondary : colors.success },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  const MetaItem = ({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) => (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  const ActionChip = ({
    icon,
    label,
    onPress,
    disabled = false,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    disabled?: boolean;
  }) => (
    <Pressable
      style={[
        styles.actionChip,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={16} color={colors.textPrimary} />
      <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );

   const renderSessions = () => {
     if (sessionsQuery.isLoading && !dashboardQuery.data?.upcomingSessions) {
       return <ActivityIndicator color={colors.primary} />;
     }

     if (!upcomingSessions.length) {
       return <Text style={styles.emptyCopy}>No sessions scheduled yet. Create one to help students.</Text>;
     }

     return upcomingSessions.slice(0, 5).map(session => (
       <View key={session.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
         <View style={styles.cardHeader}>
           <View style={styles.cardTitleWrap}>
             <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
               {session.title}
             </Text>
             <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
               {formatDateRange(session.scheduledStartTime, session.scheduledEndTime)}
             </Text>
           </View>
          <StatusBadge label={session.status} />
         </View>

         {session.description ? (
           <Text style={[styles.cardBody, { color: colors.textSecondary }]} numberOfLines={2}>
             {session.description}
           </Text>
         ) : null}

         <View style={styles.metaRow}>
          {session.course?.code ? (
            <MetaItem icon="book" label={session.course.code} />
          ) : null}
          {session.meetingPlatform ? (
            <MetaItem icon="laptop-outline" label={session.meetingPlatform} />
          ) : null}
           {typeof session.currentParticipants === 'number' && typeof session.maxParticipants === 'number' ? (
             <MetaItem
               icon="people"
               label={`${session.currentParticipants}/${session.maxParticipants} joined`}
             />
           ) : null}
         </View>

         <View style={styles.actionsRow}>
           {session.meetingLink ? (
            <ActionChip icon="link-outline" label="Open link" onPress={() => Linking.openURL(session.meetingLink!)} />
           ) : null}
           {(session.status === 'SCHEDULED' || (session as any).statusKey === 'SCHEDULED') ? (
             <ActionChip
               icon="play"
               label={startSessionMutation.isPending ? 'Starting…' : 'Start'}
               onPress={() => startSessionMutation.mutate(session.id)}
               disabled={startSessionMutation.isPending}
             />
           ) : null}
           {(session.status === 'IN_PROGRESS' || session.status === 'In Progress' || (session as any).statusKey === 'IN_PROGRESS') ? (
             <ActionChip
               icon="checkmark"
               label={completeSessionMutation.isPending ? 'Finishing…' : 'Complete'}
               onPress={() => completeSessionMutation.mutate(session.id)}
               disabled={completeSessionMutation.isPending}
             />
           ) : null}
         </View>
       </View>
     ));
   };

   const renderQuestions = () => {
     if (questionsQuery.isLoading && !dashboardQuery.data?.pendingQuestions) {
       return <ActivityIndicator color={colors.primary} />;
     }

     if (!pendingQuestions.length) {
       return <Text style={styles.emptyCopy}>No pending questions right now. Enjoy the breather!</Text>;
     }

     return pendingQuestions.slice(0, 5).map(question => (
       <View key={question.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
         <View style={styles.cardHeader}>
           <View style={styles.cardTitleWrap}>
             <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
               {question.title}
             </Text>
             <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
               Asked {new Date(question.createdAt).toLocaleString()}
             </Text>
           </View>
           <StatusBadge label={question.status} tone="info" />
         </View>

         <Text style={[styles.cardBody, { color: colors.textSecondary }]} numberOfLines={3}>
           {question.content}
         </Text>

         <View style={styles.metaRow}>
           {question.student?.fullName ? (
             <MetaItem icon="person" label={question.student.fullName} />
           ) : null}
           {question.course?.code ? (
             <MetaItem icon="school" label={question.course.code} />
           ) : null}
           {question.tags?.length ? (
             <MetaItem icon="pricetag" label={question.tags.slice(0, 2).join(', ')} />
           ) : null}
         </View>

         <View style={styles.actionsRow}>
           <ActionChip
             icon="create"
             label="Answer"
             onPress={() =>
               navigation.navigate('ExpertAnswerQuestion', {
                 questionId: question.id,
                 questionTitle: question.title,
               })
             }
           />
         </View>
       </View>
     ));
   };

   const renderReviews = () => {
     if (reviewsQuery.isLoading && !dashboardQuery.data?.recentReviews) {
       return <ActivityIndicator color={colors.primary} />;
     }

     if (!recentReviews.length) {
       return <Text style={styles.emptyCopy}>You have not received reviews yet. Sessions will surface feedback here.</Text>;
     }

     return recentReviews.slice(0, 5).map(review => (
       <View key={review.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
         <View style={styles.reviewHeader}>
           <View style={styles.ratingRow}>
             {Array.from({ length: 5 }).map((_, index) => (
               <Ionicons
                 key={index}
                 name={index < review.rating ? 'star' : 'star-outline'}
                 size={14}
                 color={index < review.rating ? colors.accent : colors.textMuted}
               />
             ))}
           </View>
           <Text style={[styles.reviewDate, { color: colors.textMuted }]}>{new Date(review.createdAt).toLocaleDateString()}</Text>
         </View>
         <Text style={[styles.cardBody, { color: colors.textPrimary }]} numberOfLines={3}>
           {review.review}
         </Text>
         <Text style={[styles.reviewAuthor, { color: colors.textSecondary }]}>
           {review.student?.fullName ?? review.student?.username ?? 'Anonymous learner'}
         </Text>
       </View>
     ));
   };

   const renderSessionRequests = () => {
     if (sessionRequestsQuery.isLoading) {
       return <ActivityIndicator color={colors.primary} />;
     }

     if (!pendingSessionRequests.length) {
       return <Text style={styles.emptyCopy}>No pending session requests. Check back later!</Text>;
     }

     return pendingSessionRequests.slice(0, 5).map(request => (
       <View key={request.id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
         <View style={styles.cardHeader}>
           <View style={styles.cardTitleWrap}>
             <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
               {request.title}
             </Text>
             <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
               From {request.student?.fullName || request.student?.username || 'Student'}
             </Text>
           </View>
           <StatusBadge label={request.status} tone="info" />
         </View>

         {request.description ? (
           <Text style={[styles.cardBody, { color: colors.textSecondary }]} numberOfLines={2}>
             {request.description}
           </Text>
         ) : null}

         <View style={styles.metaRow}>
           {request.course?.code ? (
             <MetaItem icon="book" label={request.course.code} />
           ) : null}
           <MetaItem icon="time" label={new Date(request.createdAt).toLocaleDateString()} />
         </View>

         {request.preferredTimeSlots && request.preferredTimeSlots.length > 0 && (
           <View style={styles.metaRow}>
             <Text style={[styles.metaText, { color: colors.textMuted }]}>
               {`${request.preferredTimeSlots.length} preferred time slot${request.preferredTimeSlots.length > 1 ? 's' : ''}`}
             </Text>
           </View>
         )}

         <View style={styles.actionsRow}>
           <ActionChip
             icon="checkmark-circle"
             label="Approve"
             onPress={() => {
               // For now, use the first preferred time slot if available
               // In a full implementation, you'd want a modal to select/confirm times
               if (request.preferredTimeSlots && request.preferredTimeSlots.length > 0) {
                 const slot = request.preferredTimeSlots[0];
                 Alert.alert(
                   'Approve Request',
                   `Approve session for ${new Date(slot.start).toLocaleString()} to ${new Date(slot.end).toLocaleString()}?`,
                   [
                     { text: 'Cancel', style: 'cancel' },
                     {
                       text: 'Approve',
                       onPress: () => {
                         approveRequestMutation.mutate({
                           requestId: request.id,
                           payload: {
                             chosenStart: slot.start,
                             chosenEnd: slot.end,
                           },
                         });
                       },
                     },
                   ]
                 );
               } else {
                 showToast('No preferred time slots available', 'error');
               }
             }}
           />
           <ActionChip
             icon="close-circle"
             label="Reject"
             onPress={() => {
               Alert.alert(
                 'Reject Request',
                 'This request will be rejected. The student will be notified.',
                 [
                   { text: 'Cancel', style: 'cancel' },
                   {
                     text: 'Reject',
                     style: 'destructive',
                     onPress: () => {
                       rejectRequestMutation.mutate({
                         requestId: request.id,
                         payload: { reason: 'Request declined by expert' },
                       });
                     },
                   },
                 ]
               );
             }}
           />
         </View>
       </View>
     ));
   };

   if (isLoading) {
     return (
       <Screen>
         <View style={styles.loadingState}>
           <ActivityIndicator size="large" color={colors.primary} />
         </View>
       </Screen>
     );
   }

   return (
     <Screen scrollable={false}>
       <ScrollView
         contentContainerStyle={styles.container}
         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
       >
         <View style={styles.header}>
           <Text style={[styles.heading, { color: colors.textPrimary }]}>Expert workspace</Text>
           <Text style={[styles.subheading, { color: colors.textSecondary }]}>
             {`Welcome back${user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}. Keep guiding learners forward.`}
           </Text>
         </View>

         {stats ? (
           <View style={styles.statsGrid}>
             <StatPill icon="calendar" label="Upcoming" value={stats.upcomingSessions} />
             <StatPill icon="checkmark-done" label="Completed" value={stats.completedSessions} />
             <StatPill icon="chatbubbles" label="Pending Qs" value={stats.pendingQuestions} />
             <StatPill icon="star" label="Avg rating" value={stats.averageRating?.toFixed(1) ?? '—'} />
           </View>
         ) : null}

         <View style={styles.sectionHeading}>
           <SectionTitle icon="calendar" label="Upcoming sessions" />
           <ActionChip icon="add" label="Create" onPress={() => navigation.navigate('ExpertCreateSession')} />
         </View>
         <View style={styles.sectionBody}>{renderSessions()}</View>

         <View style={styles.sectionHeading}>
           <SectionTitle icon="help-circle" label="Pending questions" />
           <ActionChip
             icon="refresh"
             label={questionsQuery.isRefetching ? 'Refreshing…' : 'Refresh'}
             onPress={() => questionsQuery.refetch()}
             disabled={questionsQuery.isRefetching}
           />
         </View>
         <View style={styles.sectionBody}>{renderQuestions()}</View>

         <View style={styles.sectionHeading}>
           <SectionTitle icon="star" label="Recent reviews" />
         </View>
         <View style={styles.sectionBody}>{renderReviews()}</View>

         <View style={styles.sectionHeading}>
           <SectionTitle icon="calendar-outline" label="Pending session requests" />
           <ActionChip
             icon="refresh"
             label={sessionRequestsQuery.isRefetching ? 'Refreshing…' : 'Refresh'}
             onPress={() => sessionRequestsQuery.refetch()}
             disabled={sessionRequestsQuery.isRefetching}
           />
         </View>
         <View style={styles.sectionBody}>{renderSessionRequests()}</View>
       </ScrollView>
     </Screen>
   );
 };

 const formatDateRange = (start: string, end?: string) => {
   try {
     const startDate = new Date(start);
     const endDate = end ? new Date(end) : null;
     const datePart = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
     const startTime = startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
     const endTime = endDate ? endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : null;
     return endTime ? `${datePart} · ${startTime} - ${endTime}` : `${datePart} · ${startTime}`;
   } catch (error) {
     return start;
   }
 };

 const createStyles = (colors: Palette) =>
   StyleSheet.create({
     container: {
       paddingBottom: spacing.xxl,
       gap: spacing.lg,
     },
     loadingState: {
       flex: 1,
       alignItems: 'center',
       justifyContent: 'center',
     },
     header: {
       gap: spacing.xs,
     },
     heading: {
       fontSize: 28,
       fontWeight: '700',
     },
     subheading: {
       fontSize: typography.body,
       lineHeight: 20,
     },
     statsGrid: {
       flexDirection: 'row',
       flexWrap: 'wrap',
       gap: spacing.sm,
     },
     statPill: {
       minWidth: 140,
       borderRadius: 16,
       borderWidth: 1,
       paddingVertical: spacing.sm,
       paddingHorizontal: spacing.md,
       gap: spacing.xs,
     },
     statValue: {
       fontSize: 20,
       fontWeight: '700',
     },
     statLabel: {
       fontSize: 12,
       fontWeight: '600',
       textTransform: 'uppercase',
       letterSpacing: 1,
     },
     sectionHeading: {
       flexDirection: 'row',
       alignItems: 'center',
       justifyContent: 'space-between',
     },
     sectionTitle: {
       flexDirection: 'row',
       alignItems: 'center',
       gap: spacing.sm,
     },
     sectionTitleText: {
       fontSize: typography.subheading,
       fontWeight: '600',
     },
     sectionBody: {
       gap: spacing.md,
     },
     card: {
       borderRadius: 20,
       borderWidth: 1,
       padding: spacing.lg,
       gap: spacing.sm,
     },
     cardHeader: {
       flexDirection: 'row',
       alignItems: 'flex-start',
       justifyContent: 'space-between',
       gap: spacing.md,
     },
     cardTitleWrap: {
       flex: 1,
       gap: spacing.xs,
     },
     cardTitle: {
       fontSize: typography.subheading,
       fontWeight: '600',
     },
     cardSubtitle: {
       fontSize: 13,
     },
     cardBody: {
       fontSize: typography.body,
       lineHeight: 20,
     },
     metaRow: {
       flexDirection: 'row',
       flexWrap: 'wrap',
       gap: spacing.sm,
     },
     metaItem: {
       flexDirection: 'row',
       alignItems: 'center',
       gap: spacing.xs,
     },
     metaText: {
       fontSize: 12,
     },
     actionsRow: {
       flexDirection: 'row',
       flexWrap: 'wrap',
       gap: spacing.sm,
     },
     statusBadge: {
       borderRadius: 999,
       borderWidth: 1,
       paddingHorizontal: spacing.sm,
       paddingVertical: 4,
     },
     statusText: {
       fontSize: 12,
       fontWeight: '600',
     },
     emptyCopy: {
       fontSize: 14,
       color: colors.textSecondary,
     },
     reviewHeader: {
       flexDirection: 'row',
       alignItems: 'center',
       justifyContent: 'space-between',
     },
     ratingRow: {
       flexDirection: 'row',
       gap: 2,
     },
     reviewDate: {
       fontSize: 12,
     },
     reviewAuthor: {
       fontSize: 13,
       marginTop: spacing.xs,
     },
     actionChip: {
       flexDirection: 'row',
       alignItems: 'center',
       gap: spacing.xs,
       borderRadius: 999,
       paddingHorizontal: spacing.sm,
       paddingVertical: spacing.xs,
       borderWidth: 1,
     },
     actionLabel: {
       fontSize: 13,
       fontWeight: '600',
     },
   });

 export default ExpertDashboardScreen;
