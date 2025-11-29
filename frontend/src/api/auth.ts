import api from './axios';
import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  MessageResponse,
  User,
  UpdateProfileRequest
} from '../types';

export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<MessageResponse> => {
    const response = await api.post<MessageResponse>('/auth/register', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<MessageResponse> => {
    const response = await api.put<MessageResponse>('/auth/profile', data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },
};
