import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isOnboardingRoute = location.pathname === '/onboarding';
  
  // DEV-ONLY: Temporary bypass for testing Google linking flow
  // Only works in development mode - disabled in production builds
  // Set VITE_DISABLE_ONBOARDING_CHECK=true in .env.local to bypass onboarding
  const disableOnboardingCheck = import.meta.env.DEV && 
                                  import.meta.env.VITE_DISABLE_ONBOARDING_CHECK === 'true';
  
  const needsOnboarding = !disableOnboardingCheck && 
                          user && 
                          user.role === 'USER' && 
                          user.onboardingCompleted !== true;

  if (needsOnboarding && !isOnboardingRoute) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!needsOnboarding && isOnboardingRoute) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
