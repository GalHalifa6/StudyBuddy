import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { apiBaseWithPrefix } from '@/config/env';

// Create axios instance
const api = axios.create({
  baseURL: apiBaseWithPrefix,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Track whether a refresh is already in progress to avoid duplicate refreshes
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// Response interceptor — attempt token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Only attempt refresh for 401s that aren't already retries or auth endpoints
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/register')
    ) {
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        if (isRefreshing) {
          // Another refresh is in progress — queue this request
          return new Promise((resolve) => {
            addRefreshSubscriber((newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              originalRequest._retry = true;
              resolve(api(originalRequest));
            });
          });
        }

        isRefreshing = true;
        originalRequest._retry = true;

        try {
          const response = await axios.post(`${apiBaseWithPrefix}/auth/refresh`, { refreshToken });
          const { token: newToken, refreshToken: newRefreshToken } = response.data;

          localStorage.setItem('token', newToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          onTokenRefreshed(newToken);
          isRefreshing = false;

          return api(originalRequest);
        } catch {
          isRefreshing = false;
          refreshSubscribers = [];
          // Refresh failed — clear everything and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(error);
        }
      }

      // No refresh token — direct logout
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
