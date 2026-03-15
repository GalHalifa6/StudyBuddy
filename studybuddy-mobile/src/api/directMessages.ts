import api from './client';

export interface Conversation {
  id: number;
  type: string;
  otherUser: {
    id: number;
    username: string;
    fullName?: string;
  };
  unreadCount: number;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  createdAt: string;
}

export interface DirectMessage {
  id: number;
  conversationId: number;
  sender: {
    id: number;
    username: string;
    fullName?: string;
  };
  content: string;
  messageType: string;
  attachedFile?: {
    id: number;
    filename: string;
    originalFilename: string;
    fileType?: string;
    fileSize?: number;
  };
  createdAt: string;
  isRead: boolean;
  readAt?: string;
}

export interface SendDirectMessageRequest {
  content: string;
  messageType?: string;
  fileId?: number;
}

export const directMessageApi = {
  // Create or get existing conversation
  createOrGetConversation: async (participantId: number): Promise<Conversation> => {
    const { data } = await api.post<Conversation>('/dm/conversations', { participantId });
    return data;
  },

  // Get all conversations
  getConversations: async (): Promise<Conversation[]> => {
    const { data } = await api.get<Conversation[]>('/dm/conversations');
    return data;
  },

  // Get messages in a conversation
  getMessages: async (conversationId: number): Promise<DirectMessage[]> => {
    const { data } = await api.get<DirectMessage[]>(`/dm/conversations/${conversationId}/messages`);
    return data;
  },

  // Send a message
  sendMessage: async (conversationId: number, payload: SendDirectMessageRequest): Promise<DirectMessage> => {
    const { data } = await api.post<DirectMessage>(`/dm/conversations/${conversationId}/messages`, payload);
    return data;
  },

  // Mark conversation as read
  markAsRead: async (conversationId: number): Promise<{ updated: number }> => {
    const { data } = await api.post<{ updated: number }>(`/dm/conversations/${conversationId}/read`);
    return data;
  },
};

