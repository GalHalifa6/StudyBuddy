import axios, { AxiosError } from 'axios';
import { API_BASE_URL, USE_MOCKS } from './env';
import { getStoredToken, loadInitialToken } from '../auth/tokenStorage';

// Debug: Log the API base URL on startup
console.log('[StudyBuddy API] Base URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout
});

let initialTokenLoaded = false;
let unauthorizedHandler: (() => void) | null = null;

if (USE_MOCKS) {
  console.warn('StudyBuddy API running in mock mode. Requests will target mock handlers where available.');
}

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

api.interceptors.request.use(async config => {
  if (!initialTokenLoaded) {
    await loadInitialToken();
    initialTokenLoaded = true;
  }

  const token = getStoredToken();

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  // Debug: Log every request
  console.log('[StudyBuddy API] Request:', config.method?.toUpperCase(), config.baseURL + config.url);

  return config;
});

api.interceptors.response.use(
  response => {
    // Debug: Log successful responses
    console.log('[StudyBuddy API] Response:', response.status, response.config.url);
    return response;
  },
  async (error: AxiosError) => {
    // Debug: Log errors
    console.error('[StudyBuddy API] Error:', error.message, error.config?.url);
    if (error.response) {
      console.error('[StudyBuddy API] Error response:', error.response.status, error.response.data);
    }

    if (error.response) {
      const existingData = typeof error.response.data === 'object' && error.response.data !== null 
        ? error.response.data 
        : {};
      error.response.data = {
        ...existingData,
        status: error.response.status,
      };

      if (error.response.status === 401 && unauthorizedHandler) {
        unauthorizedHandler();
      }
    }

    return Promise.reject(error);
  }
);

export default api;
