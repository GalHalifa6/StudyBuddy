import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { ProfileStackParamList } from '../../navigation/types';
import { expertsApi } from '../../api/experts';
import { ExpertProfileRequest } from '../../api/types';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ExpertProfileEdit'>;

const ExpertProfileEditScreen: React.FC<Props> = ({ navigation }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = useAuth();

  // Form state
  const [title, setTitle] = useState('');
  const [institution, setInstitution] = useState('');
  const [bio, setBio] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [specializationsInput, setSpecializationsInput] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [offersGroupConsultations, setOffersGroupConsultations] = useState(true);
  const [offersOneOnOne, setOffersOneOnOne] = useState(true);
  const [offersAsyncQA, setOffersAsyncQA] = useState(true);
  const [maxSessionsPerWeek, setMaxSessionsPerWeek] = useState('10');
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState('60');
  const [linkedInUrl, setLinkedInUrl] = useState('');
  const [personalWebsite, setPersonalWebsite] = useState('');

  // Fetch existing profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['experts', 'my-profile'],
    queryFn: expertsApi.getMyProfile,
    retry: 1,
  });

  // Populate form with existing data
  useEffect(() => {
    if (profile) {
      setTitle(profile.title || '');
      setInstitution(profile.institution || '');
      setBio(profile.bio || '');
      setQualifications(profile.qualifications || '');
      setYearsOfExperience(profile.yearsOfExperience?.toString() || '');
      setSpecializations(profile.specializations || []);
      setSkills(profile.skills || []);
      setOffersGroupConsultations(profile.offersGroupConsultations ?? true);
      setOffersOneOnOne(profile.offersOneOnOne ?? true);
      setOffersAsyncQA(profile.offersAsyncQA ?? true);
      setMaxSessionsPerWeek(profile.maxSessionsPerWeek?.toString() || '10');
      setSessionDurationMinutes(profile.sessionDurationMinutes?.toString() || '60');
      setLinkedInUrl(profile.linkedInUrl || '');
      setPersonalWebsite(profile.personalWebsite || '');
    }
  }, [profile]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (payload: ExpertProfileRequest) => expertsApi.saveProfile(payload),
    onSuccess: () => {
      showToast('Profile saved successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['experts'] });
      navigation.goBack();
    },
    onError: error => {
      showToast(mapApiError(error).message, 'error');
    },
  });

  const handleAddSpecialization = () => {
    const trimmed = specializationsInput.trim();
    if (trimmed && !specializations.includes(trimmed)) {
      setSpecializations([...specializations, trimmed]);
      setSpecializationsInput('');
    }
  };

  const handleRemoveSpecialization = (item: string) => {
    setSpecializations(specializations.filter(s => s !== item));
  };

  const handleAddSkill = () => {
    const trimmed = skillsInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillsInput('');
    }
  };

  const handleRemoveSkill = (item: string) => {
    setSkills(skills.filter(s => s !== item));
  };

  const handleSave = () => {
    const payload: ExpertProfileRequest = {
      title,
      institution,
      bio,
      qualifications,
      yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience, 10) : undefined,
      specializations,
      skills,
      offersGroupConsultations,
      offersOneOnOne,
      offersAsyncQA,
      maxSessionsPerWeek: maxSessionsPerWeek ? parseInt(maxSessionsPerWeek, 10) : undefined,
      sessionDurationMinutes: sessionDurationMinutes ? parseInt(sessionDurationMinutes, 10) : undefined,
      linkedInUrl: linkedInUrl || undefined,
      personalWebsite: personalWebsite || undefined,
    };

    saveMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'E'}
                </Text>
              </View>
              <View style={styles.expertBadge}>
                <Ionicons name="school" size={12} color="#fff" />
              </View>
            </View>
            <Text style={styles.heading}>Expert Profile</Text>
            <Text style={styles.subheading}>
              Complete your profile to help students find and connect with you
            </Text>
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Professional Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Senior Software Engineer"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Institution / Company</Text>
              <TextInput
                style={styles.input}
                value={institution}
                onChangeText={setInstitution}
                placeholder="e.g., MIT, Google, etc."
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell students about your expertise and teaching style..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Qualifications</Text>
              <TextInput
                style={styles.input}
                value={qualifications}
                onChangeText={setQualifications}
                placeholder="e.g., Ph.D. Computer Science, AWS Certified"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Years of Experience</Text>
              <TextInput
                style={styles.input}
                value={yearsOfExperience}
                onChangeText={setYearsOfExperience}
                placeholder="e.g., 5"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Specializations */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Specializations</Text>
            <View style={styles.tagInputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={specializationsInput}
                onChangeText={setSpecializationsInput}
                placeholder="Add a specialization"
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={handleAddSpecialization}
              />
              <Pressable style={styles.addButton} onPress={handleAddSpecialization}>
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.tagsContainer}>
              {specializations.map((item, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{item}</Text>
                  <Pressable onPress={() => handleRemoveSpecialization(item)}>
                    <Ionicons name="close-circle" size={16} color={colors.primary} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          {/* Skills */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.tagInputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={skillsInput}
                onChangeText={setSkillsInput}
                placeholder="Add a skill"
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={handleAddSkill}
              />
              <Pressable style={styles.addButton} onPress={handleAddSkill}>
                <Ionicons name="add" size={20} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.tagsContainer}>
              {skills.map((item, index) => (
                <View key={index} style={[styles.tag, { backgroundColor: `${colors.secondary}20` }]}>
                  <Text style={[styles.tagText, { color: colors.secondary }]}>{item}</Text>
                  <Pressable onPress={() => handleRemoveSkill(item)}>
                    <Ionicons name="close-circle" size={16} color={colors.secondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          {/* Service Offerings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Offerings</Text>
            
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Group Consultations</Text>
                <Text style={styles.switchDescription}>Offer group study sessions</Text>
              </View>
              <Switch
                value={offersGroupConsultations}
                onValueChange={setOffersGroupConsultations}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>One-on-One Sessions</Text>
                <Text style={styles.switchDescription}>Offer private tutoring</Text>
              </View>
              <Switch
                value={offersOneOnOne}
                onValueChange={setOffersOneOnOne}
                trackColor={{ true: colors.primary }}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Async Q&A</Text>
                <Text style={styles.switchDescription}>Answer questions asynchronously</Text>
              </View>
              <Switch
                value={offersAsyncQA}
                onValueChange={setOffersAsyncQA}
                trackColor={{ true: colors.primary }}
              />
            </View>
          </View>

          {/* Availability */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Availability</Text>
            
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Max Sessions Per Week</Text>
              <TextInput
                style={styles.input}
                value={maxSessionsPerWeek}
                onChangeText={setMaxSessionsPerWeek}
                placeholder="10"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Session Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={sessionDurationMinutes}
                onChangeText={setSessionDurationMinutes}
                placeholder="60"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Links */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Links</Text>
            
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>LinkedIn URL</Text>
              <TextInput
                style={styles.input}
                value={linkedInUrl}
                onChangeText={setLinkedInUrl}
                placeholder="https://linkedin.com/in/yourprofile"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Personal Website</Text>
              <TextInput
                style={styles.input}
                value={personalWebsite}
                onChangeText={setPersonalWebsite}
                placeholder="https://yourwebsite.com"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>
          </View>

          <Button
            label={saveMutation.isPending ? 'Saving...' : 'Save Profile'}
            onPress={handleSave}
            loading={saveMutation.isPending}
            style={styles.saveButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
    },
    loadingText: {
      fontSize: typography.body,
      color: colors.textSecondary,
    },
    header: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    avatarContainer: {
      position: 'relative',
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 32,
      fontWeight: '700',
      color: '#fff',
    },
    expertBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    heading: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    subheading: {
      fontSize: typography.body,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    fieldGroup: {
      gap: spacing.xs,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      fontSize: 16,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    tagInputRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    addButton: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: `${colors.primary}20`,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    tagText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '500',
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    switchLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    switchDescription: {
      fontSize: 13,
      color: colors.textMuted,
    },
    saveButton: {
      marginTop: spacing.md,
    },
  });

export default ExpertProfileEditScreen;
