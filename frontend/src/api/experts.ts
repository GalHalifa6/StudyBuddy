import api from './axios';

// Types for Expert functionality
export interface ExpertProfile {
  id: number;
  userId: number;
  username: string;
  fullName: string;
  email: string;
  title: string;
  institution: string;
  bio: string;
  qualifications: string;
  yearsOfExperience: number;
  specializations: string[];
  skills: string[];
  isVerified: boolean;
  verifiedAt?: string;
  averageRating: number;
  totalRatings: number;
  totalSessions: number;
  totalQuestionsAnswered: number;
  weeklyAvailability?: string;
  maxSessionsPerWeek: number;
  sessionDurationMinutes: number;
  acceptingNewStudents: boolean;
  offersGroupConsultations: boolean;
  offersOneOnOne: boolean;
  offersAsyncQA: boolean;
  typicalResponseHours: number;
  isAvailableNow: boolean;
  helpfulAnswers: number;
  studentsHelped: number;
  linkedInUrl?: string;
  personalWebsite?: string;
  createdAt: string;
}

export interface ExpertProfileRequest {
  title: string;
  institution: string;
  bio: string;
  qualifications?: string;
  yearsOfExperience?: number;
  specializations?: string[];
  skills?: string[];
  weeklyAvailability?: string;
  maxSessionsPerWeek?: number;
  sessionDurationMinutes?: number;
  offersGroupConsultations?: boolean;
  offersOneOnOne?: boolean;
  offersAsyncQA?: boolean;
  typicalResponseHours?: number;
  linkedInUrl?: string;
  personalWebsite?: string;
  expertiseCourseIds?: number[];
}

export interface ExpertSession {
  id: number;
  expert: ExpertSummary;
  student?: StudentSummary;
  studyGroup?: GroupSummary;
  course?: CourseSummary;
  title: string;
  description: string;
  agenda?: string;
  sessionType: string;
  status: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  maxParticipants: number;
  currentParticipants: number;
  meetingLink?: string;
  meetingPlatform?: string;
  sessionSummary?: string;
  studentRating?: number;
  studentFeedback?: string;
  canJoin: boolean;
  isUpcoming: boolean;
  createdAt: string;
}

export interface ExpertSummary {
  id: number;
  fullName: string;
  title?: string;
  institution?: string;
  averageRating?: number;
  isVerified: boolean;
}

export interface StudentSummary {
  id: number;
  fullName: string;
  username: string;
}

export interface CourseSummary {
  id: number;
  code: string;
  name: string;
}

export interface GroupSummary {
  id: number;
  name: string;
}

export interface CreateSessionRequest {
  title: string;
  description: string;
  agenda?: string;
  sessionType: 'ONE_ON_ONE' | 'GROUP' | 'OFFICE_HOURS' | 'WORKSHOP' | 'Q_AND_A';
  scheduledStartTime: string;
  scheduledEndTime: string;
  maxParticipants?: number;
  meetingLink?: string;
  meetingPlatform?: string;
  studentId?: number;
  groupId?: number;
  courseId?: number;
  isRecurring?: boolean;
  recurrencePattern?: string; // 'weekly', 'biweekly', 'monthly'
}

export interface ExpertQuestion {
  id: number;
  student?: StudentSummary;
  expert?: ExpertSummary;
  answeredBy?: ExpertSummary;
  course?: CourseSummary;
  studyGroup?: GroupSummary;
  title: string;
  content: string;
  codeSnippet?: string;
  programmingLanguage?: string;
  status: string;
  priority: string;
  tags?: string[];
  answer?: string;
  answeredAt?: string;
  isPublic: boolean;
  isAnonymous: boolean;
  viewCount: number;
  upvotes: number;
  downvotes: number;
  netVotes: number;
  isAnswerAccepted?: boolean;
  isAnswerHelpful?: boolean;
  attachments?: string[];
  dueDate?: string;
  isUrgent: boolean;
  followUpCount: number;
  createdAt: string;
}

export interface AskQuestionRequest {
  title: string;
  content: string;
  codeSnippet?: string;
  programmingLanguage?: string;
  expertId?: number;
  courseId?: number;
  groupId?: number;
  tags?: string[];
  isPublic?: boolean;
  isAnonymous?: boolean;
  dueDate?: string;
  isUrgent?: boolean;
  attachments?: string[];
}

export interface ExpertReview {
  id: number;
  expertId: number;
  expertName: string;
  student?: StudentSummary;
  rating: number;
  knowledgeRating?: number;
  communicationRating?: number;
  responsivenessRating?: number;
  helpfulnessRating?: number;
  review: string;
  highlights?: string;
  improvements?: string;
  isAnonymous: boolean;
  helpfulCount: number;
  expertResponse?: string;
  expertRespondedAt?: string;
  createdAt: string;
}

export interface CreateReviewRequest {
  rating: number;
  knowledgeRating?: number;
  communicationRating?: number;
  responsivenessRating?: number;
  helpfulnessRating?: number;
  review: string;
  highlights?: string;
  improvements?: string;
  isAnonymous?: boolean;
  isPublic?: boolean;
  sessionId?: number;
  questionId?: number;
}

export interface ExpertDashboard {
  profile: ExpertProfile;
  stats: DashboardStats;
  upcomingSessions: ExpertSession[];
  pendingQuestions: ExpertQuestion[];
  recentReviews: ExpertReview[];
  notifications: string[];
}

