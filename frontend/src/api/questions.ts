import api from './axios';
import type { ExpertQuestion } from './experts';
import { QuestionVoteResponse } from '../types';

export const questionService = {
  getPublicQuestions: async (): Promise<ExpertQuestion[]> => {
    const response = await api.get<ExpertQuestion[]>('/questions/public');
    return response.data;
  },

  getMyQuestions: async (): Promise<ExpertQuestion[]> => {
    const response = await api.get<ExpertQuestion[]>('/questions/my-questions');
    return response.data;
  },

  upvoteQuestion: async (questionId: number): Promise<QuestionVoteResponse> => {
    const response = await api.post<QuestionVoteResponse>(`/questions/${questionId}/upvote`);
    return response.data;
  },
};
