import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User, LoginRequest, RegisterRequest, UserRole } from '../types';
import { authService } from '../api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  isAdmin: boolean;
  isExpert: boolean;
  isUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
  initialAuthState?: {
    user?: User | null;
    isAuthenticated?: boolean;
    isLoading?: boolean;
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, initialAuthState }) => {
  const [user, setUser] = useState<User | null>(initialAuthState?.user ?? null);
  const [isLoading, setIsLoading] = useState(initialAuthState?.isLoading ?? true);
  const hasCheckedAuthRef = useRef(false);
  const lastAppliedUserIdRef = useRef<number | null>(initialAuthState?.user?.id ?? null);
  const lastAppliedIsLoadingRef = useRef<boolean | undefined>(initialAuthState?.isLoading);

  useEffect(() => {
    // If initial state was provided (for testing), use it and don't check auth
    // Only update state if the actual values changed (not just object reference)
    // This prevents infinite loops when initialAuthState is a new object on each render
    if (initialAuthState !== undefined) {
      const currentUserId = initialAuthState?.user?.id ?? null;
      const currentIsLoading = initialAuthState?.isLoading;
      
      const userChanged = lastAppliedUserIdRef.current !== currentUserId;
      const isLoadingChanged = lastAppliedIsLoadingRef.current !== currentIsLoading;
      
      // Only update state if values actually changed to prevent infinite loops
      if (userChanged || isLoadingChanged) {
        setUser(initialAuthState.user ?? null);
        setIsLoading(initialAuthState.isLoading ?? false);
        lastAppliedUserIdRef.current = currentUserId;
        lastAppliedIsLoadingRef.current = currentIsLoading;
      }
      return;
    }
    
    // Only check auth once if initialAuthState is not provided
    if (hasCheckedAuthRef.current) {
      return;
    }
    
    const checkAuth = async () => {
      hasCheckedAuthRef.current = true;
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        } catch (error) {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setIsLoading(false);
    };
    
    checkAuth();
  }, [initialAuthState]);

  const login = async (data: LoginRequest) => {
    const response = await authService.login(data);
    localStorage.setItem('token', response.token);
    const userData = await authService.getCurrentUser();
    setUser(userData);
  };

  const register = async (data: RegisterRequest) => {
    await authService.register(data);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const userData = await authService.getCurrentUser();
    setUser(userData);
  };

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  };

  const isAdmin = user?.role === 'ADMIN';
  const isExpert = user?.role === 'EXPERT';
  const isUser = user?.role === 'USER';

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    hasRole,
    isAdmin,
    isExpert,
    isUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
