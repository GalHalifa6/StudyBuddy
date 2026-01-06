import api from './axios';

export type TopicCategory = 'EDUCATION' | 'CASUAL' | 'HOBBY';

export interface Topic {
  id: number;
  name: string;
  category: TopicCategory;
  description?: string;
  isActive: boolean;
}

export interface TopicsByCategoryResponse {
  education: Topic[];
  casual: Topic[];
  hobby: Topic[];
}

export interface UserTopicsResponse {
  userId: number;
  username: string;
  topics: Topic[];
  lastUpdated?: string;
}

export interface UpdateUserTopicsRequest {
  topicIds: number[];
}

export interface CreateTopicRequest {
  name: string;
  category: TopicCategory;
  description?: string;
}

export interface TopicOperationResponse {
  message: string;
  topic: Topic;
}

export const topicsService = {
  /**
   * Get all topics grouped by category
   */
  getTopicsByCategory: async (): Promise<TopicsByCategoryResponse> => {
    const response = await api.get<TopicsByCategoryResponse>('/topics');
    return response.data;
  },

  /**
   * Get all topics as a flat list
   */
  getAllTopics: async (): Promise<Topic[]> => {
    const response = await api.get<Topic[]>('/topics/list');
    return response.data;
  },

  /**
   * Get current user's topics
   */
  getMyTopics: async (): Promise<UserTopicsResponse> => {
    const response = await api.get<UserTopicsResponse>('/topics/my');
    return response.data;
  },

  /**
   * Update current user's topics (replaces all)
   */
  updateMyTopics: async (topicIds: number[]): Promise<UserTopicsResponse> => {
    const response = await api.put<UserTopicsResponse>('/topics/my', { topicIds });
    return response.data;
  },

  /**
   * Add a single topic to current user's interests
   */
  addTopic: async (topicId: number): Promise<UserTopicsResponse> => {
    const response = await api.post<UserTopicsResponse>(`/topics/my/${topicId}`);
    return response.data;
  },

  /**
   * Remove a topic from current user's interests
   */
  removeTopic: async (topicId: number): Promise<UserTopicsResponse> => {
    const response = await api.delete<UserTopicsResponse>(`/topics/my/${topicId}`);
    return response.data;
  },

  /**
   * Create a new topic (admin only)
   */
  createTopic: async (data: CreateTopicRequest): Promise<TopicOperationResponse> => {
    const response = await api.post<TopicOperationResponse>('/topics', data);
    return response.data;
  },

  /**
   * Deactivate a topic (admin only)
   */
  deactivateTopic: async (topicId: number): Promise<TopicOperationResponse> => {
    const response = await api.delete<TopicOperationResponse>(`/topics/${topicId}`);
    return response.data;
  },
};
