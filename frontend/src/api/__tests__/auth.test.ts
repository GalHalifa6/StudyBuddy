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

      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: 'testuser',
        password: 'password123',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('handles login errors', async () => {
      const error = new Error('Invalid credentials');
      (api.post as any).mockRejectedValue(error);

      await expect(
        authService.login({
          username: 'testuser',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('Invalid credentials');
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

      expect(api.post).toHaveBeenCalledWith('/auth/register', {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getCurrentUser', () => {
    it('fetches current user data', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'USER',
      };

      (api.get as any).mockResolvedValue({ data: mockUser });

      const result = await authService.getCurrentUser();

      expect(api.get).toHaveBeenCalledWith('/auth/me');
      expect(result).toEqual(mockUser);
    });
  });
});

