import axios from './axios';

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
  itemType: 'QUIZ_REMINDER' | 'UPCOMING_EVENT' | 'REGISTERED_SESSION' | 'RECOMMENDED_SESSION' | 'GROUP_MATCH';
  priority: number;
  timestamp: string;
  
  // Quiz reminder fields
  quizMessage?: string;
  questionsAnswered?: number;
  totalQuestions?: number;
  
  // Event fields
  eventId?: number;
  eventTitle?: string;
  eventType?: string;
  eventDescription?: string;
  eventLocation?: string;
  eventMeetingLink?: string;
  eventStartTime?: string;
  eventEndTime?: string;
  
  // Group fields (for events and group matches)
  groupId?: number;
  groupName?: string;
  courseName?: string;
  
  // Group match fields
  matchPercentage?: number;
  matchReason?: string;
  currentSize?: number;
  maxSize?: number;
  
  // Session fields (both registered and recommended)
  sessionId?: number;
  sessionTitle?: string;
  expertName?: string;
  scheduledAt?: string;
  availableSpots?: number;
  isRegistered?: boolean; // true for registered sessions, false for recommendations
  topicMatchPercentage?: number; // for recommended sessions
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

/**
 * Get student feed with personalized recommendations.
 * GET /api/feed/student
 * @param offset - Pagination offset (default: 0)
 */
export const getStudentFeed = async (offset: number = 0): Promise<FeedResponse> => {
  const response = await axios.get<FeedResponse>('/feed/student', {
    params: { offset }
  });
  return response.data;
};

export default {
  getStudentFeed,
};
