import api from './client';
import { SessionActionResponse, SessionDetails, SessionParticipant, SessionSummary } from './types';

export interface JitsiAuthResponse {
  roomName: string;
  meetingUrl: string;
  jwt: string;
  expiresAt: string;
}

type BrowseFilters = {
  type?: string;
  courseId?: number;
  search?: string;
};

export const sessionApi = {
  browse: async (filters?: BrowseFilters): Promise<SessionSummary[]> => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.courseId) params.append('courseId', String(filters.courseId));
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString();
    const { data } = await api.get<SessionSummary[]>(`/sessions/browse${query ? `?${query}` : ''}`);
    return data;
  },

  myUpcoming: async (): Promise<SessionSummary[]> => {
    const { data } = await api.get<SessionSummary[]>('/sessions/my-upcoming');
    return data;
  },

  myUpcomingCount: async (): Promise<number> => {
    const { data } = await api.get<{ count: number }>('/sessions/my-upcoming/count');
    return data.count;
  },

  getById: async (sessionId: number): Promise<SessionDetails> => {
    const { data } = await api.get<SessionDetails>(`/sessions/${sessionId}`);
    return data;
  },

  participants: async (sessionId: number): Promise<SessionParticipant[]> => {
    const { data } = await api.get<SessionParticipant[]>(`/sessions/${sessionId}/participants`);
    return data;
  },

  myStatus: async (sessionId: number): Promise<{ status: string; canJoin?: boolean }> => {
    const { data } = await api.get<{ status: string; canJoin?: boolean }>(`/sessions/${sessionId}/my-status`);
    return data;
  },

  join: async (sessionId: number): Promise<SessionActionResponse> => {
    const { data } = await api.post<SessionActionResponse>(`/sessions/${sessionId}/join`);
    return data;
  },

  leave: async (sessionId: number): Promise<SessionActionResponse> => {
    const { data } = await api.post<SessionActionResponse>(`/sessions/${sessionId}/leave`);
    return data;
  },

  sendMessage: async (sessionId: number, content: string, type: 'text' | 'file' | 'code' = 'text', extra?: { fileUrl?: string; fileName?: string; language?: string }): Promise<SessionChatMessage> => {
    const payload: any = { content, type };
    if (extra?.fileUrl) payload.fileUrl = extra.fileUrl;
    if (extra?.fileName) payload.fileName = extra.fileName;
    if (extra?.language) payload.language = extra.language;
    const { data } = await api.post<SessionChatMessage>(`/sessions/${sessionId}/chat`, payload);
    return data;
  },

  getMessages: async (sessionId: number): Promise<SessionChatMessage[]> => {
    const { data } = await api.get<SessionChatMessage[]>(`/sessions/${sessionId}/messages`);
    return data;
  },

  jitsiAuth: async (sessionId: number): Promise<JitsiAuthResponse> => {
    const { data } = await api.get<JitsiAuthResponse>(`/sessions/${sessionId}/jitsi-auth`);
    return data;
  },
};
