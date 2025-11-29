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

// API Error
export interface ApiError {
  message: string;
  success: boolean;
  errors?: string[];
  status?: number;
}
