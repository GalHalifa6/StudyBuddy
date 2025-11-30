import api from './axios';
import { Course, CreateCourseRequest } from '../types';

export const courseService = {
  getAllCourses: async (): Promise<Course[]> => {
    const response = await api.get<Course[]>('/courses');
    return response.data;
  },

  getCourseById: async (id: number): Promise<Course> => {
    const response = await api.get<Course>(`/courses/${id}`);
    return response.data;
  },

  createCourse: async (data: CreateCourseRequest): Promise<Course> => {
    const response = await api.post<Course>('/courses', data);
    return response.data;
  },

  searchCourses: async (query: string): Promise<Course[]> => {
    const response = await api.get<Course[]>('/courses/search', {
      params: { query },
    });
    return response.data;
  },

  enrollInCourse: async (courseId: number): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/courses/${courseId}/enroll`);
    return response.data;
  },

  getMyCourses: async (): Promise<Course[]> => {
    const response = await api.get<Course[]>('/courses/my-courses');
    return response.data;
  },
};
