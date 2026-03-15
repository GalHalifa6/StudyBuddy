import api from './client';

// ==================== Types ====================

export interface RoleScores {
  LEADER: number;
  PLANNER: number;
  EXPERT: number;
  CREATIVE: number;
  COMMUNICATOR: number;
  TEAM_PLAYER: number;
  CHALLENGER: number;
}

export interface FeedItem {
  itemType: 'QUIZ_REMINDER' | 'GROUP_ACTIVITY' | 'UPCOMING_SESSION' | 'GROUP_MATCH';
  priority: number;
  timestamp: string;
  
  // Quiz reminder fields
  quizMessage?: string;
  questionsAnswered?: number;
  totalQuestions?: number;
  
  // Group activity fields
  groupId?: number;
  groupName?: string;
  activityType?: 'MESSAGE' | 'FILE';
  activityMessage?: string;
  actorName?: string;
  
  // Session fields
  sessionId?: number;
  sessionTitle?: string;
  expertName?: string;
  courseName?: string;
  scheduledAt?: string;
  availableSpots?: number;
  
  // Group match fields
  matchPercentage?: number;
  matchReason?: string;
  currentSize?: number;
  maxSize?: number;
}

export interface ProfileSummary {
  hasProfile: boolean;
  message: string;
}

export interface QuizReminder {
  shouldCompleteQuiz: boolean;
  message: string;
  questionsAnswered: number | null;
  totalQuestions: number | null;
}

export interface FeedResponse {
  feedItems: FeedItem[];
  userProfile: ProfileSummary;
}

// ==================== API Calls ====================

export const feedApi = {
  /**
   * Get student feed with personalized recommendations.
   * GET /api/feed/student
   */
  getStudentFeed: async (): Promise<FeedResponse> => {
    const { data } = await api.get<FeedResponse>('/feed/student');
    return data;
  },
};

export default feedApi;
