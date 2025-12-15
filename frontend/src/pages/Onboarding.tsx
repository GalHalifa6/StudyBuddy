import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../api';
import { useAuth } from '../context/AuthContext';
import { OnboardingSubmission, QuestionnaireAnswer } from '../types';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Lightbulb,
  Loader2,
  ListChecks,
  RefreshCcw,
  Sparkles,
  TrendingUp
} from 'lucide-react';

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
  requiredKeys: string[];
  questions: OnboardingQuestion[];
}

const QUESTION_SECTIONS: OnboardingSection[] = [
  {
    id: 'foundations',
    title: 'Build Your Learning Blueprint',
    description: 'Help us understand what you want to accomplish so we can find the right courses, groups, and experts for you.',
    requiredKeys: ['primary_goal', 'proficiency_level', 'topics_interest', 'preferred_languages', 'learning_style'],
    questions: [
      {
        key: 'primary_goal',
        prompt: 'What is the primary outcome you want from StudyBuddy this term?',
        type: 'single',
        options: [
          { label: 'Boost my grades and stay on track', value: 'boost_grades' },
          { label: 'Ace upcoming exams or certifications', value: 'ace_exams' },
          { label: 'Build a project portfolio', value: 'build_portfolio' },
          { label: 'Stay accountable with consistent study habits', value: 'stay_accountable' },
          { label: 'Master tough concepts for long-term understanding', value: 'master_fundamentals' }
        ]
      },
      {
        key: 'proficiency_level',
        prompt: 'How confident do you feel with the subjects you are studying right now?',
        type: 'single',
        options: [
          { label: 'Just starting out', value: 'beginner' },
          { label: 'Comfortable with the basics', value: 'intermediate' },
          { label: 'Ready for advanced challenges', value: 'advanced' }
        ]
      },
      {
        key: 'topics_interest',
        prompt: 'Which topics excite you most right now?',
        type: 'multi',
        helper: 'Pick as many as you like—we will use these to recommend courses, groups, and experts.',
        options: [
          { label: 'Algorithms & Data Structures', value: 'Algorithms & Data Structures' },
          { label: 'Machine Learning & AI', value: 'Machine Learning & AI' },
          { label: 'Web Development', value: 'Web Development' },
          { label: 'Mobile Development', value: 'Mobile Development' },
          { label: 'Systems & DevOps', value: 'Systems & DevOps' },
          { label: 'Cybersecurity', value: 'Cybersecurity' },
          { label: 'Cloud & Infrastructure', value: 'Cloud & Infrastructure' },
          { label: 'Mathematics & Statistics', value: 'Mathematics & Statistics' },
          { label: 'Product & UX', value: 'Product & UX' },
          { label: 'Writing & Communication', value: 'Writing & Communication' }
        ]
      },
      {
        key: 'preferred_languages',
        prompt: 'What languages would you like to study and collaborate in?',
        type: 'multi',
        options: [
          { label: 'English', value: 'English' },
          { label: 'Spanish', value: 'Spanish' },
          { label: 'French', value: 'French' },
          { label: 'German', value: 'German' },
          { label: 'Portuguese', value: 'Portuguese' },
          { label: 'Mandarin', value: 'Mandarin' },
          { label: 'Hindi', value: 'Hindi' },
          { label: 'Arabic', value: 'Arabic' },
          { label: 'Other', value: 'Other' }
        ]
      },
      {
        key: 'learning_style',
        prompt: 'What mix of collaboration fits you best?',
        type: 'single',
        helper: 'This helps us match you with the right groups and experts.',
        options: [
          { label: 'Deep-focus sessions with async check-ins', value: 'quiet_focus' },
          { label: 'Balanced mix of async updates and scheduled discussions', value: 'balanced' },
          { label: 'Highly collaborative, live sessions & rapid feedback', value: 'discussion_heavy' }
        ]
      }
    ]
  },
  {
    id: 'rhythm',
    title: 'Shape Your Study Rhythm',
    description: 'Tell us when and how you like to work so groups and sessions align with your energy.',
    requiredKeys: ['study_hours_per_week', 'preferred_session_time', 'accountability_preference', 'feedback_frequency'],
    questions: [
      {
        key: 'study_hours_per_week',
        prompt: 'How many hours per week can you realistically dedicate to studying?',
        type: 'single',
        options: [
          { label: '2–4 hours', value: 'hours_2_4' },
          { label: '5–8 hours', value: 'hours_5_8' },
          { label: '9–12 hours', value: 'hours_9_12' },
          { label: '12+ hours', value: 'hours_12_plus' }
        ]
      },
      {
        key: 'preferred_session_time',
        prompt: 'When do you prefer to learn with others?',
        type: 'multi',
        options: [
          { label: 'Weekday mornings', value: 'weekday_mornings' },
          { label: 'Weekday afternoons', value: 'weekday_afternoons' },
          { label: 'Weekday evenings', value: 'weekday_evenings' },
          { label: 'Weekend mornings', value: 'weekend_mornings' },
          { label: 'Weekend afternoons', value: 'weekend_afternoons' },
          { label: 'Weekend evenings', value: 'weekend_evenings' }
        ]
      },
      {
        key: 'availability_notes',
        prompt: 'Anything else we should know about your availability?',
        type: 'text',
        placeholder: 'e.g., "Tuesdays after 7pm only" or "Rotating schedule every other week"'
      },
      {
        key: 'accountability_preference',
        prompt: 'What keeps you on track?',
        type: 'single',
        options: [
          { label: 'Gentle reminders and nudges', value: 'gentle_nudges' },
          { label: 'Structured milestones and deadlines', value: 'structured_deadlines' },
          { label: 'Working alongside a motivated partner', value: 'study_partner' },
          { label: 'Sharing progress with a larger group', value: 'group_updates' }
        ]
      },
      {
        key: 'feedback_frequency',
        prompt: 'How frequently would you like feedback or check-ins?',
        type: 'single',
        options: [
          { label: 'After every focused session', value: 'after_every_session' },
          { label: 'Weekly summary is perfect', value: 'weekly' },
          { label: 'Bi-weekly reviews are enough', value: 'bi_weekly' },
          { label: 'Only when something important comes up', value: 'on_demand' }
        ]
      }
    ]
  },
  {
    id: 'collaboration',
    title: 'Dial in Collaboration Preferences',
    description: 'Align the support you receive with the way you prefer to connect and contribute.',
    requiredKeys: ['communication_channel', 'support_needed'],
    questions: [
      {
        key: 'communication_channel',
        prompt: 'What is your go-to channel for keeping in touch?',
        type: 'single',
        options: [
          { label: 'Chat-first (Slack, Discord, etc.)', value: 'chat' },
          { label: 'Video calls or live rooms', value: 'video' },
          { label: 'Discussion boards or async threads', value: 'async' },
          { label: 'I am flexible with any channel', value: 'flexible' }
        ]
      },
      {
        key: 'group_role',
        prompt: 'Which role best describes how you show up in groups?',
        type: 'single',
        options: [
          { label: 'I facilitate and help others move forward', value: 'facilitator' },
          { label: 'I contribute ideas and resources', value: 'contributor' },
          { label: 'I prefer to listen first, then share', value: 'listener' },
          { label: 'I am here to learn quietly in the background', value: 'independent' }
        ]
      },
      {
        key: 'support_needed',
        prompt: 'Where do you want the most support right now?',
        type: 'multi',
        options: [
          { label: 'Clarifying confusing theory', value: 'clarify_theory' },
          { label: 'Building a study plan or roadmap', value: 'study_plan' },
          { label: 'Staying consistent and accountable', value: 'accountability' },
          { label: 'Peer reviews on assignments/projects', value: 'peer_reviews' },
          { label: 'Finding the right resources faster', value: 'resource_scouting' },
          { label: 'Preparing for interviews or assessments', value: 'interview_prep' }
        ]
      },
      {
        key: 'preferred_resources',
        prompt: 'What resources do you enjoy using the most?',
        type: 'multi',
        options: [
          { label: 'Short videos & explainers', value: 'short_videos' },
          { label: 'Long-form articles or books', value: 'long_form' },
          { label: 'Interactive coding challenges', value: 'interactive_challenges' },
          { label: 'Live workshops & webinars', value: 'live_workshops' },
          { label: 'Cheat sheets or quick reference guides', value: 'cheat_sheets' }
        ]
      },
      {
        key: 'tools_used',
        prompt: 'Which tools or platforms are already part of your workflow?',
        type: 'multi',
        options: [
          { label: 'Notion or similar planners', value: 'notion' },
          { label: 'Trello / Asana / ClickUp', value: 'project_boards' },
          { label: 'Obsidian / Roam / personal knowledge base', value: 'pkm' },
          { label: 'Pomodoro or time-tracking apps', value: 'pomodoro' },
          { label: 'Figma / design tooling', value: 'design_tools' },
          { label: 'VS Code / development environments', value: 'dev_env' }
        ]
      }
    ]
  },
  {
    id: 'momentum',
    title: 'Keep Your Momentum Steady',
    description: 'Share what helps you push through tough stretches so we can celebrate wins and remove blockers with you.',
    requiredKeys: ['motivation_level', 'exam_timeline'],
    questions: [
      {
        key: 'biggest_challenge',
        prompt: 'What tends to slow you down or derail your study streak?',
        type: 'text',
        placeholder: 'e.g., "Not sure what to prioritize" or "Get stuck on tough problems"'
      },
      {
        key: 'motivation_level',
        prompt: 'How is your motivation right now?',
        type: 'single',
        options: [
          { label: 'Running low—need a jump start', value: 'low' },
          { label: 'Steady but could use encouragement', value: 'steady' },
          { label: 'Fired up and ready to sprint', value: 'high' }
        ]
      },
      {
        key: 'exam_timeline',
        prompt: 'Do you have important exams, assessments, or deadlines coming up?',
        type: 'single',
        options: [
          { label: 'In the next 2 weeks', value: 'two_weeks' },
          { label: 'Within the next month', value: 'one_month' },
          { label: '60–90 days out', value: 'two_to_three_months' },
          { label: 'No hard deadlines—just improving steadily', value: 'no_deadlines' }
        ]
      },
      {
        key: 'project_focus',
        prompt: 'Is there a specific project or class you want extra help with?',
        type: 'text',
        placeholder: 'e.g., "Capstone ML project" or "Calculus midterm"'
      },
      {
        key: 'career_interest',
        prompt: 'Longer term, what career paths or skills are you building toward?',
        type: 'text',
        placeholder: 'e.g., "Data scientist", "Product designer", "Entrepreneur"'
      }
    ]
  }
];

