import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/ui/Screen';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { Course } from '../../api/types';
import { courseApi } from '../../api/courses';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { Button } from '../../components/ui/Button';
import { CoursesStackParamList } from '../../navigation/types';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';

type Props = NativeStackScreenProps<CoursesStackParamList, 'CoursesHome'>;

const MIN_SEARCH_CHARS = 2;

const CoursesScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'mycourses'>('mycourses');
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const {
    data: myCourses,
    isLoading: loadingMyCourses,
    refetch: refetchMyCourses,
  } = useQuery({
    queryKey: ['courses', 'my'],
    queryFn: courseApi.getMyCourses,
  });

  const {
    data: allCourses,
    isLoading: loadingAllCourses,
    refetch: refetchAllCourses,
  } = useQuery({
    queryKey: ['courses', 'all'],
    queryFn: courseApi.getAll,
  });

  const {
    data: searchedCourses,
    isFetching: searching,
  } = useQuery({
    queryKey: ['courses', 'search', debouncedSearch],
    queryFn: () => courseApi.search(debouncedSearch),
    enabled: debouncedSearch.length >= MIN_SEARCH_CHARS,
  });

  const enrollMutation = useMutation({
    mutationFn: (courseId: number) => courseApi.enroll(courseId),
    onSuccess: (_, courseId) => {
      showToast('Enrolled successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses', 'details', courseId] });
    },
    onError: error => {
      const apiError = mapApiError(error);
      showToast(apiError.message, 'error');
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: (courseId: number) => courseApi.unenroll(courseId),
    onSuccess: (_, courseId) => {
      showToast('You left the course', 'info');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses', 'details', courseId] });
    },
    onError: error => {
      const apiError = mapApiError(error);
      showToast(apiError.message, 'error');
    },
  });

  const browseCourses = useMemo<Course[] | undefined>(() => {
    if (debouncedSearch.length >= MIN_SEARCH_CHARS) {
      return searchedCourses;
    }
    return allCourses;
  }, [allCourses, debouncedSearch.length, searchedCourses]);

  const refreshing = enrollMutation.isPending || unenrollMutation.isPending;

  const handleEnrollToggle = (course: Course) => {
    if (course.enrolled) {
      unenrollMutation.mutate(course.id);
    } else {
      enrollMutation.mutate(course.id);
    }
  };

  const handleRefresh = () => {
    refetchMyCourses();
    refetchAllCourses();
  };

  const renderCourseItem = ({ item }: { item: Course }) => (
    <CourseCard
      course={item}
      loading={refreshing}
      onPress={() => navigation.navigate('CourseDetails', { courseId: item.id, title: item.name })}
      onActionPress={() => handleEnrollToggle(item)}
      styles={styles}
    />
  );

  const browseEmpty = !loadingAllCourses && !searching && (browseCourses?.length ?? 0) === 0;
  const myEmpty = !loadingMyCourses && (myCourses?.length ?? 0) === 0;

  return (
    <Screen>
      {/* Hero Header */}
      <LinearGradient
        colors={[colors.surface, colors.surfaceAlt]}
        style={styles.heroCard}
      >
        <View style={styles.heroBadge}>
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={styles.heroBadgeText}>COURSE CATALOG</Text>
        </View>
        <Text style={styles.heading}>Find the right course, faster</Text>
        <Text style={styles.subheading}>Compare offerings, enroll with one click, and keep your active courses organized.</Text>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Ionicons name="library" size={16} color={colors.primary} />
            <Text style={styles.statValue}>{allCourses?.length ?? 0}</Text>
            <Text style={styles.statLabel}>available</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.statValue, { color: colors.success }]}>{myCourses?.length ?? 0}</Text>
            <Text style={styles.statLabel}>enrolled</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Toggle */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, activeTab === 'catalog' && styles.tabActive]}
          onPress={() => setActiveTab('catalog')}
        >
          <Ionicons 
            name="library-outline" 
            size={16} 
            color={activeTab === 'catalog' ? colors.textOnPrimary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'catalog' && styles.tabTextActive]}>
            Catalog
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'mycourses' && styles.tabActive]}
          onPress={() => setActiveTab('mycourses')}
        >
          <Ionicons 
            name="checkmark-circle-outline" 
            size={16} 
            color={activeTab === 'mycourses' ? colors.textOnPrimary : colors.textSecondary} 
          />
          <Text style={[styles.tabText, activeTab === 'mycourses' && styles.tabTextActive]}>
            My courses
          </Text>
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by course name or code..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        {searching ? <ActivityIndicator color={colors.primary} style={styles.searchSpinner} /> : null}
      </View>

      {activeTab === 'mycourses' ? (
        <View style={styles.section}>
          <SectionHeader
            title="My courses"
            action={!myEmpty ? { label: 'Refresh', onPress: refetchMyCourses } : undefined}
            styles={styles}
          />
          {loadingMyCourses ? (
            <SkeletonList itemCount={2} styles={styles} />
          ) : myEmpty ? (
            <EmptyState
              title="You are not enrolled yet"
              message="Enroll in a course to get personalized group recommendations and expert support."
              actionLabel="Browse catalog"
              onAction={() => setActiveTab('catalog')}
              styles={styles}
            />
          ) : (
            <FlatList
              data={myCourses?.filter(c => 
                !debouncedSearch || 
                c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                c.code?.toLowerCase().includes(debouncedSearch.toLowerCase())
              )}
              keyExtractor={item => item.id.toString()}
              renderItem={renderCourseItem}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              scrollEnabled={false}
            />
          )}
        </View>
      ) : (
        <View style={styles.section}>
          <SectionHeader
            title={debouncedSearch.length >= MIN_SEARCH_CHARS ? 'Search results' : 'Browse catalog'}
            action={{ label: 'Refresh', onPress: handleRefresh }}
            styles={styles}
          />
          {loadingAllCourses && debouncedSearch.length < MIN_SEARCH_CHARS ? (
            <SkeletonList itemCount={3} styles={styles} />
          ) : browseEmpty ? (
            <EmptyState
              title={debouncedSearch.length ? 'No courses found' : 'Catalog unavailable'}
              message={
                debouncedSearch.length
                  ? 'Try a different search term or check spelling.'
                  : 'We could not load the catalog right now. Pull to retry in a moment.'
              }
              styles={styles}
            />
          ) : (
            <FlatList
              data={browseCourses}
              keyExtractor={item => item.id.toString()}
              renderItem={renderCourseItem}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              scrollEnabled={false}
            />
          )}
        </View>
      )}
    </Screen>
  );
};

