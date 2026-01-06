export type UserRole = 'USER' | 'EXPERT' | 'ADMIN';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName?: string;
  role: UserRole;
  topicsOfInterest?: string[];
  proficiencyLevel?: string;
  preferredLanguages?: string[];
  collaborationStyle?: string;
  availability?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  questionnaireResponses?: Record<string, string>;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  role?: UserRole;
}

export interface AuthResponse {
  token: string;
  type: string;
  id: number;
  username: string;
  email: string;
  role: UserRole;
  fullName?: string;
}

export interface MessageResponse {
  message: string;
  success: boolean;
  errors?: string[];
}

export interface QuestionnaireAnswer {
  questionKey: string;
  answer: string;
}

export interface OnboardingSubmission {
  skip?: boolean;
  responses: QuestionnaireAnswer[];
  topicsOfInterest?: string[];
  proficiencyLevel?: string;
  preferredLanguages?: string[];
  availability?: string;
  collaborationStyle?: string;
}

export interface ApiError {
  message: string;
  success: boolean;
  errors?: string[];
  status?: number;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  description?: string;
  faculty?: string;
  semester?: string;
  createdAt: string;
  groupCount?: number;
  enrolled?: boolean;
}

export interface SessionPreview {
  id: number;
  title: string;
  sessionType: string;
  status: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  currentParticipants: number;
  maxParticipants: number;
  course?: {
    id: number;
    code: string;
    name: string;
  };
  group?: {
    id: number;
    name: string;
  };
}

export interface QuestionHighlight {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  answered: boolean;
}

export interface CourseHighlight {
  courseId: number;
  code: string;
  name: string;
  groupCount: number;
  openGroupCount: number;
  expertCount: number;
  questionCount: number;
  enrolled: boolean;
  upcomingSession?: SessionPreview;
  recentQuestion?: QuestionHighlight;
}

export interface MessageUnreadGroupSummary {
  groupId: number;
  groupName: string;
  unreadCount: number;
  course?: {
    id: number;
    code: string;
    name: string;
  };
  lastMessageAt?: string;
  lastMessagePreview?: string;
}

export interface MessageUnreadSummary {
  total: number;
  groups: MessageUnreadGroupSummary[];
}

export interface DashboardMetrics {
  enrolledCourses: number;
  myGroups: number;
  focusMinutesThisWeek: number;
  studyPalsCount: number;
  unreadMessages: number;
  upcomingSessions: number;
  notifications: number;
}

export interface DashboardOverview {
  metrics: DashboardMetrics;
  courseHighlights: CourseHighlight[];
  nextSession: SessionPreview | null;
  unreadMessages: MessageUnreadSummary;
}

export interface CourseExtras {
  stats: {
    groupCount: number;
    upcomingSessionCount: number;
    expertCount: number;
    questionCount: number;
  };
  recommendedGroups: Array<{
    id: number;
    name: string;
    topic?: string;
    memberCount: number;
    visibility: string;
    isMember: boolean;
  }>;
  upcomingSessions: SessionSummary[];
  featuredExperts: Array<{
    userId: number;
    fullName?: string;
    title?: string;
    institution?: string;
    averageRating: number;
    totalQuestionsAnswered: number;
    specializations?: string[];
  }>;
  questionHighlights: Array<{
    id: number;
    title: string;
    status: string;
    createdAt: string;
    answered: boolean;
    answeredBy?: {
      id: number;
      fullName: string;
    };
  }>;
}

export interface StudyGroup {
  id: number;
  name: string;
  description?: string;
  topic?: string;
  maxSize: number;
  visibility: 'open' | 'approval' | 'private';
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  course: {
    id: number;
    code?: string;
    name?: string;
  };
  creator: Pick<User, 'id' | 'username' | 'fullName'>;
  members?: Array<Pick<User, 'id' | 'username' | 'fullName'>>;
  memberCount?: number;
  isPrivate?: boolean;
  canJoin?: boolean;
  message?: string;
  isMember?: boolean;
  isCreator?: boolean;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  topic?: string;
  maxSize?: number;
  visibility?: 'open' | 'approval' | 'private';
  course: { id: number };
}

export interface GroupMemberStatus {
  status: 'MEMBER' | 'PENDING' | 'NOT_MEMBER';
  isMember: boolean;
  isCreator: boolean;
  hasPendingRequest: boolean;
  visibility: string;
  canJoin: boolean;
  canRequestJoin: boolean;
  canBeInvited: boolean;
}

export interface GroupMemberRequest {
  id: number;
  group: StudyGroup;
  user: User;
  requestType: 'JOIN_REQUEST' | 'INVITE';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  message?: string;
  invitedBy?: User;
  createdAt: string;
  respondedAt?: string;
  respondedBy?: User;
}

