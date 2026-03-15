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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '../../components/ui/Screen';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { expertsApi } from '../../api/experts';
import { ExpertSummary } from '../../api/types';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { ExpertsStackParamList } from '../../navigation/types';
import { useAuth } from '../../auth/AuthContext';
import ExpertDashboardScreen from './ExpertDashboardScreen';

type Navigation = NativeStackNavigationProp<ExpertsStackParamList>;
type Styles = ReturnType<typeof createStyles>;

const MIN_SEARCH_CHARS = 2;

const StudentExpertsScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [search, setSearch] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 350);
  const searchActive = debouncedSearch.length >= MIN_SEARCH_CHARS;

  const {
    data: experts = [],
    isLoading: loadingExperts,
    refetch: refetchExperts,
    isRefetching,
  } = useQuery({
    queryKey: ['experts', 'list'],
    queryFn: expertsApi.list,
  });

  const {
    data: searchResults = [],
    isFetching: searching,
  } = useQuery({
    queryKey: ['experts', 'search', debouncedSearch],
    queryFn: () => expertsApi.search(debouncedSearch),
    enabled: searchActive,
  });

  const specializations = useMemo(() => {
    const set = new Set<string>();
    experts.forEach(expert => {
      expert.specializations?.forEach(spec => set.add(spec));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [experts]);

  const filteredExperts = useMemo(() => {
    const base = searchActive ? searchResults : experts;
    if (!selectedSpecialization) {
      return base;
    }
    return base.filter(expert => expert.specializations?.includes(selectedSpecialization));
  }, [experts, searchResults, searchActive, selectedSpecialization]);

  const isEmpty = !loadingExperts && !searching && filteredExperts.length === 0;

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
          <Ionicons name="school" size={14} color={colors.primary} />
          <Text style={styles.heroBadgeText}>EXPERT MENTORS</Text>
        </View>
        <Text style={styles.heading}>Find your study mentor</Text>
        <Text style={styles.subheading}>
          Browse verified experts, check their specialties, and connect for personalized guidance.
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Ionicons name="people" size={16} color={colors.primary} />
            <Text style={styles.statValue}>{experts.length}</Text>
            <Text style={styles.statLabel}>Experts</Text>
          </View>
          <View style={styles.statPill}>
            <Ionicons name="ribbon" size={16} color={colors.secondary} />
            <Text style={styles.statValue}>{specializations.length}</Text>
            <Text style={styles.statLabel}>Specialties</Text>
          </View>
        </View>
        <Pressable onPress={() => refetchExperts()} style={styles.refreshButton} accessibilityRole="button">
          {loadingExperts || isRefetching ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          )}
        </Pressable>
      </LinearGradient>

      {/* Quick Actions - 3 boxes in a row like web */}
      <View style={styles.quickActionsRow}>
        <Pressable 
          style={({ pressed }) => [styles.quickActionBox, pressed && styles.quickActionBoxPressed]}
          onPress={() => navigation.navigate('AskQuestion')}
        >
          <View style={[styles.quickActionBoxIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Ionicons name="help-circle" size={20} color={colors.primary} />
          </View>
          <Text style={styles.quickActionBoxTitle}>Ask a question</Text>
          <Text style={styles.quickActionBoxDesc} numberOfLines={2}>Get help from experts.</Text>
        </Pressable>
        
        <Pressable 
          style={({ pressed }) => [styles.quickActionBox, pressed && styles.quickActionBoxPressed]}
          onPress={() => navigation.navigate('PublicQuestions')}
        >
          <View style={[styles.quickActionBoxIcon, { backgroundColor: `${colors.secondary}15` }]}>
            <Ionicons name="earth" size={20} color={colors.secondary} />
          </View>
          <Text style={styles.quickActionBoxTitle}>Public Q&A</Text>
          <Text style={styles.quickActionBoxDesc} numberOfLines={2}>Browse discussions.</Text>
        </Pressable>
        
        <Pressable 
          style={({ pressed }) => [styles.quickActionBox, pressed && styles.quickActionBoxPressed]}
          onPress={() => navigation.navigate('MyQuestions')}
        >
          <View style={[styles.quickActionBoxIcon, { backgroundColor: `${colors.success}15` }]}>
            <Ionicons name="chatbox-ellipses" size={20} color={colors.success} />
          </View>
          <Text style={styles.quickActionBoxTitle}>My questions</Text>
          <Text style={styles.quickActionBoxDesc} numberOfLines={2}>Review your threads.</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search experts by name or specialty"
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

        {specializations.length ? (
          <View style={styles.specializationRow}>
            <FilterChip
              label="All"
              active={!selectedSpecialization}
              onPress={() => setSelectedSpecialization(null)}
              styles={styles}
            />
            {specializations.map(spec => (
              <FilterChip
                key={spec}
                label={spec}
                active={selectedSpecialization === spec}
                onPress={() => setSelectedSpecialization(spec)}
                styles={styles}
              />
            ))}
          </View>
        ) : null}
      </View>

      {loadingExperts && !searchActive ? (
        <SkeletonList styles={styles} />
      ) : isEmpty ? (
        <EmptyState
          styles={styles}
          title={searchActive ? 'No experts match that search' : 'Experts are coming soon'}
          message={
            searchActive
              ? 'Try a different keyword or remove filters to discover more mentors.'
              : 'We are syncing experts with your account. Pull to refresh in a moment.'
          }
          actionLabel={searchActive ? 'Clear search' : 'Refresh'}
          onAction={searchActive ? () => setSearch('') : () => refetchExperts()}
        />
      ) : (
        <View style={styles.cardStack}>
          {(searchActive ? searchResults : experts).length === 0 && searching ? (
            <ActivityIndicator color={colors.primary} />
          ) : null}
          {filteredExperts.map(expert => (
            <ExpertCard
              key={expert.userId}
              expert={expert}
              styles={styles}
              palette={colors}
              onPress={() =>
                navigation.navigate('ExpertDetails', {
                  userId: expert.userId,
                  name: expert.fullName ?? 'Expert Profile',
                })
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
};

const FilterChip: React.FC<{ label: string; active: boolean; onPress: () => void; styles: Styles }> = ({
  label,
  active,
  onPress,
  styles,
}) => (
  <Pressable
    style={[styles.chip, active ? styles.chipActive : null]}
    onPress={onPress}
    accessibilityRole="button"
  >
    <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>{label}</Text>
  </Pressable>
);

const ExpertCard: React.FC<{ expert: ExpertSummary; onPress: () => void; styles: Styles; palette: Palette }> = ({
  expert,
  onPress,
  styles,
  palette,
}) => {
  const initials = (expert.fullName ?? expert.title ?? 'E').trim().charAt(0).toUpperCase();
  const rating = expert.averageRating ? expert.averageRating.toFixed(1) : '—';

  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {expert.fullName ?? 'Expert mentor'}
            </Text>
            {expert.isVerified ? <Ionicons name="checkmark-circle" size={18} color={palette.primary} /> : null}
          </View>
          {expert.title ? (
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {expert.title}
            </Text>
          ) : null}
          {expert.institution ? (
            <Text style={styles.cardMeta} numberOfLines={1}>
              {expert.institution}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricPill}>
          <Ionicons name="star" size={14} color={palette.primary} />
          <Text style={styles.metricText}>{rating}</Text>
        </View>
        {typeof expert.totalReviews === 'number' ? (
          <View style={styles.metricPill}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={palette.textSecondary} />
            <Text style={styles.metricText}>{`${expert.totalReviews} reviews`}</Text>
          </View>
        ) : null}
        {typeof expert.totalSessions === 'number' ? (
          <View style={styles.metricPill}>
            <Ionicons name="calendar-outline" size={14} color={palette.textSecondary} />
            <Text style={styles.metricText}>{`${expert.totalSessions} sessions`}</Text>
          </View>
        ) : null}
      </View>

      {expert.specializations?.length ? (
        <View style={styles.tagRow}>
          {expert.specializations.slice(0, 3).map(spec => (
            <Text key={spec} style={styles.tag} numberOfLines={1}>
              {spec}
            </Text>
          ))}
          {expert.specializations.length > 3 ? (
            <Text style={styles.tag}>{`+${expert.specializations.length - 3}`}</Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.availabilityFlag}>
          <Ionicons
            name={expert.isAvailableNow ? 'ellipse' : 'ellipse-outline'}
            size={12}
            color={expert.isAvailableNow ? palette.success : palette.textMuted}
          />
          <Text style={styles.availabilityText}>{expert.isAvailableNow ? 'Available now' : 'Message to schedule'}</Text>
        </View>
        <View style={styles.offerWrap}>
          {expert.offersOneOnOne ? <OfferPill label="1:1" palette={palette} styles={styles} /> : null}
          {expert.offersGroupConsultations ? <OfferPill label="Group" palette={palette} styles={styles} /> : null}
          {expert.offersAsyncQA ? <OfferPill label="Q&A" palette={palette} styles={styles} /> : null}
        </View>
      </View>
    </Pressable>
  );
};

const OfferPill: React.FC<{ label: string; palette: Palette; styles: Styles }> = ({ label, palette, styles }) => (
  <View style={[styles.offerPill, { borderColor: palette.border }]}>
    <Text style={styles.offerText}>{label}</Text>
  </View>
);

const QuickActionCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
  palette: Palette;
  styles: Styles;
}> = ({ icon, title, description, onPress, palette, styles }) => (
  <Pressable style={[styles.quickActionCard, { borderColor: palette.border, backgroundColor: palette.surface }]} onPress={onPress} accessibilityRole="button">
    <View style={styles.quickActionIconWrap}>
      <Ionicons name={icon} size={22} color={palette.primary} />
    </View>
    <View style={styles.quickActionCopy}>
      <Text style={[styles.quickActionTitle, { color: palette.textPrimary }]}>{title}</Text>
      <Text style={[styles.quickActionDescription, { color: palette.textSecondary }]}>{description}</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={palette.textSecondary} />
  </Pressable>
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
      <Pressable onPress={onAction} accessibilityRole="button">
        <Text style={styles.emptyAction}>{actionLabel}</Text>
      </Pressable>
    ) : null}
  </View>
);

const SkeletonList: React.FC<{ styles: Styles }> = ({ styles }) => (
  <View style={styles.skeletonStack}>
    <View style={styles.skeletonCard} />
    <View style={styles.skeletonCard} />
    <View style={styles.skeletonCard} />
  </View>
);

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
    quickActionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    quickActionBox: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.md,
      alignItems: 'center',
      gap: spacing.xs,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickActionBoxPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    quickActionBoxIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    quickActionBoxTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
    },
    quickActionBoxDesc: {
      fontSize: 10,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 14,
    },
    quickActions: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    filters: {
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.textPrimary,
    },
    specializationRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
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
    quickActionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    quickActionIconWrap: {
      width: 44,
      height: 44,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryLight,
    },
    quickActionCopy: {
      flex: 1,
      gap: spacing.xs,
    },
    quickActionTitle: {
      fontSize: 16,
      fontWeight: '700',
    },
    quickActionDescription: {
      fontSize: 13,
      lineHeight: 18,
    },
    cardStack: {
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryLight,
    },
    avatarText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
    },
    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    cardTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.textPrimary,
      flex: 1,
    },
    cardSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    cardMeta: {
      fontSize: 13,
      color: colors.textMuted,
    },
    metricsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    metricPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceAlt,
    },
    metricText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
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
      borderRadius: borderRadius.md,
      backgroundColor: colors.primaryLight,
      color: colors.primary,
      fontWeight: '600',
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    availabilityFlag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    availabilityText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    offerWrap: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    offerPill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
    },
    offerText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    emptyState: {
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
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
    emptyAction: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.primary,
    },
    skeletonStack: {
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    skeletonCard: {
      height: 160,
      borderRadius: borderRadius.xl,
      backgroundColor: colors.surfaceAlt,
      opacity: 0.4,
    },
  });

  const ExpertsScreen: React.FC = () => {
    const { user } = useAuth();
    if (user?.role === 'EXPERT') {
      return <ExpertDashboardScreen />;
    }
    return <StudentExpertsScreen />;
  };

  export default ExpertsScreen;
