import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';

// Mock the useAuth hook
const mockUseAuth = vi.fn();

// Mock the quiz API
const mockGetOnboardingStatus = vi.fn();

vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext');
  return {
    ...actual,
    useAuth: () => mockUseAuth(),
  };
});

vi.mock('../../api/quiz', () => ({
  getOnboardingStatus: () => mockGetOnboardingStatus(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: quiz status check returns no onboarding needed
    mockGetOnboardingStatus.mockResolvedValue({
      userId: 1,
      requiresOnboarding: false,
      quizStatus: 'COMPLETED',
    });
  });

  describe('Authentication States', () => {
    it('renders children when user is authenticated', async () => {
      // Mock admin user (skips quiz check)
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 1, role: 'ADMIN' },
        isAdmin: true,
      });

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('redirects to login when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        isAdmin: false,
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      // Protected content should not be visible
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      // Navigate component doesn't render visible content, but redirect happens
      // The important thing is that protected content is not shown
    });

    it('shows loading spinner when checking authentication', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        isAdmin: false,
      });

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid state changes gracefully', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        isLoading: true,
        user: null,
        isAdmin: false,
      });

      const { rerender } = render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Simulate state change - use admin to skip quiz check
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 1, role: 'ADMIN' },
        isAdmin: true,
      });

      rerender(
        <MemoryRouter>
          <ProtectedRoute>
            <div>Protected Content</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('renders multiple children correctly', async () => {
      // Mock admin user (skips quiz check)
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        isLoading: false,
        user: { id: 1, role: 'ADMIN' },
        isAdmin: true,
      });

      render(
        <MemoryRouter>
          <ProtectedRoute>
            <div>First Child</div>
            <div>Second Child</div>
          </ProtectedRoute>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByText('First Child')).toBeInTheDocument();
        expect(screen.getByText('Second Child')).toBeInTheDocument();
      });
    });
  });
});

