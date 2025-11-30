import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../auth';
import api from '../axios';

// Mock axios
vi.mock('../axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('calls API with correct credentials', async () => {
      const mockResponse = {
        data: {
          token: 'test-token',
          type: 'Bearer',
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          role: 'USER',
        },
      };

      (api.post as any).mockResolvedValue(mockResponse);

      const result = await authService.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: 'testuser',
        password: 'password123',
      });
      expect(result).toEqual(mockResponse.data);
      expect(result.token).toBe('test-token');
      expect(result.username).toBe('testuser');
    });

    it('handles login errors with proper error message', async () => {
      const error = new Error('Invalid credentials');
      (api.post as any).mockRejectedValue(error);

      await expect(
        authService.login({
          username: 'testuser',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');
      
      expect(api.post).toHaveBeenCalledTimes(1);
    });

    it('handles network errors', async () => {
      const networkError = new Error('Network Error');
      (api.post as any).mockRejectedValue(networkError);

      await expect(
        authService.login({
          username: 'testuser',
          password: 'password123',
        })
      ).rejects.toThrow('Network Error');
    });

    it('handles API error responses', async () => {
      const apiError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };
      (api.post as any).mockRejectedValue(apiError);

      await expect(
        authService.login({
          username: 'testuser',
          password: 'wrongpassword',
        })
      ).rejects.toEqual(apiError);
    });
  });

  describe('register', () => {
    it('calls API with registration data', async () => {
      const mockResponse = {
        data: {
          message: 'User registered successfully',
          success: true,
        },
      };

      (api.post as any).mockResolvedValue(mockResponse);

      const result = await authService.register({
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
      });

      expect(api.post).toHaveBeenCalledTimes(1);
      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
      });
      expect(result).toEqual(mockResponse.data);
      expect(result.success).toBe(true);
    });

    it('handles registration errors', async () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Username already exists' },
        },
      };
      (api.post as any).mockRejectedValue(error);

      await expect(
        authService.register({
          username: 'existinguser',
          email: 'existing@example.com',
          password: 'password123',
          fullName: 'Existing User',
        })
      ).rejects.toEqual(error);
    });
  });

  describe('getCurrentUser', () => {
    it('fetches current user data', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'USER',
        fullName: 'Test User',
        isActive: true,
      };

      (api.get as any).mockResolvedValue({ data: mockUser });

      const result = await authService.getCurrentUser();

      expect(api.get).toHaveBeenCalledTimes(1);
      expect(api.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
      expect(result.id).toBe(1);
      expect(result.username).toBe('testuser');
    });

    it('handles unauthorized errors when fetching user', async () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };
      (api.get as any).mockRejectedValue(error);

      await expect(authService.getCurrentUser()).rejects.toEqual(error);
    });
  });

  describe('updateProfile', () => {
    it('calls API with profile update data', async () => {
      const mockResponse = {
        data: {
          message: 'Profile updated successfully',
          success: true,
        },
      };

      (api.put as any).mockResolvedValue(mockResponse);

      const result = await authService.updateProfile({
        topicsOfInterest: ['Math', 'Science'],
        proficiencyLevel: 'Intermediate',
      });

      expect(api.put).toHaveBeenCalledTimes(1);
      expect(api.put).toHaveBeenCalledWith('/auth/profile', {
        topicsOfInterest: ['Math', 'Science'],
        proficiencyLevel: 'Intermediate',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('logout', () => {
    it('removes token from localStorage', () => {
      // Set up localStorage
      const localStorageMock = {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      };
      globalThis.localStorage = localStorageMock as any;
      localStorage.setItem('token', 'test-token');

      authService.logout();

      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });
  });
});

