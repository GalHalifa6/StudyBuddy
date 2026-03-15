import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth';
import { LoginRequest, MessageResponse, RegisterRequest, User } from '../api/types';
import { queryClient } from '../api/queryClient';
import { getStoredToken, loadInitialToken, setStoredToken } from './tokenStorage';
import { setUnauthorizedHandler } from '../api/client';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (payload: LoginRequest) => Promise<void>;
  loginWithToken: (token: string) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<MessageResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  const bootstrap = async () => {
    try {
      const token = await loadInitialToken();
      if (!token) {
        setStatus('unauthenticated');
        return;
      }

      const profile = await authApi.me();
      setUser(profile);
      setStatus('authenticated');
    } catch (error) {
      await setStoredToken(null);
      setUser(null);
      setStatus('unauthenticated');
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    const handleUnauthorized = async () => {
      await setStoredToken(null);
      setUser(null);
      setStatus('unauthenticated');
      queryClient.clear();
    };

    setUnauthorizedHandler(handleUnauthorized);
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = async (payload: LoginRequest) => {
    setStatus('loading');
    try {
      const response = await authApi.login(payload);
      await setStoredToken(response.token);
      const profile = await authApi.me();
      setUser(profile);
      setStatus('authenticated');
    } catch (error) {
      await setStoredToken(null);
      setUser(null);
      setStatus('unauthenticated');
      throw error;
    }
  };

  /**
   * Login with an existing JWT token (used for OAuth callbacks)
   */
  const loginWithToken = async (token: string) => {
    setStatus('loading');
    try {
      await setStoredToken(token);
      const profile = await authApi.me();
      setUser(profile);
      setStatus('authenticated');
    } catch (error) {
      await setStoredToken(null);
      setUser(null);
      setStatus('unauthenticated');
      throw error;
    }
  };

  const register = async (payload: RegisterRequest) => {
    const response = await authApi.register(payload);
    return response;
  };

  const refreshUser = async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setStatus('unauthenticated');
      return;
    }

    try {
      const profile = await authApi.me();
      setUser(profile);
      setStatus('authenticated');
    } catch (error) {
      await setStoredToken(null);
      setUser(null);
      setStatus('unauthenticated');
      throw error;
    }
  };

  const logout = async () => {
    await setStoredToken(null);
    setUser(null);
    setStatus('unauthenticated');
    queryClient.clear();
  };

  const value = useMemo(
    () => ({ status, user, login, loginWithToken, register, logout, refreshUser }),
    [status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
