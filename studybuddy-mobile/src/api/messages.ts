import api from './client';
import { Message, MessageUnreadSummary, SendMessageRequest } from './types';

export const messagesApi = {
  getGroupMessages: async (groupId: number): Promise<Message[]> => {
    const { data } = await api.get<Message[]>(`/messages/group/${groupId}`);
    return data;
  },

  sendMessage: async (groupId: number, payload: SendMessageRequest): Promise<Message> => {
    const { data } = await api.post<Message>(`/messages/group/${groupId}`, payload);
    return data;
  },

  togglePin: async (messageId: number): Promise<Message> => {
    const { data } = await api.post<Message>(`/messages/${messageId}/pin`);
    return data;
  },

  deleteMessage: async (messageId: number): Promise<string> => {
    const { data } = await api.delete<string>(`/messages/${messageId}`);
    return data;
  },

  getPinnedMessages: async (groupId: number): Promise<Message[]> => {
    const { data } = await api.get<Message[]>(`/messages/group/${groupId}/pinned`);
    return data;
  },

  getUnreadSummary: async (): Promise<MessageUnreadSummary> => {
    const { data } = await api.get<MessageUnreadSummary>('/messages/unread/summary');
    return data;
  },

  markGroupAsRead: async (groupId: number): Promise<{ updated: number; total: number }> => {
    const { data } = await api.post<{ updated: number; total: number }>(`/messages/group/${groupId}/read`);
    return data;
  },
};