const QUESTION_LOOKUP = QUESTION_SECTIONS.reduce<Record<string, OnboardingQuestion>>((acc, section) => {
  section.questions.forEach((question) => {
    acc[question.key] = question;
  });
  return acc;
}, {});

const REQUIRED_FOR_PROFILE = ['topics_interest', 'proficiency_level', 'preferred_languages', 'learning_style'] as const;

type ResponseState = Record<string, string | string[]>;

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const [responses, setResponses] = useState<ResponseState>({});
  const [hasHydrated, setHasHydrated] = useState(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user || hasHydrated) {
      return;
    }

    const initial: ResponseState = {};

    if (user.questionnaireResponses) {
      Object.entries(user.questionnaireResponses).forEach(([key, answer]) => {
        const question = QUESTION_LOOKUP[key];
        if (!question || !answer) {
          return;
        }
        if (question.type === 'multi') {
          initial[key] = answer.split('|').map((value) => value.trim()).filter(Boolean);
        } else {
          initial[key] = answer;
        }
      });
    }

    if (user.topicsOfInterest?.length) {
      initial.topics_interest = user.topicsOfInterest;
    }
    if (user.preferredLanguages?.length) {
      initial.preferred_languages = user.preferredLanguages;
    }
    if (user.proficiencyLevel) {
      initial.proficiency_level = user.proficiencyLevel;
    }
    if (user.collaborationStyle) {
      initial.learning_style = user.collaborationStyle;
    }
    if (user.availability) {
      initial.availability_notes = user.availability;
    }

    setResponses(initial);
    setHasHydrated(true);
  }, [user, hasHydrated]);

  const currentSection = QUESTION_SECTIONS[currentSectionIndex];
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === QUESTION_SECTIONS.length - 1;
  const progress = Math.round(((currentSectionIndex + 1) / QUESTION_SECTIONS.length) * 100);

  const getOptionLabel = useCallback((key: string, value: string): string | undefined => {
    const question = QUESTION_LOOKUP[key];
    return question?.options?.find((opt) => opt.value === value)?.label;
  }, []);

  const hasAnswer = useCallback((key: string): boolean => {
    const answer = responses[key];
    if (Array.isArray(answer)) {
      return answer.length > 0;
    }
    if (typeof answer === 'string') {
      return answer.trim().length > 0;
    }
    return false;
  }, [responses]);

  const validateSection = useCallback((section: OnboardingSection): boolean => {
    const missing = section.requiredKeys.filter((key) => !hasAnswer(key));
    if (missing.length > 0) {
      setError('Please complete the required questions before continuing.');
      return false;
    }
    setError(null);
    return true;
  }, [hasAnswer]);

  const recordSingle = (key: string, value: string) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const toggleMulti = (key: string, value: string) => {
    setResponses((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const exists = current.includes(value);
      const updated = exists ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, [key]: updated };
    });
    setError(null);
  };

  const recordText = (key: string, value: string) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const handleNext = () => {
    if (!validateSection(currentSection)) {
      return;
    }
    setCurrentSectionIndex((prev) => Math.min(prev + 1, QUESTION_SECTIONS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevious = () => {
    setCurrentSectionIndex((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buildQuestionnaireResponses = useCallback((): QuestionnaireAnswer[] => {
    const answers: QuestionnaireAnswer[] = [];
    Object.entries(responses).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return;
        }
        answers.push({ questionKey: key, answer: value.join('|') });
      } else if (typeof value === 'string' && value.trim().length > 0) {
        answers.push({ questionKey: key, answer: value.trim() });
      }
    });
    return answers;
  }, [responses]);

  const buildProfilePayload = useCallback((): Partial<OnboardingSubmission> => {
    const topics = Array.isArray(responses.topics_interest)
      ? (responses.topics_interest as string[])
      : typeof responses.topics_interest === 'string'
        ? responses.topics_interest.split(',').map((item) => item.trim()).filter(Boolean)
        : undefined;

    const proficiency = typeof responses.proficiency_level === 'string'
      ? responses.proficiency_level.toLowerCase()
      : undefined;

    const languages = Array.isArray(responses.preferred_languages)
      ? (responses.preferred_languages as string[])
      : typeof responses.preferred_languages === 'string'
        ? responses.preferred_languages.split(',').map((item) => item.trim()).filter(Boolean)
        : undefined;

    const collaborationStyle = typeof responses.learning_style === 'string'
      ? responses.learning_style
      : undefined;

    const slotLabels = Array.isArray(responses.preferred_session_time)
      ? (responses.preferred_session_time as string[])
          .map((value) => getOptionLabel('preferred_session_time', value) ?? value)
      : [];

    const availabilityNote = typeof responses.availability_notes === 'string'
      ? responses.availability_notes.trim()
      : '';

    const availabilityParts: string[] = [];
    if (slotLabels.length > 0) {
      availabilityParts.push(`Preferred slots: ${slotLabels.join(', ')}`);
    }
    if (availabilityNote.length > 0) {
      availabilityParts.push(`Notes: ${availabilityNote}`);
    }

    const availability = availabilityParts.length > 0 ? availabilityParts.join(' | ') : undefined;

    return {
      topicsOfInterest: topics,
      proficiencyLevel: proficiency,
      preferredLanguages: languages,
      collaborationStyle,
      availability
    };
  }, [responses, getOptionLabel]);

  const handleSubmit = async () => {
    const requiredMissing = REQUIRED_FOR_PROFILE.filter((key) => !hasAnswer(key));
    if (requiredMissing.length > 0) {
      setError('Please complete the highlighted questions before finishing.');
      return;
    }
    if (!validateSection(currentSection)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const questionnaireResponses = buildQuestionnaireResponses();
      const basePayload = buildProfilePayload();

      const payload: OnboardingSubmission = {
        skip: false,
        responses: questionnaireResponses,
        topicsOfInterest: basePayload.topicsOfInterest,
        proficiencyLevel: basePayload.proficiencyLevel,
        preferredLanguages: basePayload.preferredLanguages,
        collaborationStyle: basePayload.collaborationStyle,
        availability: basePayload.availability
      };

      await authService.submitOnboarding(payload);
      await refreshUser();
      setSuccessMessage('Preferences saved! Tailoring your StudyBuddy experience...');
      setTimeout(() => navigate('/dashboard'), 1200);
    } catch (submissionError) {
      setError('There was an issue saving your onboarding preferences. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await authService.submitOnboarding({ skip: true, responses: [] });
      await refreshUser();
      navigate('/dashboard');
    } catch (submissionError) {
      setError('Unable to skip onboarding right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSingleQuestion = (question: OnboardingQuestion, isRequired: boolean) => {
    if (!question.options) {
      return null;
    }

    const selected = typeof responses[question.key] === 'string' ? responses[question.key] : '';

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {question.options.map((option) => {
          const isActive = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => recordSingle(question.key, option.value)}
              className={`rounded-xl border-2 px-4 py-3 text-left transition-all ${
                isActive
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600'
              }`}
            >
              <span className="font-medium block">{option.label}</span>
              {isRequired && isActive && (
                <span className="mt-1 inline-flex items-center gap-1 text-xs text-primary-500">
                  <CheckCircle className="h-3 w-3" />
                  Selected
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const renderMultiQuestion = (question: OnboardingQuestion) => {
    if (!question.options) {
      return null;
    }
    const selected = Array.isArray(responses[question.key]) ? (responses[question.key] as string[]) : [];

    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {question.options.map((option) => {
          const isActive = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => toggleMulti(question.key, option.value)}
              className={`rounded-xl border-2 px-4 py-3 text-left transition-all ${
                isActive
                  ? 'border-secondary-500 bg-secondary-50 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 hover:border-secondary-300 dark:hover:border-secondary-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{option.label}</span>
                <span
                  className={`h-5 w-5 rounded-full border-2 ${
                    isActive ? 'border-secondary-500 bg-secondary-500' : 'border-gray-300'
                  }`}
                ></span>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderTextQuestion = (question: OnboardingQuestion) => {
    const value = typeof responses[question.key] === 'string' ? responses[question.key] : '';
    const isLong = (question.placeholder ?? '').length > 60;
    return (
      <textarea
        value={value}
        onChange={(event) => recordText(question.key, event.target.value)}
        placeholder={question.placeholder}
        className="input min-h-[100px] resize-none"
        rows={isLong ? 4 : 3}
      />
    );
  };

  const renderQuestion = (question: OnboardingQuestion, isRequired: boolean) => (
    <div key={question.key} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">
            {question.prompt}
            {isRequired && <span className="ml-1 text-primary-500">*</span>}
          </p>
          {question.helper && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{question.helper}</p>
          )}
        </div>
      </div>

      {question.type === 'single' && renderSingleQuestion(question, isRequired)}
      {question.type === 'multi' && renderMultiQuestion(question)}
      {question.type === 'text' && renderTextQuestion(question)}
    </div>
  );

  const completedRequiredCount = useMemo(() => {
    return REQUIRED_FOR_PROFILE.filter((key) => hasAnswer(key)).length;
  }, [hasAnswer]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 transition-colors duration-200 dark:bg-slate-900 sm:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-primary-600 shadow-sm dark:bg-gray-800 dark:text-primary-300">
              <Sparkles className="h-4 w-4" />
              Personalize StudyBuddy
            </div>
            <h1 className="mt-3 text-3xl font-bold text-gray-900 dark:text-white">Let’s tailor your learning experience</h1>
            <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-400">
              Answer a few quick questions to unlock smarter course recommendations, curated study groups, and experts who fit your style. You can update these any time from Settings.
            </p>
          </div>
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
          >
            <RefreshCcw className="h-4 w-4" />
            Skip for now
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
          <aside className="space-y-4 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-primary-100 p-3 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                <ListChecks className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Progress</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {currentSectionIndex + 1} of {QUESTION_SECTIONS.length} sections
                </p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
                <span>Overall completion</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="rounded-2xl bg-primary-50 p-4 text-sm text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
              <p className="font-semibold">Profile essentials</p>
              <p className="mt-1">
                {completedRequiredCount} of {REQUIRED_FOR_PROFILE.length} key preferences captured.
              </p>
            </div>

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-3">
                <Lightbulb className="mt-0.5 h-4 w-4 text-yellow-500" />
                <span>Use the Skip button any time—you can revisit onboarding later from Settings.</span>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="mt-0.5 h-4 w-4 text-emerald-500" />
                <span>Your answers feed personalized dashboards, recommended groups, and expert matches.</span>
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <header className="mb-6 flex items-start gap-4">
                <div className="rounded-2xl bg-secondary-100 p-3 text-secondary-600 dark:bg-secondary-900/30 dark:text-secondary-300">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase text-secondary-600 dark:text-secondary-300">Section {currentSectionIndex + 1}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{currentSection.title}</h2>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{currentSection.description}</p>
                </div>
              </header>

              <div className="space-y-5">
                {currentSection.questions.map((question) => {
                  const isRequired = currentSection.requiredKeys.includes(question.key);
                  return renderQuestion(question, isRequired);
                })}
              </div>

              {error && (
                <div className="mt-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                  <ArrowLeft className="h-4 w-4" />
                  {error}
                </div>
              )}

              {successMessage && (
                <div className="mt-6 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <CheckCircle className="h-4 w-4" />
                  {successMessage}
                </div>
              )}

              <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={handlePrevious}
                  disabled={isFirstSection || isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-200"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>

                <div className="flex items-center gap-3">
                  {!isLastSection && (
                    <button
                      onClick={handleNext}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}

                  {isLastSection && (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-secondary-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-secondary-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving
                        </>
                      ) : (
                        <>
                          Finish & Personalize
                          <CheckCircle className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
