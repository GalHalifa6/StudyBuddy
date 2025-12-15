import api from './axios';
import { Message, MessageUnreadSummary, SendMessageRequest } from '../types';

export const messageService = {
  getGroupMessages: async (groupId: number): Promise<Message[]> => {
    const response = await api.get<Message[]>(`/messages/group/${groupId}`);
    return response.data;
  },

  sendMessage: async (groupId: number, data: SendMessageRequest): Promise<Message> => {
    const response = await api.post<Message>(`/messages/group/${groupId}`, data);
    return response.data;
  },

  togglePin: async (messageId: number): Promise<Message> => {
    const response = await api.post<Message>(`/messages/${messageId}/pin`);
    return response.data;
  },

  deleteMessage: async (messageId: number): Promise<string> => {
    const response = await api.delete<string>(`/messages/${messageId}`);
    return response.data;
  },

  getPinnedMessages: async (groupId: number): Promise<Message[]> => {
    const response = await api.get<Message[]>(`/messages/group/${groupId}/pinned`);
    return response.data;
  },

  getUnreadSummary: async (): Promise<MessageUnreadSummary> => {
    const response = await api.get<MessageUnreadSummary>('/messages/unread/summary');
    return response.data;
  },

  markGroupAsRead: async (groupId: number): Promise<{ updated: number; total: number }> => {
    const response = await api.post<{ updated: number; total: number }>(`/messages/group/${groupId}/read`);
    return response.data;
  },
};
