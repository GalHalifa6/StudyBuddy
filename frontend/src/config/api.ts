/**
 * API Configuration
 * Centralized configuration for API base URLs
 */

// Get backend API base URL from environment variable, with fallback for development
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Get OAuth authorization URL
export const getOAuthAuthUrl = (provider: string = 'google'): string => {
  return `${API_BASE_URL}/oauth2/authorization/${provider}`;
};

