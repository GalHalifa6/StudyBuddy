import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../api/auth';
import { OnboardingSubmission, QuestionnaireAnswer } from '../../api/types';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { mapApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { useAppTheme, Palette } from '../../theme/ThemeProvider';
import { spacing, borderRadius } from '../../theme/spacing';

// Types
interface OnboardingOption {
  label: string;
  value: string;
}

type QuestionType = 'single' | 'multi' | 'text';

interface OnboardingQuestion {
  key: string;
  prompt: string;
  type: QuestionType;
  options?: OnboardingOption[];
  helper?: string;
  placeholder?: string;
}

interface OnboardingSection {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  requiredKeys: string[];
  questions: OnboardingQuestion[];
}

// Questions data
const QUESTION_SECTIONS: OnboardingSection[] = [
  {
    id: 'foundations',
    title: 'Build Your Learning Blueprint',
    description: 'Help us understand what you want to accomplish.',
    icon: 'bulb',
    requiredKeys: ['primary_goal', 'proficiency_level', 'topics_interest'],
    questions: [
      {
        key: 'primary_goal',
        prompt: 'What is your primary outcome?',
        type: 'single',
        options: [
          { label: 'Boost my grades', value: 'boost_grades' },
          { label: 'Ace exams', value: 'ace_exams' },
          { label: 'Build portfolio', value: 'build_portfolio' },
          { label: 'Stay accountable', value: 'stay_accountable' },
          { label: 'Master fundamentals', value: 'master_fundamentals' },
        ],
      },
      {
        key: 'proficiency_level',
        prompt: 'How confident do you feel with your subjects?',
        type: 'single',
        options: [
          { label: 'Just starting out', value: 'beginner' },
          { label: 'Comfortable with basics', value: 'intermediate' },
          { label: 'Ready for advanced', value: 'advanced' },
        ],
      },
      {
        key: 'topics_interest',
        prompt: 'Which topics excite you most?',
        type: 'multi',
        helper: 'Pick as many as you like.',
        options: [
          { label: 'Algorithms & DS', value: 'Algorithms & Data Structures' },
          { label: 'Machine Learning', value: 'Machine Learning & AI' },
          { label: 'Web Dev', value: 'Web Development' },
          { label: 'Mobile Dev', value: 'Mobile Development' },
          { label: 'Systems & DevOps', value: 'Systems & DevOps' },
          { label: 'Cybersecurity', value: 'Cybersecurity' },
          { label: 'Cloud', value: 'Cloud & Infrastructure' },
          { label: 'Math & Stats', value: 'Mathematics & Statistics' },
        ],
      },
    ],
  },
  {
    id: 'rhythm',
    title: 'Shape Your Study Rhythm',
    description: 'Tell us when and how you like to work.',
    icon: 'time',
    requiredKeys: ['study_hours_per_week', 'learning_style'],
    questions: [
      {
        key: 'study_hours_per_week',
        prompt: 'Hours per week for studying?',
        type: 'single',
        options: [
          { label: '2–4 hours', value: 'hours_2_4' },
          { label: '5–8 hours', value: 'hours_5_8' },
          { label: '9–12 hours', value: 'hours_9_12' },
          { label: '12+ hours', value: 'hours_12_plus' },
        ],
      },
      {
        key: 'learning_style',
        prompt: 'What collaboration style fits you?',
        type: 'single',
        options: [
          { label: 'Deep focus, async check-ins', value: 'quiet_focus' },
          { label: 'Balanced mix', value: 'balanced' },
          { label: 'Highly collaborative', value: 'discussion_heavy' },
        ],
      },
    ],
  },
  {
    id: 'collaboration',
    title: 'Collaboration Preferences',
    description: 'How do you prefer to connect and contribute?',
    icon: 'people',
    requiredKeys: ['communication_channel'],
    questions: [
      {
        key: 'communication_channel',
        prompt: 'Your go-to channel for staying in touch?',
        type: 'single',
        options: [
          { label: 'Chat (Slack, Discord)', value: 'chat' },
          { label: 'Video calls', value: 'video' },
          { label: 'Async threads', value: 'async' },
          { label: 'Flexible', value: 'flexible' },
        ],
      },
      {
        key: 'support_needed',
        prompt: 'Where do you want the most support?',
        type: 'multi',
        options: [
          { label: 'Clarifying theory', value: 'clarify_theory' },
          { label: 'Study plan', value: 'study_plan' },
          { label: 'Accountability', value: 'accountability' },
          { label: 'Peer reviews', value: 'peer_reviews' },
          { label: 'Finding resources', value: 'resource_scouting' },
          { label: 'Interview prep', value: 'interview_prep' },
        ],
      },
    ],
  },
];

const OnboardingScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showToast } = useToast();
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();

  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const section = QUESTION_SECTIONS[currentSection];
  const isFirst = currentSection === 0;
  const isLast = currentSection === QUESTION_SECTIONS.length - 1;
  const progress = (currentSection + 1) / QUESTION_SECTIONS.length;

  const submitMutation = useMutation({
    mutationFn: (payload: OnboardingSubmission) => authApi.submitOnboarding(payload),
    onSuccess: async () => {
      showToast('Welcome to StudyBuddy! 🎉', 'success');
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      await refreshUser();
    },
    onError: error => {
      showToast(mapApiError(error).message, 'error');
    },
  });

  const handleAnswer = useCallback((key: string, value: string, type: QuestionType) => {
    setAnswers(prev => {
      if (type === 'multi') {
        const current = (prev[key] as string[]) ?? [];
        return {
          ...prev,
          [key]: current.includes(value)
            ? current.filter(v => v !== value)
            : [...current, value],
        };
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const handleTextAnswer = useCallback((key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

  const canProceed = useMemo(() => {
    return section.requiredKeys.every(key => {
      const answer = answers[key];
      if (Array.isArray(answer)) return answer.length > 0;
      return Boolean(answer);
    });
  }, [section, answers]);

  const handleNext = () => {
    if (isLast) {
      handleSubmit();
    } else {
      setCurrentSection(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentSection(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    submitMutation.mutate({ skip: true, responses: [] });
  };

  const handleSubmit = () => {
    const responses: QuestionnaireAnswer[] = Object.entries(answers).map(([key, value]) => ({
      questionKey: key,
      answer: Array.isArray(value) ? value.join(',') : value,
    }));

    const topicsOfInterest = (answers['topics_interest'] as string[]) ?? [];
    const proficiencyLevel = answers['proficiency_level'] as string;
    const collaborationStyle = answers['learning_style'] as string;

    const payload: OnboardingSubmission = {
      responses,
      topicsOfInterest,
      proficiencyLevel,
      collaborationStyle,
    };

    submitMutation.mutate(payload);
  };

  const renderOption = (question: OnboardingQuestion, option: OnboardingOption) => {
    const isMulti = question.type === 'multi';
    const currentAnswer = answers[question.key];
    const isSelected = isMulti
      ? (currentAnswer as string[] | undefined)?.includes(option.value)
      : currentAnswer === option.value;

    return (
      <Pressable
        key={option.value}
        style={[styles.option, isSelected && styles.optionSelected]}
        onPress={() => handleAnswer(question.key, option.value, question.type)}
      >
        <View style={[styles.optionCheck, isSelected && styles.optionCheckSelected]}>
          {isSelected && (
            <Ionicons name="checkmark" size={14} color={colors.textOnPrimary} />
          )}
        </View>
        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
          {option.label}
        </Text>
      </Pressable>
    );
  };

  const renderQuestion = (question: OnboardingQuestion, index: number) => (
    <View style={styles.questionCard} key={index}>
      <Text style={styles.questionPrompt}>{question.prompt}</Text>
      {question.helper && (
        <Text style={styles.questionHelper}>{question.helper}</Text>
      )}
      {question.type === 'text' ? (
        <TextInput
          style={styles.textInput}
          placeholder={question.placeholder ?? 'Type here...'}
          placeholderTextColor={colors.textMuted}
          value={(answers[question.key] as string) ?? ''}
          onChangeText={text => handleTextAnswer(question.key, text)}
          multiline
        />
      ) : (
        <View style={styles.optionsGrid}>
          {question.options?.map(option => renderOption(question, option))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[colors.heroGradientStart, colors.heroGradientMid, colors.heroGradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerBadge}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={styles.headerBadgeText}>PERSONALIZE</Text>
          </View>
          <Text style={styles.headerTitle}>Let's set you up</Text>
          <Text style={styles.headerSubtitle}>
            Answer a few questions to customize your experience
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {currentSection + 1} of {QUESTION_SECTIONS.length}
          </Text>
        </View>
      </LinearGradient>

      {/* Section Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name={section.icon} size={24} color={colors.primary} />
          </View>
          <View style={styles.sectionTitleWrap}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionDescription}>{section.description}</Text>
          </View>
        </View>

        {section.questions.map((q, idx) => renderQuestion(q, idx))}
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          {!isFirst && (
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
              <Text style={styles.backButtonText}>Back</Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }} />
          <Button
            label={isLast ? 'Complete Setup' : 'Continue'}
            onPress={handleNext}
            disabled={!canProceed || submitMutation.isPending}
            loading={submitMutation.isPending}
            icon={isLast ? 'checkmark-circle' : 'arrow-forward'}
          />
        </View>
        <Pressable style={styles.skipButton} onPress={handleSkip} disabled={submitMutation.isPending}>
          {submitMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : (
            <Text style={styles.skipButtonText}>Skip for now</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      borderBottomLeftRadius: borderRadius.xxl,
      borderBottomRightRadius: borderRadius.xxl,
    },
    headerContent: {
      gap: spacing.xs,
    },
    headerBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    headerBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.primary,
      letterSpacing: 1,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    headerSubtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    progressContainer: {
      marginTop: spacing.lg,
      gap: spacing.sm,
    },
    progressBar: {
      height: 6,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.full,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: borderRadius.full,
    },
    progressText: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: 'right',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    sectionIcon: {
      width: 48,
      height: 48,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitleWrap: {
      flex: 1,
      gap: 4,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    sectionDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
    },
    questionCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      gap: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    questionPrompt: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    questionHelper: {
      fontSize: 13,
      color: colors.textMuted,
    },
    optionsGrid: {
      gap: spacing.sm,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionSelected: {
      backgroundColor: colors.primaryLight,
      borderColor: colors.primary,
    },
    optionCheck: {
      width: 24,
      height: 24,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionCheckSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    optionLabel: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
    },
    optionLabelSelected: {
      fontWeight: '600',
    },
    textInput: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      fontSize: 15,
      color: colors.textPrimary,
      minHeight: 80,
      textAlignVertical: 'top',
      borderWidth: 1,
      borderColor: colors.border,
    },
    footer: {
      padding: spacing.lg,
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      padding: spacing.md,
    },
    backButtonText: {
      fontSize: 15,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    skipButton: {
      alignItems: 'center',
      padding: spacing.sm,
    },
    skipButtonText: {
      fontSize: 14,
      color: colors.textMuted,
      fontWeight: '500',
    },
  });

export default OnboardingScreen;
