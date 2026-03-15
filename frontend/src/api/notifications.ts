import api from './axios';
import { Notification } from '../types';

export const notificationService = {
  getAll: async (): Promise<Notification[]> => {
    const response = await api.get<Notification[]>('/notifications');
    return response.data;
  },

  getUnread: async (): Promise<Notification[]> => {
    const response = await api.get<Notification[]>('/notifications/unread');
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<{ count: number }>('/notifications/unread/count');
    return response.data.count;
  },

  markAsRead: async (id: number): Promise<void> => {
    await api.post(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.post('/notifications/read-all');
  },

  deleteNotification: async (id: number): Promise<void> => {
    await api.delete(`/notifications/${id}`);
  },
};
