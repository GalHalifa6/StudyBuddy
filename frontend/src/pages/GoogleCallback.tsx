import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const GoogleCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser, refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);
  
  // Track if callback has been processed to prevent re-runs
  const hasProcessed = useRef(false);
  // Capture previousGoogleSub before refreshUser() updates currentUser
  const previousGoogleSubRef = useRef<string | null | undefined>(null);

  useEffect(() => {
    // Prevent re-processing if already handled
    if (hasProcessed.current) {
      return;
    }

    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      // Check if this was a linking flow (user was already logged in)
      const wasLoggedIn = !!localStorage.getItem('token');
      // Capture previousGoogleSub before refreshUser() updates currentUser
      const previousGoogleSub = currentUser?.googleSub;
      previousGoogleSubRef.current = previousGoogleSub;

      // Handle OAuth errors from backend
      if (error) {
        // Mark as processed to prevent re-runs
        hasProcessed.current = true;
        setStatus('error');
        const errorDescription = searchParams.get('error_description');
        
        // Use error_description from backend if available, otherwise use default messages
        let errorMessage = errorDescription || 'Authentication failed. Please try again.';
        
        // Fallback to specific messages if error_description is not provided
        if (!errorDescription) {
          if (error === 'email_already_registered') {
            errorMessage = 'An account with this email already exists. Please sign in with your password first, then link your Google account from your profile settings.';
          } else if (error === 'invalid_linking_token') {
            errorMessage = 'Invalid or expired linking token. Please try linking your Google account again from your profile settings.';
          } else if (error === 'email_not_verified') {
            errorMessage = 'Your Google email is not verified. Please verify your email with Google first.';
          } else if (error === 'domain_not_allowed') {
            errorMessage = 'This email domain is not authorized. Please use your academic institution email.';
          } else if (error === 'email_not_provided') {
            errorMessage = 'Email not provided by Google. Please try again.';
          } else if (error === 'sub_not_provided') {
            errorMessage = 'Google authentication information is incomplete. Please try again.';
          } else if (error === 'processing_error') {
            errorMessage = 'An error occurred while processing your authentication. Please try again.';
          }
        }
        
        setMessage(errorMessage);
        return;
      }

      if (!token) {
        // Mark as processed to prevent re-runs
        hasProcessed.current = true;
        setStatus('error');
        setMessage('Authentication token is missing. Please try signing in again.');
        return;
      }

      try {
        // Mark as processed to prevent re-runs
        hasProcessed.current = true;
        
        // Save token to localStorage
        localStorage.setItem('token', token);
        
        // Refresh user data in auth context
        await refreshUser();
        
        // Check if this was a linking flow
        // If user was logged in before and didn't have googleSub, but now does, it was linking
        // Use the captured value from before refreshUser() was called
        const wasLinking = wasLoggedIn && !previousGoogleSubRef.current;
        
        setStatus('success');
        if (wasLinking) {
          setIsLinking(true);
          setMessage('Google account successfully linked! You can now sign in with either your password or Google.');
        } else {
          setMessage('Successfully signed in with Google!');
        }
        
        // Redirect to dashboard (or settings if linking) after a brief delay
        setTimeout(() => {
          navigate(wasLinking ? '/settings' : '/dashboard');
        }, 2000);
      } catch (error: any) {
        // Mark as processed to prevent re-runs
        hasProcessed.current = true;
        setStatus('error');
        localStorage.removeItem('token');
        const errorMessage = error.response?.data?.message || 
                           error.response?.data?.errors?.[0] ||
                           'Failed to complete Google sign-in. Please try again.';
        setMessage(errorMessage);
      }
    };

    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-4">
              <Loader2 className="w-16 h-16 text-primary-500 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Signing you in...</h1>
            <p className="text-gray-600 dark:text-gray-400">Please wait while we complete your Google sign-in...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {isLinking ? 'Account Linked!' : 'Welcome!'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Redirecting{isLinking ? ' to settings' : ' to dashboard'}...
            </p>
            <button
              onClick={() => navigate(isLinking ? '/settings' : '/dashboard')}
              className="mt-4 w-full btn-primary"
            >
              {isLinking ? 'Go to Settings' : 'Go to Dashboard'}
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center mb-4">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sign-in Failed</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full btn-primary"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/register')}
                className="w-full btn-secondary"
              >
                Create Account
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleCallback;