// Group matching types
export interface GroupMatch {
  groupId: number;
  groupName: string;
  description?: string;
  topic?: string;
  visibility: string;
  courseId?: number;
  courseName?: string;
  courseCode?: string;
  currentSize: number;
  maxSize: number;
  matchPercentage: number;
  matchReason: string;
  isMember: boolean;
  hasPendingRequest: boolean;
  currentVariance?: number;
  projectedVariance?: number;
  createdAt?: string;
}

// Event types
export type EventType = 
  | 'STUDY_SESSION' 
  | 'MEETING' 
  | 'EXAM' 
  | 'ASSIGNMENT_DUE' 
  | 'PROJECT_DEADLINE' 
  | 'PRESENTATION' 
  | 'REVIEW_SESSION' 
  | 'OTHER';

export interface CalendarEvent {
  id: number;
  title: string;
  description?: string;
  eventType: EventType;
  startDateTime: string;
  endDateTime?: string;
  location?: string;
  meetingLink?: string;
  creatorId: number;
  creatorName: string;
  groupId: number;
  groupName: string;
  createdAt: string;
  updatedAt: string;
}

export interface FileUpload {
  id: number;
  filename: string;
  originalFilename: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploader: User;
  group: StudyGroup;
}

export interface Message {
  id: number;
  content: string;
  messageType: 'text' | 'file' | 'system';
  isPinned: boolean;
  createdAt: string;
  sender: User;
  group: StudyGroup;
  attachedFile?: FileUpload;
}

export interface SendMessageRequest {
  content: string;
  messageType?: string;
  fileId?: number;
}

export interface UpdateProfileRequest {
  topicsOfInterest?: string[];
  proficiencyLevel?: string;
  preferredLanguages?: string[];
  availability?: string;
  collaborationStyle?: string;
  questionnaireResponses?: Record<string, string>;
}

export interface SessionSummary {
  id: number;
  title: string;
  description?: string;
  sessionType: string;
  status: string;
  statusKey?: string; // Enum name (IN_PROGRESS, SCHEDULED, etc.)
  scheduledStartTime: string;
  scheduledEndTime: string;
  currentParticipants: number;
  maxParticipants: number;
  isJoined?: boolean;
  canJoin?: boolean;
  course?: {
    id: number;
    code?: string;
    name?: string;
  };
  group?: {
    id: number;
    name: string;
  };
  expert?: {
    id: number;
    fullName?: string;
    role?: string;
  };
  host?: {
    id: number;
    fullName?: string;
    username?: string;
  };
}

export interface SessionDetails extends SessionSummary {
  description?: string;
  agenda?: string;
  meetingLink?: string; // Jitsi or other video platform link
  meetingPlatform?: string; // JITSI, ZOOM, MEET, etc.
  resources?: string;
  statusKey?: string; // Enum name (IN_PROGRESS, SCHEDULED, etc.)
  participants?: Array<{
    id: number;
    fullName?: string;
    username: string;
  }>;
}

export interface SessionActionResponse {
  message: string;
  status?: string;
}

export interface SessionParticipant {
  id: number;
  fullName?: string;
  username: string;
  role?: UserRole;
}

export interface SessionChatMessage {
  id: number;
  sessionId: number;
  senderId: number;
  senderName: string;
  content: string;
  type: 'text' | 'file' | 'code' | 'system';
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  language?: string;
}

export interface ExpertSummary {
  expertId?: number;
  userId: number;
  fullName?: string;
  title?: string;
  bio?: string;
  institution?: string;
  expertiseAreas?: string[];
  specializations?: string[];
  courses?: Array<{ id: number; code: string; name: string }>;
  availability?: string;
  averageRating?: number;
  totalReviews?: number;
  totalQuestionsAnswered?: number;
  totalSessions?: number;
  isVerified?: boolean;
  isAvailableNow?: boolean;
  offersOneOnOne?: boolean;
  offersGroupConsultations?: boolean;
  offersAsyncQA?: boolean;
}

export interface ExpertProfile extends ExpertSummary {
  id?: number;
  email?: string;
  qualifications?: string;
  yearsOfExperience?: number;
  skills?: string[];
  acceptingNewStudents?: boolean;
  typicalResponseHours?: number;
  helpfulAnswers?: number;
  studentsHelped?: number;
  linkedInUrl?: string;
  personalWebsite?: string;
  upcomingSessions?: SessionSummary[];
  achievements?: string[];
  averageResponseTimeHours?: number;
  maxSessionsPerWeek?: number;
  sessionDurationMinutes?: number;
}

