import api from './client';

// ==================== Types ====================

export interface QuizOption {
  optionId: number;
  optionText: string;
  orderIndex: number;
}

export interface QuizQuestion {
  questionId: number;
  questionText: string;
  orderIndex: number;
  options: QuizOption[];
}

export interface QuizSubmission {
  answers: Record<number, number>; // questionId -> selectedOptionId
}

export type QuizStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface ProfileResponse {
  userId: number;
  message: string;
  profileCompleted?: boolean;
  quizStatus: QuizStatus;
  reliabilityPercentage: number;
  requiresOnboarding: boolean;
}

export interface OnboardingStatusResponse {
  userId: number;
  requiresOnboarding: boolean;
  quizStatus: QuizStatus;
}

// ==================== API Calls ====================

export const quizApi = {
  /**
   * Get all quiz questions.
   * GET /api/quiz
   */
  getQuiz: async (): Promise<QuizQuestion[]> => {
    const { data } = await api.get<QuizQuestion[]>('/quiz');
    return data;
  },

  /**
   * Submit quiz answers.
   * POST /api/quiz/submit
   */
  submitQuiz: async (submission: QuizSubmission): Promise<ProfileResponse> => {
    const { data } = await api.post<ProfileResponse>('/quiz/submit', submission);
    return data;
  },

  /**
   * Get current user's profile.
   * GET /api/quiz/profile
   */
  getProfile: async (): Promise<ProfileResponse> => {
    const { data } = await api.get<ProfileResponse>('/quiz/profile');
    return data;
  },

  /**
   * Get onboarding status (quick check after login).
   * GET /api/quiz/onboarding-status
   */
  getOnboardingStatus: async (): Promise<OnboardingStatusResponse> => {
    const { data } = await api.get<OnboardingStatusResponse>('/quiz/onboarding-status');
    return data;
  },

  /**
   * Skip the quiz entirely.
   * POST /api/quiz/skip
   */
  skipQuiz: async (): Promise<ProfileResponse> => {
    const { data } = await api.post<ProfileResponse>('/quiz/skip');
    return data;
  },
};

export default quizApi;
