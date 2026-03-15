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

// ==================== ADMIN API Types ====================

export type RoleType = 'LEADER' | 'PLANNER' | 'EXPERT' | 'CREATIVE' | 'COMMUNICATOR' | 'TEAM_PLAYER' | 'CHALLENGER';

export interface QuizOptionAdmin {
  optionId: number;
  optionText: string;
  orderIndex: number;
  roleWeights: Record<RoleType, number>;
}

export interface QuizQuestionAdmin {
  questionId: number;
  questionText: string;
  orderIndex: number;
  active: boolean;
  options: QuizOptionAdmin[];
}

export interface CreateQuestionRequest {
  questionText: string;
  orderIndex: number;
  options: CreateOptionRequest[];
}

export interface CreateOptionRequest {
  optionText: string;
  orderIndex: number;
  roleWeights: Record<RoleType, number>;
}

export interface UpdateQuestionRequest {
  questionText: string;
  orderIndex: number;
  active?: boolean;
  options?: UpdateOptionRequest[];
}

export interface UpdateOptionRequest {
  optionText: string;
  orderIndex: number;
  roleWeights: Record<RoleType, number>;
}

// ==================== ADMIN API Calls ====================

/**
 * Get all quiz questions (admin only).
 * GET /api/admin/quiz/questions
 */
export const getAdminQuestions = async (): Promise<QuizQuestionAdmin[]> => {
  const response = await axios.get<QuizQuestionAdmin[]>('/admin/quiz/questions');
  return response.data;
};

/**
 * Get a single question (admin only).
 * GET /api/admin/quiz/questions/{id}
 */
export const getAdminQuestion = async (id: number): Promise<QuizQuestionAdmin> => {
  const response = await axios.get<QuizQuestionAdmin>(`/admin/quiz/questions/${id}`);
  return response.data;
};

/**
 * Create a new quiz question (admin only).
 * POST /api/admin/quiz/questions
 */
export const createAdminQuestion = async (request: CreateQuestionRequest): Promise<QuizQuestionAdmin> => {
  const response = await axios.post<QuizQuestionAdmin>('/admin/quiz/questions', request);
  return response.data;
};

/**
 * Update a quiz question (admin only).
 * PUT /api/admin/quiz/questions/{id}
 */
export const updateAdminQuestion = async (id: number, request: UpdateQuestionRequest): Promise<QuizQuestionAdmin> => {
  const response = await axios.put<QuizQuestionAdmin>(`/admin/quiz/questions/${id}`, request);
  return response.data;
};

/**
 * Delete (deactivate) a quiz question (admin only).
 * DELETE /api/admin/quiz/questions/{id}
 */
export const deleteAdminQuestion = async (id: number): Promise<void> => {
  await axios.delete(`/admin/quiz/questions/${id}`);
};

/**
 * Update a quiz option (admin only).
 * PUT /api/admin/quiz/questions/{questionId}/options/{optionId}
 */
export const updateAdminOption = async (
  questionId: number,
  optionId: number,
  request: UpdateOptionRequest
): Promise<QuizOptionAdmin> => {
  const response = await axios.put<QuizOptionAdmin>(
    `/admin/quiz/questions/${questionId}/options/${optionId}`,
    request
  );
  return response.data;
};

/**
 * Delete a quiz option (admin only).
 * DELETE /api/admin/quiz/questions/{questionId}/options/{optionId}
 */
export const deleteAdminOption = async (questionId: number, optionId: number): Promise<void> => {
  await axios.delete(`/admin/quiz/questions/${questionId}/options/${optionId}`);
};

/**
 * Quiz Configuration Types
 */
export interface QuizConfig {
  id: number;
  selectedQuestionIds: number[];
  configKey: string;
}

/**
 * Get quiz configuration (admin only).
 * GET /api/admin/quiz/config
 */
export const getQuizConfig = async (): Promise<QuizConfig> => {
  const response = await axios.get<QuizConfig>('/admin/quiz/config');
  return response.data;
};

/**
 * Update quiz configuration (admin only).
 * PUT /api/admin/quiz/config
 */
export const updateQuizConfig = async (selectedQuestionIds: number[]): Promise<QuizConfig> => {
  const response = await axios.put<QuizConfig>('/admin/quiz/config', { selectedQuestionIds });
  return response.data;
};

export default {
  getQuiz,
  submitQuiz,
  getProfile,
  getOnboardingStatus,
  skipQuiz,
  // Admin functions
  getAdminQuestions,
  getAdminQuestion,
  createAdminQuestion,
  updateAdminQuestion,
  deleteAdminQuestion,
  updateAdminOption,
  deleteAdminOption,
};
