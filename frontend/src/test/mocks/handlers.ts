import { http, HttpResponse } from 'msw';

/**
 * MSW (Mock Service Worker) request handlers for API mocking
 * This allows us to test components without hitting the real backend
 * 
 * Add new handlers as your API grows
 */
export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      token: 'mock-jwt-token',
      type: 'Bearer',
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'USER',
      fullName: 'Test User',
    });
  }),

  http.post('/api/auth/register', () => {
    return HttpResponse.json({
      message: 'User registered successfully',
      success: true,
    });
  }),

  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      role: 'USER',
      fullName: 'Test User',
      isActive: true,
    });
  }),

  // Groups endpoints
  http.get('/api/groups', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Test Group',
        description: 'A test group',
        topic: 'Testing',
        maxSize: 10,
        visibility: 'open',
        isActive: true,
        members: [],
      },
    ]);
  }),

  http.post('/api/groups', () => {
    return HttpResponse.json({
      id: 1,
      name: 'New Group',
      description: 'A new group',
      topic: 'Testing',
      maxSize: 10,
      visibility: 'open',
      isActive: true,
    });
  }),

  // Courses endpoints
  http.get('/api/courses', () => {
    return HttpResponse.json([
      {
        id: 1,
        code: 'CS101',
        name: 'Introduction to Computer Science',
        description: 'Basic CS course',
        faculty: 'Engineering',
        semester: 'Fall 2024',
      },
    ]);
  }),

  // Notifications endpoints
  http.get('/api/notifications', () => {
    return HttpResponse.json([]);
  }),

  http.get('/api/notifications/unread/count', () => {
    return HttpResponse.json({ count: 0 });
  }),
];



