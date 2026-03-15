import { User, StudyGroup, Course, Notification } from '../../types';

/**
 * Mock data for testing
 * Centralize test data here for consistency and easy updates
 * Update these as your types evolve
 */

export const mockUser: User = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  fullName: 'Test User',
  role: 'USER',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

export const mockAdminUser: User = {
  ...mockUser,
  id: 2,
  username: 'admin',
  email: 'admin@example.com',
  fullName: 'Admin User',
  role: 'ADMIN',
};

export const mockExpertUser: User = {
  ...mockUser,
  id: 3,
  username: 'expert',
  email: 'expert@example.com',
  fullName: 'Expert User',
  role: 'EXPERT',
};

export const mockGroup: Partial<StudyGroup> = {
  id: 1,
  name: 'Test Study Group',
  description: 'A test study group',
  topic: 'Computer Science',
  maxSize: 10,
  visibility: 'open',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  course: {
    id: 1,
    code: 'CS101',
    name: 'Introduction to Computer Science',
    description: 'Basic CS course',
    faculty: 'Engineering',
    semester: 'Fall 2024',
    createdAt: '2024-01-01T00:00:00Z',
  },
  creator: mockUser,
  members: [mockUser],
};

export const mockCourse: Course = {
  id: 1,
  code: 'CS101',
  name: 'Introduction to Computer Science',
  description: 'Basic CS course',
  faculty: 'Engineering',
  semester: 'Fall 2024',
  createdAt: '2024-01-01T00:00:00Z',
};

export const mockNotification: Partial<Notification> = {
  id: 1,
  type: 'GROUP_JOIN_REQUEST',
  title: 'New Join Request',
  message: 'Someone wants to join your group',
  isRead: false,
  isActionable: true,
  createdAt: '2024-01-01T00:00:00Z',
};

/**
 * Helper functions to create mock data with overrides
 * These make it easy to customize test data for specific test cases
 */
export const createMockUser = (overrides?: Partial<User>): User => ({
  ...mockUser,
  ...overrides,
});

export const createMockGroup = (overrides?: Partial<StudyGroup>): Partial<StudyGroup> => ({
  ...mockGroup,
  ...overrides,
});

export const createMockCourse = (overrides?: Partial<Course>): Course => ({
  ...mockCourse,
  ...overrides,
});

export const createMockNotification = (overrides?: Partial<Notification>): Partial<Notification> => ({
  ...mockNotification,
  ...overrides,
});

