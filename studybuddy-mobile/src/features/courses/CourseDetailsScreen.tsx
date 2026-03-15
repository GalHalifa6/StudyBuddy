import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/ui/Screen';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { courseApi } from '../../api/courses';
import { Course, CourseExtras } from '../../api/types';
import { mapApiError } from '../../api/errors';
import { useToast } from '../../components/ui/ToastProvider';
import { Button } from '../../components/ui/Button';
import { CoursesStackParamList } from '../../navigation/types';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';

export type CourseDetailsScreenProps = NativeStackScreenProps<CoursesStackParamList, 'CourseDetails'>;

const CourseDetailsScreen: React.FC<CourseDetailsScreenProps> = ({ route, navigation }) => {
  const { courseId, title } = route.params;
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    data: course,
    isLoading: loadingCourse,
    isError: courseError,
    error,
  } = useQuery<Course>({
    queryKey: ['courses', 'details', courseId],
    queryFn: () => courseApi.getById(courseId),
  });

  const {
    data: extras,
    isLoading: loadingExtras,
  } = useQuery<CourseExtras>({
    queryKey: ['courses', 'extras', courseId],
    queryFn: () => courseApi.getExtras(courseId),
    enabled: !!course?.enrolled,
  });

  const enrollMutation = useMutation({
    mutationFn: () => courseApi.enroll(courseId),
    onSuccess: () => {
      showToast('Enrolled successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses', 'details', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courses', 'extras', courseId] });
    },
    onError: err => showToast(mapApiError(err).message, 'error'),
  });

  const unenrollMutation = useMutation({
    mutationFn: () => courseApi.unenroll(courseId),
    onSuccess: () => {
      showToast('You left the course', 'info');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses', 'details', courseId] });
      queryClient.invalidateQueries({ queryKey: ['courses', 'extras', courseId] });
    },
    onError: err => showToast(mapApiError(err).message, 'error'),
  });

  const loading = loadingCourse;
  const actionPending = enrollMutation.isPending || unenrollMutation.isPending;

  const handleEnrollment = () => {
    if (!course) return;
    if (course.enrolled) {
      unenrollMutation.mutate();
    } else {
      enrollMutation.mutate();
    }
  };

  const navigateToGroup = (groupId: number) => {
    navigation.getParent()?.navigate('Groups', {
      screen: 'GroupDetails',
      params: { groupId },
    });
  };

  const navigateToSession = (sessionId: number) => {
    navigation.getParent()?.navigate('Sessions', {
      screen: 'SessionDetails',
      params: { sessionId },
    });
  };

  const navigateToExpert = (expertId: number, name?: string) => {
    navigation.getParent()?.navigate('Experts', {
      screen: 'ExpertDetails',
      params: { userId: expertId, name },
    });
  };

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator color={colors.primary} style={styles.loader} />;
    }

    if (courseError || !course) {
      const apiError = mapApiError(error);
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Unable to load course</Text>
          <Text style={styles.errorMessage}>{apiError.message}</Text>
        </View>
      );
    }

    return (
      <View style={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroCode}>{course.code}</Text>
              <Text style={styles.heroTitle}>{course.name}</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{course.groupCount ?? 0} groups</Text>
            </View>
          </View>
          {course.description ? <Text style={styles.heroDescription}>{course.description}</Text> : null}
          <View style={styles.heroMeta}>
            <Text style={styles.heroMetaText}>Faculty: {course.faculty ?? '—'}</Text>
            <Text style={styles.heroMetaText}>Semester: {course.semester ?? '—'}</Text>
          </View>
          <Button
            label={course.enrolled ? 'Leave course' : 'Enroll in course'}
            onPress={handleEnrollment}
            loading={actionPending}
            variant={course.enrolled ? 'secondary' : 'primary'}
          />
        </View>

        {course.enrolled ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Course activity</Text>
            {loadingExtras ? (
              <ActivityIndicator color={colors.primary} />
            ) : extras ? (
              <View style={styles.statsRow}>
                <StatPill label="Groups" value={extras.stats.groupCount} styles={styles} />
                <StatPill label="Upcoming sessions" value={extras.stats.upcomingSessionCount} styles={styles} />
                <StatPill label="Experts" value={extras.stats.expertCount} styles={styles} />
                <StatPill label="Public Q&A" value={extras.stats.questionCount} styles={styles} />
              </View>
            ) : (
              <Text style={styles.emptyMeta}>We could not load course insights right now.</Text>
            )}
          </View>
        ) : (
          <View style={styles.lockedCard}>
            <Text style={styles.lockedTitle}>Enroll to unlock communities</Text>
            <Text style={styles.lockedMessage}>
              Join this course to access curated study groups, upcoming expert-led sessions, and trending Q&A highlights.
            </Text>
          </View>
        )}

        {course.enrolled && extras ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recommended groups</Text>
            {extras.recommendedGroups.length === 0 ? (
              <Text style={styles.emptyMeta}>No active groups yet. Be the first to create one!</Text>
            ) : (
              <FlatList
                data={extras.recommendedGroups}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                  <Pressable style={styles.groupCard} onPress={() => navigateToGroup(item.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.groupTitle}>{item.name}</Text>
                      {item.topic ? <Text style={styles.groupMeta}>{item.topic}</Text> : null}
                      <Text style={styles.groupMeta}>{item.memberCount} members</Text>
                    </View>
                    <Text style={styles.groupLink}>View</Text>
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                scrollEnabled={false}
              />
            )}
          </View>
        ) : null}

        {course.enrolled && extras ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming sessions</Text>
            {extras.upcomingSessions.length === 0 ? (
              <Text style={styles.emptyMeta}>No scheduled sessions yet. Check back soon.</Text>
            ) : (
              <FlatList
                data={extras.upcomingSessions}
                keyExtractor={item => item.id.toString()}
                renderItem={({ item }) => (
                  <Pressable style={styles.sessionCard} onPress={() => navigateToSession(item.id)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionTitle}>{item.title}</Text>
                      <Text style={styles.sessionMeta}>{item.sessionType}</Text>
                      <Text style={styles.sessionMeta}>{new Date(item.scheduledStartTime).toLocaleString()}</Text>
                    </View>
                    <Text style={styles.groupLink}>Details</Text>
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                scrollEnabled={false}
              />
            )}
          </View>
        ) : null}

        {course.enrolled && extras ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Featured experts</Text>
            {extras.featuredExperts.length === 0 ? (
              <Text style={styles.emptyMeta}>No featured experts yet. Book an expert to kick-start the conversation.</Text>
            ) : (
              <FlatList
                data={extras.featuredExperts}
                keyExtractor={item => item.userId.toString()}
                renderItem={({ item }) => (
                  <Pressable style={styles.expertCard} onPress={() => navigateToExpert(item.userId, item.fullName)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.expertName}>{item.fullName ?? 'Expert'}</Text>
                      {item.title ? <Text style={styles.expertMeta}>{item.title}</Text> : null}
                      {item.specializations?.length ? (
                        <Text style={styles.expertMeta} numberOfLines={1}>
                          {item.specializations.join(', ')}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingValue}>{item.averageRating?.toFixed(1) ?? '—'}</Text>
                      <Text style={styles.ratingLabel}>Rating</Text>
                    </View>
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
                scrollEnabled={false}
              />
            )}
          </View>
        ) : null}
      </View>
    );
  };

  React.useEffect(() => {
    if (title) {
      navigation.setOptions({ title });
    }
  }, [navigation, title]);

  return (
    <Screen scrollable={false}>
      <ScrollView contentContainerStyle={styles.scrollContent}>{renderContent()}</ScrollView>
    </Screen>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    scrollContent: {
      paddingBottom: spacing.xl,
      gap: spacing.lg,
    },
    content: {
      gap: spacing.xl,
    },
    loader: {
      marginTop: spacing.xl,
    },
    heroCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.xl,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.cardShadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 22,
      elevation: 6,
    },
    heroHeader: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    heroCode: {
      fontSize: 14,
      color: colors.textMuted,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    heroDescription: {
      fontSize: 16,
      color: colors.textSecondary,
      lineHeight: 24,
    },
    heroMeta: {
      flexDirection: 'row',
      gap: spacing.lg,
    },
    heroMetaText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    heroBadge: {
      borderRadius: 999,
      alignSelf: 'flex-start',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroBadgeText: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      fontSize: typography.subheading,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    statsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    statPill: {
      minWidth: 120,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    lockedCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.sm,
    },
    lockedTitle: {
      fontSize: typography.subheading,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    lockedMessage: {
      fontSize: 15,
      color: colors.textSecondary,
    },
    groupCard: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    groupTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    groupMeta: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    groupLink: {
      fontSize: 14,
      color: colors.accent,
      fontWeight: '600',
    },
    sessionCard: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sessionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    sessionMeta: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    expertCard: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    expertName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    expertMeta: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    ratingBadge: {
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 12,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    ratingValue: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    ratingLabel: {
      fontSize: 12,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    emptyMeta: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    errorCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    errorTitle: {
      fontSize: typography.subheading,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    errorMessage: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
  });

type Styles = ReturnType<typeof createStyles>;

const StatPill: React.FC<{ label: string; value: number; styles: Styles }> = ({ label, value, styles }) => (
  <View style={styles.statPill}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

export default CourseDetailsScreen;