export interface DashboardStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalQuestionsAnswered: number;
  pendingQuestions: number;
  studentsHelped: number;
  averageRating: number;
  totalReviews: number;
  averageResponseTimeHours?: number;
  helpfulAnswers: number;
  sessionTypeDistribution?: Record<string, number>;
  questionStatusDistribution?: Record<string, number>;
  ratingDistribution?: { rating: number; count: number; percentage: number }[];
}

export interface ExpertSearchResult {
  expertId: number;
  userId: number;
  fullName: string;
  title: string;
  institution: string;
  bio: string;
  specializations: string[];
  averageRating: number;
  totalRatings: number;
  isVerified: boolean;
  isAvailableNow: boolean;
  offersOneOnOne: boolean;
  offersAsyncQA: boolean;
}

// Expert API Service (for experts managing their own profile)
export const expertService = {
  // Get own profile
  getProfile: async (): Promise<ExpertProfile> => {
    const response = await api.get('/experts/me/profile');
    return response.data;
  },

  // Create/update profile
  saveProfile: async (data: ExpertProfileRequest): Promise<ExpertProfile> => {
    const response = await api.post('/experts/me/profile', data);
    return response.data;
  },

  // Update availability
  updateAvailability: async (isAvailableNow: boolean, acceptingNewStudents?: boolean): Promise<void> => {
    await api.put('/experts/me/availability', { isAvailableNow, acceptingNewStudents });
  },

  // Dashboard
  getDashboard: async (): Promise<ExpertDashboard> => {
    const response = await api.get('/experts/me/dashboard');
    return response.data;
  },

  // Sessions management
  createSession: async (data: CreateSessionRequest): Promise<ExpertSession> => {
    const response = await api.post('/experts/sessions', data);
    return response.data;
  },

  getMySessions: async (): Promise<ExpertSession[]> => {
    const response = await api.get('/experts/me/sessions');
    return response.data;
  },

  startSession: async (sessionId: number): Promise<ExpertSession> => {
    const response = await api.post(`/experts/sessions/${sessionId}/start`);
    return response.data;
  },

  completeSession: async (sessionId: number, summary?: string): Promise<ExpertSession> => {
    const response = await api.post(`/experts/sessions/${sessionId}/complete`, { summary });
    return response.data;
  },

  cancelSession: async (sessionId: number, reason: string): Promise<void> => {
    await api.post(`/experts/sessions/${sessionId}/cancel`, { reason });
  },

  // Questions management
  getMyQuestions: async (): Promise<ExpertQuestion[]> => {
    const response = await api.get('/experts/me/questions');
    return response.data;
  },

  getPendingQuestions: async (): Promise<ExpertQuestion[]> => {
    const response = await api.get('/experts/me/questions/pending');
    return response.data;
  },

  answerQuestion: async (questionId: number, answer: string): Promise<ExpertQuestion> => {
    const response = await api.post(`/experts/questions/${questionId}/answer`, { answer });
    return response.data;
  },

  claimQuestion: async (questionId: number): Promise<ExpertQuestion> => {
    const response = await api.post(`/experts/questions/${questionId}/claim`);
    return response.data;
  },

  // Reviews
  getMyReviews: async (): Promise<ExpertReview[]> => {
    const response = await api.get(`/experts/me/reviews`);
    return response.data;
  },

  respondToReview: async (reviewId: number, response: string): Promise<ExpertReview> => {
    const result = await api.post(`/experts/reviews/${reviewId}/respond`, { response });
    return result.data;
  },
};

// Student API Service (for students browsing/interacting with experts)
export const studentExpertService = {
  // Browse experts
  getAllExperts: async (): Promise<ExpertSearchResult[]> => {
    const response = await api.get('/experts');
    return response.data;
  },

  searchExperts: async (query: string): Promise<ExpertSearchResult[]> => {
    const response = await api.get(`/experts/search?query=${encodeURIComponent(query)}`);
    return response.data;
  },

  getTopRatedExperts: async (): Promise<ExpertSearchResult[]> => {
    const response = await api.get('/experts/top-rated');
    return response.data;
  },

  getAvailableExperts: async (): Promise<ExpertSearchResult[]> => {
    const response = await api.get('/experts/available');
    return response.data;
  },

  getExpertProfile: async (userId: number): Promise<ExpertProfile> => {
    const response = await api.get(`/experts/${userId}`);
    return response.data;
  },

  getExpertSessions: async (userId: number): Promise<ExpertSession[]> => {
    const response = await api.get(`/experts/${userId}/sessions`);
    return response.data;
  },

  getExpertReviews: async (expertUserId: number): Promise<ExpertReview[]> => {
    const response = await api.get(`/experts/${expertUserId}/reviews`);
    return response.data;
  },

  // Sessions
  getSession: async (sessionId: number): Promise<ExpertSession> => {
    const response = await api.get(`/experts/sessions/${sessionId}`);
    return response.data;
  },

  // Questions
  askQuestion: async (data: AskQuestionRequest): Promise<ExpertQuestion> => {
    const response = await api.post('/questions', data);
    return response.data;
  },

  // Reviews
  submitReview: async (expertUserId: number, data: CreateReviewRequest): Promise<ExpertReview> => {
    const response = await api.post(`/experts/${expertUserId}/reviews`, data);
    return response.data;
  },
};
