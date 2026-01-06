import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { ExpertsStackParamList } from '../../navigation/types';
import { expertsApi } from '../../api/experts';
import { ExpertProfile, ExpertReview, SessionSummary } from '../../api/types';
import RequestSessionModal from './RequestSessionModal';
import { directMessageApi } from '../../api/directMessages';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';

type Route = RouteProp<ExpertsStackParamList, 'ExpertDetails'>;
type Navigation = NativeStackNavigationProp<ExpertsStackParamList>;
type Styles = ReturnType<typeof createStyles>;

const ExpertDetailsScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Navigation>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const expertId = route.params.userId;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showRequestModal, setShowRequestModal] = useState(false);

  const {
    data: profile,
    isLoading: loadingProfile,
    refetch: refetchProfile,
    isRefetching,
  } = useQuery({
    queryKey: ['experts', 'profile', expertId],
    queryFn: () => expertsApi.profile(expertId),
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['experts', 'sessions', expertId],
    queryFn: () => expertsApi.sessions(expertId),
  });

  const { data: reviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ['experts', 'reviews', expertId],
    queryFn: () => expertsApi.reviews(expertId),
  });

  const { data: reviewEligibility } = useQuery({
    queryKey: ['experts', 'review-eligibility', expertId],
    queryFn: () => expertsApi.canReview(expertId),
  });

  useEffect(() => {
    if (!profile?.fullName) {
      return;
    }
    navigation.setOptions({ title: profile.fullName });
  }, [navigation, profile?.fullName]);

  const initials = useMemo(() => {
    if (profile?.fullName) {
      return profile.fullName
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    return (profile?.title ?? 'Expert').charAt(0).toUpperCase();
  }, [profile?.fullName, profile?.title]);

  const ratingLabel = profile?.averageRating ? profile.averageRating.toFixed(1) : '—';

  if (loadingProfile && !profile) {
    return (
      <Screen>
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle" size={36} color={colors.error} />
          <Text style={styles.errorTitle}>We could not load this expert right now.</Text>
          <Button label="Try again" onPress={() => refetchProfile()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.heroHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{profile.fullName ?? route.params.name ?? 'Expert mentor'}</Text>
            {profile.title ? <Text style={styles.heroTitle}>{profile.title}</Text> : null}
            {profile.institution ? <Text style={styles.heroMeta}>{profile.institution}</Text> : null}
            {profile.averageRating ? (
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={16} color={colors.accent} />
                <Text style={styles.ratingLabel}>{ratingLabel}</Text>
                {typeof profile.totalReviews === 'number' ? (
                  <Text style={styles.ratingCount}>{`(${profile.totalReviews} reviews)`}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
          <Pressable
            style={styles.refreshButton}
            onPress={() => refetchProfile()}
            accessibilityRole="button"
          >
            {isRefetching ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Ionicons name="refresh" size={18} color={colors.textSecondary} />
            )}
          </Pressable>
        </View>

        <View style={styles.heroActions}>
          <Button
            label="Request Session"
            onPress={() => setShowRequestModal(true)}
          />
          <Button
            label="Send Message"
            variant="secondary"
            onPress={async () => {
              try {
                const conversation = await directMessageApi.createOrGetConversation(expertId);
                // Invalidate queries first
                queryClient.invalidateQueries({ queryKey: ['directMessages'] });
                // Navigate to messages tab with the conversation
                navigation.getParent()?.navigate('Messages', { conversationId: conversation.id });
              } catch (error) {
                showToast(mapApiError(error).message, 'error');
              }
            }}
          />
          <Button
            label="Ask a question"
            variant="secondary"
            onPress={() =>
              navigation.navigate('AskQuestion', {
                expertId,
                expertName: profile.fullName ?? route.params.name,
              })
            }
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label="Students helped"
            value={(profile.studentsHelped ?? 0).toString()}
            icon="people"
            styles={styles}
            palette={colors}
          />
          <MetricCard
            label="Helpful answers"
            value={(profile.helpfulAnswers ?? 0).toString()}
            icon="chatbubble-ellipses"
            styles={styles}
            palette={colors}
          />
          <MetricCard
            label="1:1 sessions"
            value={(profile.totalSessions ?? 0).toString()}
            icon="calendar"
            styles={styles}
            palette={colors}
          />
        </View>

        <AvailabilityBadge profile={profile} styles={styles} palette={colors} />
      </View>

      {profile.specializations?.length ? (
        <View style={styles.section}>
          <SectionHeader title="Specializations" icon="ribbon" styles={styles} palette={colors} />
          <View style={styles.tagRow}>
            {profile.specializations.map(tag => (
              <Text key={tag} style={styles.tag} numberOfLines={1}>
                {tag}
              </Text>
            ))}
          </View>
        </View>
      ) : null}

      {profile.bio ? (
        <View style={styles.section}>
          <SectionHeader title="About" icon="information-circle" styles={styles} palette={colors} />
          <Text style={styles.bodyText}>{profile.bio}</Text>
        </View>
      ) : null}

      {profile.qualifications || profile.yearsOfExperience ? (
        <View style={styles.section}>
          <SectionHeader title="Experience" icon="briefcase" styles={styles} palette={colors} />
          {profile.qualifications ? <Text style={styles.bodyText}>{profile.qualifications}</Text> : null}
          {typeof profile.yearsOfExperience === 'number' ? (
            <Text style={styles.metaText}>{`${profile.yearsOfExperience} years guiding learners`}</Text>
          ) : null}
          {profile.achievements?.length ? (
            <View style={styles.achievementList}>
              {profile.achievements.map(item => (
                <View key={item} style={styles.achievementRow}>
                  <Ionicons name="medal" size={16} color={colors.accent} />
                  <Text style={styles.bodyText}>{item}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {profile.linkedInUrl || profile.personalWebsite ? (
        <View style={styles.section}>
          <SectionHeader title="Connect" icon="link" styles={styles} palette={colors} />
          {profile.linkedInUrl ? (
            <Pressable
              style={styles.linkRow}
              onPress={() => Linking.openURL(profile.linkedInUrl!)}
              accessibilityRole="link"
            >
              <Ionicons name="logo-linkedin" size={18} color={colors.primary} />
              <Text style={styles.linkText}>LinkedIn</Text>
            </Pressable>
          ) : null}
          {profile.personalWebsite ? (
            <Pressable
              style={styles.linkRow}
              onPress={() => Linking.openURL(profile.personalWebsite!)}
              accessibilityRole="link"
            >
              <Ionicons name="globe" size={18} color={colors.primary} />
              <Text style={styles.linkText}>Personal site</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.section}>
        <SectionHeader title="Upcoming sessions" icon="calendar" styles={styles} palette={colors} />
        {loadingSessions ? (
          <ActivityIndicator color={colors.primary} />
        ) : sessions.length ? (
          <View style={styles.sessionStack}>
            {sessions.slice(0, 3).map(session => (
              <SessionCard key={session.id} session={session} styles={styles} palette={colors} />
            ))}
          </View>
        ) : (
          <Text style={styles.metaText}>No sessions scheduled yet. Check back soon.</Text>
        )}
      </View>

      <View style={styles.section}>
        <SectionHeader title="What students say" icon="chatbubbles" styles={styles} palette={colors} />
        {loadingReviews ? (
          <ActivityIndicator color={colors.primary} />
        ) : reviews.length ? (
          <View style={styles.reviewStack}>
            {reviews.slice(0, 3).map(review => (
              <ReviewCard key={review.id} review={review} styles={styles} palette={colors} />
            ))}
          </View>
        ) : (
          <Text style={styles.metaText}>Students have not shared reviews for this expert yet.</Text>
        )}
        {reviewEligibility ? (
          reviewEligibility.canReview ? (
            <>
              <Text style={styles.reviewHint}>You are eligible to share your experience with this expert.</Text>
              <Button
                label="Write a review"
                onPress={() =>
                  navigation.navigate('SubmitExpertReview', {
                    expertId,
                    expertName: profile.fullName ?? route.params.name,
                  })
                }
              />
            </>
          ) : reviewEligibility.alreadyReviewed ? (
            <Text style={styles.reviewHint}>You already left a review for this expert. Thank you!</Text>
          ) : (
            <Text style={styles.reviewHint}>Complete a live session first to leave a review.</Text>
          )
        ) : null}
      </View>

      {/* Request Session Modal */}
      <RequestSessionModal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        expertId={expertId}
        expertName={profile.fullName ?? route.params.name ?? 'Expert'}
      />
    </Screen>
  );
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  styles: Styles;
  palette: Palette;
}> = ({ label, value, icon, styles, palette }) => (
  <View style={[styles.metricCard, { borderColor: palette.border }]}>
    <Ionicons name={icon} size={18} color={palette.primary} />
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const AvailabilityBadge: React.FC<{ profile: ExpertProfile; styles: Styles; palette: Palette }> = ({ profile, styles, palette }) => {
  const statusText = profile.isAvailableNow
    ? 'Available now'
    : profile.acceptingNewStudents
    ? 'Accepting new students'
    : 'Currently booked';

  const indicatorColor = profile.isAvailableNow ? palette.success : palette.textMuted;

  return (
    <View style={[styles.availabilityBadge, { borderColor: palette.border }]}>
      <Ionicons name="ellipse" size={12} color={indicatorColor} />
      <Text style={styles.availabilityText}>{statusText}</Text>
      {profile.typicalResponseHours ? (
        <Text style={styles.responseText}>{`Typically responds within ${profile.typicalResponseHours}h`}</Text>
      ) : null}
    </View>
  );
};

const SectionHeader: React.FC<{ title: string; icon: keyof typeof Ionicons.glyphMap; styles: Styles; palette: Palette }> = ({
  title,
  icon,
  styles,
  palette,
}) => (
  <View style={styles.sectionHeader}>
    <Ionicons name={icon} size={18} color={palette.primary} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const SessionCard: React.FC<{ session: SessionSummary; styles: Styles; palette: Palette }> = ({ session, styles, palette }) => (
  <View style={[styles.sessionCard, { borderColor: palette.border }]}>
    <Text style={styles.sessionTitle}>{session.title}</Text>
    <View style={styles.sessionMetaRow}>
      <Ionicons name="time" size={14} color={palette.textSecondary} />
      <Text style={styles.sessionMeta}>
        {new Date(session.scheduledStartTime).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}
        {` · ${new Date(session.scheduledStartTime).toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        })}`}
      </Text>
    </View>
    {session.course?.name ? (
      <View style={styles.sessionMetaRow}>
        <Ionicons name="book" size={14} color={palette.textSecondary} />
        <Text style={styles.sessionMeta}>{session.course.name}</Text>
      </View>
    ) : null}
    <View style={styles.sessionMetaRow}>
      <Ionicons name="people" size={14} color={palette.textSecondary} />
      <Text style={styles.sessionMeta}>{`${session.currentParticipants}/${session.maxParticipants} enrolled`}</Text>
    </View>
  </View>
);

const ReviewCard: React.FC<{ review: ExpertReview; styles: Styles; palette: Palette }> = ({ review, styles, palette }) => (
  <View style={[styles.reviewCard, { borderColor: palette.border }]}>
    <View style={styles.reviewHeader}>
      <View style={styles.reviewRating}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Ionicons
            key={index}
            name={index < review.rating ? 'star' : 'star-outline'}
            size={14}
            color={index < review.rating ? palette.accent : palette.textMuted}
          />
        ))}
      </View>
      <Text style={styles.reviewDate}>{new Date(review.createdAt).toLocaleDateString()}</Text>
    </View>
    <Text style={styles.reviewBody}>{review.review}</Text>
    <Text style={styles.reviewAuthor}>{review.student?.fullName ?? review.student?.username ?? 'Anonymous learner'}</Text>
    {review.highlights ? <Text style={styles.reviewHighlight}>{`Highlights: ${review.highlights}`}</Text> : null}
    {review.improvements ? <Text style={styles.reviewHighlight}>{`Suggested improvements: ${review.improvements}`}</Text> : null}
    {review.expertResponse ? (
      <View style={styles.expertResponse}>
        <Text style={styles.responseTitle}>Expert response</Text>
        <Text style={styles.responseBody}>{review.expertResponse}</Text>
      </View>
    ) : null}
  </View>
);

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorState: {
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    errorTitle: {
      fontSize: typography.subheading,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    hero: {
      gap: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      padding: spacing.lg,
    },
    heroHeader: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'flex-start',
      position: 'relative',
    },
    heroInfo: {
      flex: 1,
      gap: spacing.xs,
    },
    heroName: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    heroTitle: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    heroMeta: {
      fontSize: 14,
      color: colors.textMuted,
    },
    ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    ratingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    ratingCount: {
      fontSize: 13,
      color: colors.textMuted,
    },
    refreshButton: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroActions: {
      gap: spacing.sm,
    },
    avatar: {
      width: 64,
      height: 64,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatarText: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.primary,
    },
    metricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    metricCard: {
      flex: 1,
      minWidth: 100,
      borderWidth: 1,
      borderRadius: 16,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.surfaceAlt,
    },
    metricValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    metricLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    availabilityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: 16,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      backgroundColor: colors.surfaceAlt,
    },
    availabilityText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    responseText: {
      fontSize: 12,
      color: colors.textMuted,
    },
    section: {
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    bodyText: {
      fontSize: typography.body,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    metaText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    tag: {
      fontSize: 12,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      color: colors.textSecondary,
    },
    achievementList: {
      gap: spacing.xs,
    },
    achievementRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignItems: 'center',
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    linkText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
    sessionStack: {
      gap: spacing.sm,
    },
    sessionCard: {
      borderRadius: 18,
      padding: spacing.md,
      borderWidth: 1,
      backgroundColor: colors.surfaceAlt,
      gap: spacing.xs,
    },
    sessionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    sessionMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    sessionMeta: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    reviewStack: {
      gap: spacing.sm,
    },
    reviewCard: {
      borderRadius: 18,
      padding: spacing.md,
      borderWidth: 1,
      backgroundColor: colors.surfaceAlt,
      gap: spacing.sm,
    },
    reviewHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    reviewRating: {
      flexDirection: 'row',
      gap: 4,
    },
    reviewDate: {
      fontSize: 12,
      color: colors.textMuted,
    },
    reviewBody: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    reviewAuthor: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    reviewHighlight: {
      fontSize: 12,
      color: colors.textMuted,
    },
    expertResponse: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: spacing.sm,
      gap: spacing.xs,
    },
    responseTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    responseBody: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    reviewHint: {
      marginTop: spacing.sm,
      fontSize: 12,
      color: colors.success,
      fontWeight: '600',
    },
  });

export default ExpertDetailsScreen;
