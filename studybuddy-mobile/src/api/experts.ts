import api from './client';
import {
  BookingRequest,
  CreateExpertSessionRequest,
  ExpertDashboardSummary,
  ExpertManagedSession,
  ExpertProfile,
  ExpertProfileRequest,
  ExpertQuestionItem,
  ExpertReview,
  ExpertSummary,
  ReviewEligibility,
  SessionSummary,
  SubmitExpertReviewRequest,
} from './types';

type BookingResponse = {
  message: string;
  bookingId?: number;
  status?: string;
};

export const expertsApi = {
  list: async (): Promise<ExpertSummary[]> => {
    const { data } = await api.get<ExpertSummary[]>('/experts');
    return data;
  },

  topRated: async (): Promise<ExpertSummary[]> => {
    const { data } = await api.get<ExpertSummary[]>('/experts/top-rated');
    return data;
  },

  available: async (): Promise<ExpertSummary[]> => {
    const { data } = await api.get<ExpertSummary[]>('/experts/available');
    return data;
  },

  search: async (query: string): Promise<ExpertSummary[]> => {
    const { data } = await api.get<ExpertSummary[]>('/experts/search', { params: { query } });
    return data;
  },

  profile: async (userId: number): Promise<ExpertProfile> => {
    const { data } = await api.get<ExpertProfile>(`/experts/${userId}`);
    return data;
  },

  sessions: async (userId: number): Promise<SessionSummary[]> => {
    const { data } = await api.get<SessionSummary[]>(`/experts/${userId}/sessions`);
    return data;
  },

  reviews: async (userId: number): Promise<ExpertReview[]> => {
    const { data } = await api.get<ExpertReview[]>(`/experts/${userId}/reviews`);
    return data;
  },

  canReview: async (userId: number): Promise<ReviewEligibility> => {
    const { data } = await api.get<ReviewEligibility>(`/experts/${userId}/can-review`);
    return data;
  },

  submitReview: async (userId: number, payload: SubmitExpertReviewRequest): Promise<ExpertReview> => {
    const { data } = await api.post<ExpertReview>(`/experts/${userId}/reviews`, payload);
    return data;
  },

  dashboard: async (): Promise<ExpertDashboardSummary> => {
    const { data } = await api.get<ExpertDashboardSummary>('/experts/me/dashboard');
    return data;
  },

  mySessions: async (): Promise<ExpertManagedSession[]> => {
    const { data } = await api.get<ExpertManagedSession[]>('/experts/me/sessions');
    return data;
  },

  createSession: async (payload: CreateExpertSessionRequest): Promise<ExpertManagedSession> => {
    const { data } = await api.post<ExpertManagedSession>('/experts/sessions', payload);
    return data;
  },

  startSession: async (sessionId: number): Promise<ExpertManagedSession> => {
    const { data } = await api.post<ExpertManagedSession>(`/experts/sessions/${sessionId}/start`);
    return data;
  },

  completeSession: async (sessionId: number, summary?: string): Promise<ExpertManagedSession> => {
    const { data } = await api.post<ExpertManagedSession>(`/experts/sessions/${sessionId}/complete`, { summary });
    return data;
  },

  cancelSession: async (sessionId: number, reason: string): Promise<void> => {
    await api.post(`/experts/sessions/${sessionId}/cancel`, { reason });
  },

  myQuestions: async (): Promise<ExpertQuestionItem[]> => {
    const { data } = await api.get<ExpertQuestionItem[]>('/experts/me/questions');
    return data;
  },

  pendingQuestions: async (): Promise<ExpertQuestionItem[]> => {
    const { data } = await api.get<ExpertQuestionItem[]>('/experts/me/questions/pending');
    return data;
  },

  answerQuestion: async (questionId: number, answer: string): Promise<ExpertQuestionItem> => {
    const { data } = await api.post<ExpertQuestionItem>(`/experts/questions/${questionId}/answer`, { answer });
    return data;
  },

  myReviews: async (): Promise<ExpertReview[]> => {
    const { data } = await api.get<ExpertReview[]>('/experts/me/reviews');
    return data;
  },

  /** Get current expert's own profile */
  getMyProfile: async (): Promise<ExpertProfile> => {
    const { data } = await api.get<ExpertProfile>('/experts/me/profile');
    return data;
  },

  /** Create or update expert profile */
  saveProfile: async (payload: ExpertProfileRequest): Promise<ExpertProfile> => {
    const { data } = await api.post<ExpertProfile>('/experts/me/profile', payload);
    return data;
  },

  respondToReview: async (reviewId: number, response: string): Promise<ExpertReview> => {
    const { data } = await api.post<ExpertReview>(`/experts/reviews/${reviewId}/respond`, { response });
    return data;
  },
};

export const bookingApi = {
  bookSession: async (payload: BookingRequest): Promise<BookingResponse> => {
    const { data } = await api.post<BookingResponse>('/student-expert/sessions/book', payload);
    return data;
  },

  myUpcoming: async (): Promise<SessionSummary[]> => {
    const { data } = await api.get<SessionSummary[]>('/student-expert/my-sessions/upcoming');
    return data;
  },
};

// Session Request types and API
export interface TimeSlot {
  start: string;
  end: string;
}

export interface SessionRequest {
  id: number;
  expert: ExpertSummary;
  student?: { id: number; fullName: string; username: string };
  course?: { id: number; code: string; name: string };
  title: string;
  description?: string;
  agenda?: string;
  preferredTimeSlots: TimeSlot[];
  status: string;
  expertResponseMessage?: string;
  rejectionReason?: string;
  chosenStart?: string;
  chosenEnd?: string;
  createdSessionId?: number;
  createdAt: string;
  updatedAt: string;
}

export const sessionRequestApi = {
  // Student endpoints
  createRequest: async (payload: {
    expertId: number;
    courseId?: number;
    title: string;
    description?: string;
    agenda?: string;
    preferredTimeSlots: TimeSlot[];
  }): Promise<SessionRequest> => {
    const { data } = await api.post<SessionRequest>('/student-expert/session-requests', payload);
    return data;
  },

  getMyRequests: async (): Promise<SessionRequest[]> => {
    const { data } = await api.get<SessionRequest[]>('/student-expert/session-requests/mine');
    return data;
  },

  cancelRequest: async (requestId: number): Promise<SessionRequest> => {
    const { data } = await api.post<SessionRequest>(`/student-expert/session-requests/${requestId}/cancel`);
    return data;
  },

  // Expert endpoints
  getExpertRequests: async (status?: string): Promise<SessionRequest[]> => {
    const params = status ? { status } : {};
    const { data } = await api.get<SessionRequest[]>('/experts/me/session-requests', { params });
    return data;
  },

  approveRequest: async (requestId: number, payload: {
    chosenStart: string;
    chosenEnd: string;
    message?: string;
  }): Promise<SessionRequest> => {
    const { data } = await api.post<SessionRequest>(`/experts/session-requests/${requestId}/approve`, payload);
    return data;
  },

  rejectRequest: async (requestId: number, payload: {
    reason: string;
  }): Promise<SessionRequest> => {
    const { data } = await api.post<SessionRequest>(`/experts/session-requests/${requestId}/reject`, payload);
    return data;
  },

  counterProposeRequest: async (requestId: number, payload: {
    proposedTimeSlots: TimeSlot[];
    message?: string;
  }): Promise<SessionRequest> => {
    const { data } = await api.post<SessionRequest>(`/experts/session-requests/${requestId}/counter-propose`, payload);
    return data;
  },
};