/** Request to create or update expert profile */
export interface ExpertProfileRequest {
  title?: string;
  institution?: string;
  bio?: string;
  qualifications?: string;
  yearsOfExperience?: number;
  specializations?: string[];
  skills?: string[];
  weeklyAvailability?: string;
  maxSessionsPerWeek?: number;
  sessionDurationMinutes?: number;
  offersGroupConsultations?: boolean;
  offersOneOnOne?: boolean;
  offersAsyncQA?: boolean;
  typicalResponseHours?: number;
  linkedInUrl?: string;
  personalWebsite?: string;
  expertiseCourseIds?: number[];
}

export interface ExpertReview {
  id: number;
  rating: number;
  review: string;
  createdAt: string;
  highlights?: string;
  improvements?: string;
  expertResponse?: string;
  expertRespondedAt?: string;
  student?: {
    id: number;
    fullName?: string;
    username: string;
  };
}

export interface ReviewEligibility {
  canReview: boolean;
  hasInteracted: boolean;
  alreadyReviewed: boolean;
}

export interface SubmitExpertReviewRequest {
  rating: number;
  review: string;
  highlights?: string;
  improvements?: string;
  isAnonymous?: boolean;
  isPublic?: boolean;
  sessionId?: number;
  questionId?: number;
}

export interface ExpertDashboardStats {
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalQuestionsAnswered: number;
  pendingQuestions: number;
  studentsHelped: number;
  averageRating: number;
  totalReviews: number;
  helpfulAnswers?: number;
  averageResponseTimeHours?: number;
}

export interface ExpertManagedSession {
  id: number;
  title: string;
  description?: string;
  agenda?: string;
  sessionType: string;
  status: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  maxParticipants?: number;
  currentParticipants?: number;
  meetingLink?: string;
  meetingPlatform?: string;
  sessionSummary?: string;
  course?: {
    id: number;
    code?: string;
    name?: string;
  };
  group?: {
    id: number;
    name: string;
  };
  student?: {
    id: number;
    fullName?: string;
    username: string;
  };
}

export interface ExpertQuestionItem {
  id: number;
  title: string;
  content: string;
  status: string;
  priority?: string;
  tags?: string[];
  isPublic?: boolean;
  isAnonymous?: boolean;
  createdAt: string;
  answeredAt?: string;
  answer?: string;
  followUpCount?: number;
  netVotes?: number;
  student?: {
    id: number;
    fullName?: string;
    username: string;
  };
  course?: {
    id: number;
    code?: string;
    name?: string;
  };
  group?: {
    id: number;
    name: string;
  };
}

export interface ExpertDashboardSummary {
  profile?: ExpertProfile;
  stats?: ExpertDashboardStats;
  upcomingSessions?: ExpertManagedSession[];
  pendingQuestions?: ExpertQuestionItem[];
  recentReviews?: ExpertReview[];
}

export interface CreateExpertSessionRequest {
  title: string;
  description?: string;
  agenda?: string;
  sessionType: 'ONE_ON_ONE' | 'GROUP' | 'OFFICE_HOURS' | 'WORKSHOP' | 'Q_AND_A';
  scheduledStartTime: string;
  scheduledEndTime: string;
  maxParticipants?: number;
  meetingLink?: string;
  meetingPlatform?: string;
  studentId?: number;
  groupId?: number;
  courseId?: number;
  isRecurring?: boolean;
  recurrencePattern?: string;
}

export interface BookingRequest {
  expertId: number;
  sessionId?: number;
  topic: string;
  description?: string;
  preferredTimes?: string[];
}

export interface QuestionSummary {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  answered: boolean;
  course?: {
    id: number;
    code: string;
    name: string;
  };
}

export interface QuestionDetails extends QuestionSummary {
  content?: string;
  tags?: string[];
  netVotes?: number;
  upvotes?: number;
  answer?: {
    content: string;
    createdAt: string;
    answeredBy?: {
      id: number;
      fullName?: string;
    };
  };
  answers?: Array<{
    id: number;
    content: string;
    createdAt: string;
    answeredBy?: {
      id: number;
      fullName?: string;
    };
  }>;
}

export interface AskQuestionRequest {
  title: string;
  content: string;
  expertId?: number;
  courseId?: number;
  groupId?: number;
  tags?: string[];
  isPublic?: boolean;
  isAnonymous?: boolean;
  isUrgent?: boolean;
  attachments?: string[];
  codeSnippet?: string;
  programmingLanguage?: string;
}

export interface QuestionVoteResponse {
  upvotes: number;
  netVotes: number;
  hasVoted?: boolean;
  voteType?: 'UPVOTE' | 'DOWNVOTE';
}

export interface UpdateProfileRequest {
  topicsOfInterest?: string[];
  proficiencyLevel?: string;
  preferredLanguages?: string[];
  availability?: string;
  collaborationStyle?: string;
  questionnaireResponses?: Record<string, string>;
}