type Styles = ReturnType<typeof createStyles>;

type SectionHeaderProps = {
  title: string;
  action?: { label: string; onPress: () => void };
  styles: Styles;
};

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action, styles }) => {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={action.onPress} accessibilityRole="button">
          <Text style={styles.sectionAction}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

type CourseCardProps = {
  course: Course;
  loading?: boolean;
  onPress: () => void;
  onActionPress: () => void;
  styles: Styles;
};

const CourseCard: React.FC<CourseCardProps> = ({ course, loading = false, onPress, onActionPress, styles }) => {
  const { colors } = useAppTheme();
  
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        course.enrolled ? styles.cardActive : null,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.codeRow}>
            <Ionicons 
              name={course.enrolled ? 'checkmark-circle' : 'book-outline'} 
              size={16} 
              color={course.enrolled ? colors.success : colors.primary} 
            />
            <Text style={[styles.courseCode, course.enrolled && { color: colors.success }]}>{course.code}</Text>
          </View>
          <Text style={styles.courseName}>{course.name}</Text>
        </View>
        <View style={[styles.badge, course.enrolled && styles.badgeActive]}>
          <Ionicons name="people" size={12} color={course.enrolled ? colors.success : colors.textMuted} />
          <Text style={[styles.badgeText, course.enrolled && styles.badgeTextActive]}>{course.groupCount ?? 0}</Text>
        </View>
      </View>
      {course.description ? (
        <Text style={styles.courseDescription} numberOfLines={2}>{course.description}</Text>
      ) : null}
      <View style={styles.cardFooter}>
        <View style={styles.metaColumn}>
          {course.faculty ? (
            <View style={styles.metaRow}>
              <Ionicons name="business-outline" size={14} color={colors.textMuted} />
              <Text style={styles.courseMeta}>{course.faculty}</Text>
            </View>
          ) : null}
          {course.semester ? (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
              <Text style={styles.courseMeta}>{course.semester}</Text>
            </View>
          ) : null}
        </View>
        <Button
          label={course.enrolled ? 'Leave' : 'Enroll'}
          variant={course.enrolled ? 'ghost' : 'primary'}
          size="sm"
          onPress={onActionPress}
          disabled={loading}
          style={styles.cardAction}
        />
      </View>
    </Pressable>
  );
};

type EmptyStateProps = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  styles: Styles;
};

const EmptyState: React.FC<EmptyStateProps> = ({ title, message, actionLabel, onAction, styles }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" /> : null}
  </View>
);

const SkeletonList: React.FC<{ itemCount?: number; styles: Styles }> = ({ itemCount = 3, styles }) => (
  <View style={styles.skeletonStack}>
    {new Array(itemCount).fill(0).map((_, index) => (
      <View key={index} style={styles.skeletonCard} />
    ))}
  </View>
);

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    heroCard: {
      borderRadius: borderRadius.xxl,
      padding: spacing.lg,
      gap: spacing.sm,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceAlt,
      borderRadius: borderRadius.xl,
      padding: 4,
      marginBottom: spacing.md,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.lg,
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    tabTextActive: {
      color: colors.textOnPrimary,
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
      marginTop: spacing.xs,
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
      color: colors.primary,
      fontWeight: '600',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchIcon: {
      marginRight: spacing.sm,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.md,
      color: colors.textPrimary,
      fontSize: 16,
    },
    clearButton: {
      padding: spacing.xs,
    },
    searchSpinner: {
      alignSelf: 'flex-start',
    },
    separator: {
      height: spacing.md,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardActive: {
      borderColor: colors.success,
      backgroundColor: colors.successLight,
    },
    cardPressed: {
      opacity: 0.95,
      transform: [{ scale: 0.99 }],
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    courseCode: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    courseName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      lineHeight: 24,
    },
    courseDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    metaColumn: {
      gap: spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    courseMeta: {
      fontSize: 13,
      color: colors.textMuted,
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
    badgeActive: {
      backgroundColor: colors.successLight,
    },
    badgeText: {
      fontSize: 13,
      color: colors.textMuted,
      fontWeight: '600',
    },
    badgeTextActive: {
      color: colors.success,
    },
    cardFooter: {
      marginTop: spacing.sm,
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    cardAction: {
      width: 100,
    },
    emptyState: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      gap: spacing.md,
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

export default CoursesScreen;
