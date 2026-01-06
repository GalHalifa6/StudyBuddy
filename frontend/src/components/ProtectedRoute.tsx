import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOnboardingStatus } from '../api/quiz';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, isLoading, user, isAdmin } = useAuth();
  const [quizLoading, setQuizLoading] = useState(false);
  const [requiresQuiz, setRequiresQuiz] = useState(false);
  const [checkingQuiz, setCheckingQuiz] = useState(true);

  // Check quiz onboarding status
  useEffect(() => {
    const checkQuizStatus = async () => {
      if (!isAuthenticated || isLoading || isAdmin) {
        setCheckingQuiz(false);
        return;
      }

      // Admins and experts don't need quiz
      if (user?.role === 'ADMIN' || user?.role === 'EXPERT') {
        setCheckingQuiz(false);
        return;
      }

      try {
        setQuizLoading(true);
        const status = await getOnboardingStatus();
        setRequiresQuiz(status.requiresOnboarding);
      } catch (error) {
        console.error('Failed to check quiz status:', error);
        // If check fails, assume no quiz needed to avoid blocking access
        setRequiresQuiz(false);
      } finally {
        setQuizLoading(false);
        setCheckingQuiz(false);
      }
    };

    if (isAuthenticated && !isLoading) {
      checkQuizStatus();
    }
  }, [isAuthenticated, isLoading, user, isAdmin]);

  if (isLoading || checkingQuiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isQuizRoute = location.pathname === '/quiz-onboarding';

  // Admins and experts never need quiz
  const needsQuizOnboarding = !isAdmin && user?.role === 'USER' && requiresQuiz;

  // Redirect to quiz if needed (but not if already on quiz route)
  if (needsQuizOnboarding && !isQuizRoute && !isOnboardingRoute) {
    return <Navigate to="/quiz-onboarding" replace />;
  }


  // If on quiz route but doesn't need it, redirect to dashboard
  if (isQuizRoute && !needsQuizOnboarding && !quizLoading) {
    return <Navigate to="/dashboard" replace />;
  }


  return <>{children}</>;
};

export default ProtectedRoute;
