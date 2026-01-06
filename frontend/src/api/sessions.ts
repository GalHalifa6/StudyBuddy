import api from './axios';

// Types for Student Sessions
export interface SessionInfo {
  id: number;
  title: string;
  description: string;
  sessionType: string;
  status: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  maxParticipants: number;
  currentParticipants: number;
  meetingLink?: string;
  meetingPlatform?: string;
  isJoined: boolean;
  canJoin: boolean;
  expert: {
    id: number;
    fullName: string;
    title?: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
  course?: {
    id: number;
    code: string;
    name: string;
  };
}

export interface SessionParticipant {
  id: number;
  fullName: string;
  username: string;
  avatarUrl?: string;
  joinedAt: string;
}

export interface UserSearchResult {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

export interface JitsiAuthResponse {
  roomName: string;
  meetingUrl: string;
  jwt: string;
  expiresAt: string;
}

// Session API Service for students
export const sessionService = {
  // Browse all available sessions
  browseSessions: async (filters?: {
    type?: string;
    courseId?: number;
    search?: string;
  }): Promise<SessionInfo[]> => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.courseId) params.append('courseId', filters.courseId.toString());
    if (filters?.search) params.append('search', filters.search);
    
    const query = params.toString();
    const response = await api.get(`/sessions/browse${query ? `?${query}` : ''}`);
    return response.data;
  },

  // Get ALL sessions in the system (no filtering by enrollment)
  getAllSessions: async (filters?: {
    type?: string;
    courseId?: number;
    search?: string;
  }): Promise<SessionInfo[]> => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.courseId) params.append('courseId', filters.courseId.toString());
    if (filters?.search) params.append('search', filters.search);
    
    const query = params.toString();
    const response = await api.get(`/sessions/all${query ? `?${query}` : ''}`);
    return response.data;
  },

  // Get session details
  getSession: async (sessionId: number): Promise<SessionInfo> => {
    const response = await api.get(`/sessions/${sessionId}`);
    return response.data;
  },

  // Join a session
  joinSession: async (sessionId: number): Promise<void> => {
    await api.post(`/sessions/${sessionId}/join`);
  },

  // Leave a session
  leaveSession: async (sessionId: number): Promise<void> => {
    await api.post(`/sessions/${sessionId}/leave`);
  },

  // Get student's upcoming sessions
  getMyUpcomingSessions: async (): Promise<SessionInfo[]> => {
    const response = await api.get('/sessions/my-upcoming');
    return response.data;
  },

  // Get count of upcoming sessions
  getMyUpcomingCount: async (): Promise<number> => {
    const response = await api.get('/sessions/my-upcoming/count');
    return response.data.count;
  },

  // Get session participants
  getSessionParticipants: async (sessionId: number): Promise<SessionParticipant[]> => {
    const response = await api.get(`/sessions/${sessionId}/participants`);
    return response.data;
  },

  // Fetch Jitsi JWT + meeting URL
  getJitsiAuth: async (sessionId: number): Promise<JitsiAuthResponse> => {
    const response = await api.get(`/sessions/${sessionId}/jitsi-auth`);
    return response.data;
  },
};

// Expert User Search Service (for one-on-one session creation)
export const userSearchService = {
  searchUsers: async (query: string): Promise<UserSearchResult[]> => {
    if (!query || query.length < 2) return [];
    const response = await api.get(`/experts/users/search?query=${encodeURIComponent(query)}`);
    return response.data;
  },
};
