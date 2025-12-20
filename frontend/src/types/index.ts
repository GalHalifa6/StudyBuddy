// Role types
export type UserRole = 'USER' | 'EXPERT' | 'ADMIN';

export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Student',
  EXPERT: 'Subject Expert',
  ADMIN: 'Administrator',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  USER: 'Regular student - join study groups, participate in discussions',
  EXPERT: 'Subject expert - provide guidance, create specialized content',
  ADMIN: 'Administrator - manage users, courses, and system settings',
};

// User types
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
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  questionnaireResponses?: Record<string, string>;
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
  // Admin management fields
  lastLoginAt?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  suspendedUntil?: string;
  suspensionReason?: string;
  bannedAt?: string;
  banReason?: string;
  isEmailVerified?: boolean;
  coursesCount?: number;
  groupsCount?: number;
}

// Admin action types
export interface SuspendUserRequest {
  days?: number; // null or 0 for indefinite
  reason: string;
}

export interface BanUserRequest {
  reason: string;
}

export interface UnbanUserRequest {
  reason: string;
}

export interface UnsuspendUserRequest {
  reason: string;
}

export interface RestoreUserRequest {
  reason: string;
}

export interface DeleteUserRequest {
  reason: string;
}

export interface UpdateRoleRequest {
  role: UserRole;
  reason?: string;
}

export interface UpdateStatusRequest {
  active: boolean;
  reason?: string;
}

// Auth types
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

// Course types
export interface Course {
  id: number;
  code: string;
  name: string;
  description?: string;
  faculty?: string;
  semester?: string;
  createdAt: string;
  groupCount?: number;
  memberCount?: number;
  lastActivity?: string;
  isArchived?: boolean;
  archivedAt?: string;
  enrolled?: boolean;
}

export interface CreateCourseRequest {
  code: string;
  name: string;
  description?: string;
  faculty?: string;
  semester?: string;
}

// Study Group types
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
  course: Course;
  creator: User;
  members: User[];
  // For private group limited info
  memberCount?: number;
  isPrivate?: boolean;
  canJoin?: boolean;
  message?: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  topic?: string;
  maxSize?: number;
  visibility?: string;
  course: { id: number };
}

// Group membership status
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

// Group member request (join requests and invites)
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

// Notification types
export interface Notification {
  id: number;
  user: User;
  type: string;
  title: string;
  message: string;
  link?: string;
  referenceId?: number;
  referenceType?: string;
  actorId?: number;
  isRead: boolean;
  isActionable: boolean;
  actionStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
  readAt?: string;
  actionTakenAt?: string;
}

// Message types
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

// Profile update request
export interface UpdateProfileRequest {
  topicsOfInterest?: string[];
  proficiencyLevel?: string;
  preferredLanguages?: string[];
  availability?: string;
  collaborationStyle?: string;
  questionnaireResponses?: Record<string, string>;
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

// File Upload types
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

export interface SessionSummary {
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
  expert?: {
    id: number;
    fullName?: string;
    role?: string;
  };
}

export interface QuestionSummary {
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
  upcomingSession?: SessionSummary;
  recentQuestion?: QuestionSummary;
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
  nextSession: SessionSummary | null;
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

export interface QuestionVoteResponse {
  upvotes: number;
  netVotes: number;
  hasVoted?: boolean;
  voteType?: 'UPVOTE' | 'DOWNVOTE';
}

// API Error
export interface ApiError {
  message: string;
  success: boolean;
  errors?: string[];
  status?: number;
}
