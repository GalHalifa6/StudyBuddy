import api from './client';

export type NotificationType = 
  | 'NEW_QUESTION'
  | 'QUESTION_ANSWERED'
  | 'SESSION_INVITATION'
  | 'SESSION_REMINDER'
  | 'SESSION_STARTED'
  | 'NEW_REVIEW'
  | 'GROUP_INVITE'
  | 'GROUP_MESSAGE'
  | 'SYSTEM';

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  referenceId?: number;
  referenceType?: 'QUESTION' | 'SESSION' | 'GROUP' | 'REVIEW';
  actorId?: number;
  isRead: boolean;
  isActionable: boolean;
  actionStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  readAt?: string;
  actionTakenAt?: string;
}

export interface UnreadCountResponse {
  count: number;
}

export const notificationsApi = {
  /**
   * Get all notifications for current user
   */
  getAll: async (): Promise<Notification[]> => {
    const { data } = await api.get<Notification[]>('/notifications');
    return data;
  },

  /**
   * Get unread notifications only
   */
  getUnread: async (): Promise<Notification[]> => {
    const { data } = await api.get<Notification[]>('/notifications/unread');
    return data;
  },

  /**
   * Get count of unread notifications
   */
  getUnreadCount: async (): Promise<number> => {
    const { data } = await api.get<UnreadCountResponse>('/notifications/unread/count');
    return data.count;
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (notificationId: number): Promise<void> => {
    await api.post(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<void> => {
    await api.post('/notifications/read-all');
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (notificationId: number): Promise<void> => {
    await api.delete(`/notifications/${notificationId}`);
  },
};
