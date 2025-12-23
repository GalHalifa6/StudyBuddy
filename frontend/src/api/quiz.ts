import axios from './axios';

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

export interface ProfileResponse {
  userId: number;
  message: string;
  profileCompleted?: boolean; // Deprecated, use quizStatus
  quizStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  reliabilityPercentage: number;
  requiresOnboarding: boolean;
}

export interface OnboardingStatusResponse {
  userId: number;
  requiresOnboarding: boolean;
  quizStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
}

// ==================== API Calls ====================

/**
 * Get all quiz questions.
 * GET /api/quiz
 */
export const getQuiz = async (): Promise<QuizQuestion[]> => {
  const response = await axios.get<QuizQuestion[]>('/quiz');
  return response.data;
};

/**
 * Submit quiz answers.
 * POST /api/quiz/submit
 */
export const submitQuiz = async (submission: QuizSubmission): Promise<ProfileResponse> => {
  const response = await axios.post<ProfileResponse>('/quiz/submit', submission);
  return response.data;
};

/**
 * Get current user's profile.
 * GET /api/quiz/profile
 */
export const getProfile = async (): Promise<ProfileResponse> => {
  const response = await axios.get<ProfileResponse>('/quiz/profile');
  return response.data;
};

/**
 * Get onboarding status (quick check after login).
 * GET /api/quiz/onboarding-status
 */
export const getOnboardingStatus = async (): Promise<OnboardingStatusResponse> => {
  const response = await axios.get<OnboardingStatusResponse>('/quiz/onboarding-status');
  return response.data;
};

/**
 * Skip the quiz entirely.
 * POST /api/quiz/skip
 */
export const skipQuiz = async (): Promise<ProfileResponse> => {
  const response = await axios.post<ProfileResponse>('/quiz/skip');
  return response.data;
};

export default {
  getQuiz,
  submitQuiz,
  getProfile,
  getOnboardingStatus,
  skipQuiz,
};
