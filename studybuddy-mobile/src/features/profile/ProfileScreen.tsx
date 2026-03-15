import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/ui/Screen';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/ToastProvider';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { UpdateProfileRequest, User } from '../../api/types';
import { authApi } from '../../api/auth';
import { mapApiError } from '../../api/errors';
import { ProfileStackParamList } from '../../navigation/types';

type FormValues = {
  topicsOfInterest: string;
  proficiencyLevel: string;
  preferredLanguages: string;
  availability: string;
  collaborationStyle: string;
};

const proficiencyOptions = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

const collaborationOptions = [
  {
    value: 'quiet_focus',
    label: 'Quiet focus',
    description: 'Prefer async updates and heads-down work.',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Mix of async check-ins and live collaboration.',
  },
  {
    value: 'discussion_heavy',
    label: 'Discussion heavy',
    description: 'Energized by live discussions and rapid feedback.',
  },
];

const mapUserToFormValues = (user: User | null): FormValues => ({
  topicsOfInterest: user?.topicsOfInterest?.join(', ') ?? '',
  proficiencyLevel: user?.proficiencyLevel ?? 'intermediate',
  preferredLanguages: user?.preferredLanguages?.join(', ') ?? '',
  availability: user?.availability ?? '',
  collaborationStyle: user?.collaborationStyle ?? 'balanced',
});

const mapFormToPayload = (values: FormValues): UpdateProfileRequest => {
  const toArray = (value: string) =>
    value
      .split(',')
      .map(entry => entry.trim())
      .filter(Boolean);

  return {
    topicsOfInterest: toArray(values.topicsOfInterest),
    proficiencyLevel: values.proficiencyLevel,
    preferredLanguages: toArray(values.preferredLanguages),
    availability: values.availability.trim(),
    collaborationStyle: values.collaborationStyle,
  };
};

