import api from './client';
import { AuthResponse, LoginRequest, MessageResponse, OnboardingSubmission, RegisterRequest, UpdateProfileRequest, User } from './types';

export const authApi = {
  login: async (payload: LoginRequest): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    return data;
  },

  register: async (payload: RegisterRequest): Promise<MessageResponse> => {
    const { data } = await api.post<MessageResponse>('/auth/register', payload);
    return data;
  },

  me: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },

  updateProfile: async (payload: UpdateProfileRequest): Promise<MessageResponse> => {
    const { data } = await api.put<MessageResponse>('/auth/profile', payload);
    return data;
  },

  submitOnboarding: async (payload: OnboardingSubmission): Promise<MessageResponse> => {
    const { data } = await api.post<MessageResponse>('/auth/onboarding', payload);
    return data;
  },
};
