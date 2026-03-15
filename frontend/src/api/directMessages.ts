import api from './axios';

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

export const directMessageService = {
  // Create or get existing conversation
  createOrGetConversation: async (participantId: number): Promise<Conversation> => {
    const response = await api.post('/dm/conversations', { participantId });
    return response.data;
  },

  // Get all conversations
  getConversations: async (): Promise<Conversation[]> => {
    const response = await api.get('/dm/conversations');
    return response.data;
  },

  // Get messages in a conversation
  getMessages: async (conversationId: number): Promise<DirectMessage[]> => {
    const response = await api.get(`/dm/conversations/${conversationId}/messages`);
    return response.data;
  },

  // Send a message
  sendMessage: async (conversationId: number, data: SendDirectMessageRequest): Promise<DirectMessage> => {
    const response = await api.post(`/dm/conversations/${conversationId}/messages`, data);
    return response.data;
  },

  // Mark conversation as read
  markAsRead: async (conversationId: number): Promise<{ updated: number }> => {
    const response = await api.post(`/dm/conversations/${conversationId}/read`);
    return response.data;
  },
};