type ProfileNavigation = NativeStackNavigationProp<ProfileStackParamList>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileNavigation>();
  const { user, logout, refreshUser } = useAuth();
  const { showToast } = useToast();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showSuccess, setShowSuccess] = useState(false);
  const isExpert = user?.role === 'EXPERT' || user?.role === 'ADMIN';

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<FormValues>({
    defaultValues: mapUserToFormValues(user),
  });

  useEffect(() => {
    reset(mapUserToFormValues(user));
  }, [user, reset]);

  useEffect(() => {
    if (!showSuccess) {
      return;
    }
    const timeout = setTimeout(() => setShowSuccess(false), 3000);
    return () => clearTimeout(timeout);
  }, [showSuccess]);

  const updateProfileMutation = useMutation({
    mutationFn: (payload: UpdateProfileRequest) => authApi.updateProfile(payload),
    onError: error => showToast(mapApiError(error).message, 'error'),
  });

  const onSubmit = handleSubmit(async values => {
    try {
      await updateProfileMutation.mutateAsync(mapFormToPayload(values));
      reset(values);
      setShowSuccess(true);
      showToast('Profile updated', 'success');
      await refreshUser();
    } catch (error) {
      // handled by mutation onError
    }
  });

  const handleLogout = async () => {
    await logout();
    showToast('Signed out successfully', 'info');
  };

  const topicsCount = user?.topicsOfInterest?.length ?? 0;
  const proficiencyLabel =
    proficiencyOptions.find(option => option.value === user?.proficiencyLevel)?.label ?? 'Not set';

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.heading}>Profile</Text>
        <Text style={styles.subheading}>Fine-tune your study preferences and account details.</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>
              {user?.fullName?.charAt(0) ?? user?.username?.charAt(0) ?? 'U'}
            </Text>
          </View>
          <View style={styles.profileMeta}>
            <Text style={styles.profileName}>{user?.fullName ?? user?.username}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? 'Email not provided'}</Text>
          </View>
        </View>

        <View style={styles.detailGrid}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Role</Text>
            <Text style={styles.detailValue}>{user?.role ?? 'Member'}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Member since</Text>
            <Text style={styles.detailValue}>
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently joined'}
            </Text>
          </View>
        </View>

        {/* Expert Profile Button */}
        {isExpert && (
          <Pressable
            style={styles.expertProfileButton}
            onPress={() => navigation.navigate('ExpertProfileEdit')}
          >
            <Ionicons name="school" size={20} color={colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.expertProfileButtonTitle}>Expert Profile</Text>
              <Text style={styles.expertProfileButtonSubtitle}>Set up your expertise, qualifications & availability</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="book" size={20} color={colors.accent} />
          <Text style={styles.statValue}>{topicsCount}</Text>
          <Text style={styles.statLabel}>Topics tracked</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trending-up" size={20} color={colors.accent} />
          <Text style={styles.statValue}>{proficiencyLabel}</Text>
          <Text style={styles.statLabel}>Proficiency level</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Learning preferences</Text>
        <Text style={styles.sectionSubtitle}>
          Help StudyBuddy match you with the right groups, experts, and study sessions.
        </Text>

        {showSuccess ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.successText}>Profile updated successfully.</Text>
          </View>
        ) : null}

        <TextField
          control={control}
          name="topicsOfInterest"
          label="Topics of interest"
          placeholder="Machine Learning, Data Structures, Algorithms"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.helperText}>Separate topics with commas</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Proficiency level</Text>
          <Controller
            control={control}
            name="proficiencyLevel"
            render={({ field: { value, onChange } }) => (
              <View style={styles.pillRow}>
                {proficiencyOptions.map(option => (
                  <Pressable
                    key={option.value}
                    style={[styles.pill, value === option.value ? styles.pillActive : null]}
                    onPress={() => onChange(option.value)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.pillLabel, value === option.value ? styles.pillLabelActive : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          />
        </View>

        <TextField
          control={control}
          name="preferredLanguages"
          label="Preferred languages"
          placeholder="English, Spanish"
          autoCapitalize="words"
        />
        <Text style={styles.helperText}>Separate languages with commas</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Collaboration style</Text>
          <Controller
            control={control}
            name="collaborationStyle"
            render={({ field: { value, onChange } }) => (
              <View style={styles.optionGrid}>
                {collaborationOptions.map(option => {
                  const isActive = value === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      style={[styles.optionCard, isActive ? styles.optionCardActive : null]}
                      onPress={() => onChange(option.value)}
                      accessibilityRole="button"
                    >
                      <Text style={[styles.optionTitle, isActive ? styles.optionTitleActive : null]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.optionDescription, isActive ? styles.optionDescriptionActive : null]}>
                        {option.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          />
        </View>

        <TextField
          control={control}
          name="availability"
          label="Availability"
          placeholder="Weekdays 6pm-9pm, Weekends 10am-2pm"
          multiline
          style={styles.textArea}
        />

        <Button
          label="Save changes"
          onPress={onSubmit}
          loading={updateProfileMutation.isPending}
          disabled={!isDirty && !updateProfileMutation.isPending}
        />
      </View>

      {/* Settings Section */}
      <View style={styles.settingsCard}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        {/* Dark Mode Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <View style={[styles.settingIcon, { backgroundColor: isDark ? colors.primaryLight : colors.primaryLight }]}>
              <Ionicons 
                name={isDark ? 'moon' : 'sunny'} 
                size={18} 
                color={colors.primary} 
              />
            </View>
            <View>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDescription}>
                {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={isDark ? colors.textOnPrimary : colors.surface}
            ios_backgroundColor={colors.border}
          />
        </View>
      </View>

      <Button label="Sign out" onPress={handleLogout} variant="secondary" icon="log-out-outline" />
    </Screen>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    header: {
      gap: spacing.xs,
    },
    heading: {
      fontSize: typography.heading,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subheading: {
      fontSize: typography.body,
      color: colors.textSecondary,
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      gap: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.accentMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLabel: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.surface,
    },
    profileMeta: {
      flex: 1,
      gap: 4,
    },
    profileName: {
      fontSize: typography.subheading,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    profileEmail: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    detailGrid: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    detailColumn: {
      flex: 1,
      gap: spacing.xs,
    },
    detailLabel: {
      fontSize: typography.caption,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    detailValue: {
      fontSize: typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    expertProfileButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: `${colors.secondary}15`,
      borderRadius: 12,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: `${colors.secondary}30`,
    },
    expertProfileButtonTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    expertProfileButtonSubtitle: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'flex-start',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: typography.subheading,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: 12,
      backgroundColor: colors.success + '1A',
    },
    successText: {
      fontSize: 14,
      color: colors.success,
      fontWeight: '600',
    },
    helperText: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: -spacing.sm,
      marginBottom: spacing.sm,
    },
    fieldGroup: {
      gap: spacing.sm,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    pillRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      flexWrap: 'wrap',
    },
    pill: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
    },
    pillActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surfaceAlt,
      shadowColor: colors.accent,
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 2,
    },
    pillLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    pillLabelActive: {
      color: colors.accent,
      fontWeight: '700',
    },
    optionGrid: {
      gap: spacing.sm,
    },
    optionCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: spacing.md,
      gap: spacing.xs,
      backgroundColor: colors.surfaceAlt,
    },
    optionCardActive: {
      borderColor: colors.accent,
      backgroundColor: colors.surface,
      shadowColor: colors.accent,
      shadowOpacity: 0.16,
      shadowRadius: 10,
      elevation: 2,
    },
    optionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    optionTitleActive: {
      color: colors.accent,
    },
    optionDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    optionDescriptionActive: {
      color: colors.textPrimary,
    },
    textArea: {
      minHeight: 110,
      textAlignVertical: 'top',
    },
    settingsCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
    },
    settingInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flex: 1,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    settingDescription: {
      fontSize: 13,
      color: colors.textMuted,
    },
  });

export default ProfileScreen;
