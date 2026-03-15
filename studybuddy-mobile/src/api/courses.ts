import api from './client';
import { Course, CourseExtras } from './types';

export const courseApi = {
  getAll: async (): Promise<Course[]> => {
    const { data } = await api.get<Course[]>('/courses');
    return data;
  },

  getById: async (id: number): Promise<Course> => {
    const { data } = await api.get<Course>(`/courses/${id}`);
    return data;
  },

  getMyCourses: async (): Promise<Course[]> => {
    const { data } = await api.get<Course[]>('/courses/my-courses');
    return data;
  },

  search: async (query: string): Promise<Course[]> => {
    const { data } = await api.get<Course[]>('/courses/search', { params: { query } });
    return data;
  },

  enroll: async (courseId: number): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>(`/courses/${courseId}/enroll`);
    return data;
  },

  unenroll: async (courseId: number): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(`/courses/${courseId}/enroll`);
    return data;
  },

  getExtras: async (courseId: number): Promise<CourseExtras> => {
    const { data } = await api.get<CourseExtras>(`/courses/${courseId}/extras`);
    return data;
  },
};
