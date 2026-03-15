import api from './client';
import { AskQuestionRequest, QuestionDetails, QuestionVoteResponse } from './types';

type QuestionListResponse = QuestionDetails[];

export const questionsApi = {
  ask: async (payload: AskQuestionRequest): Promise<QuestionDetails> => {
    const { data } = await api.post<QuestionDetails>('/student-expert/questions', payload);
    return data;
  },

  mine: async (): Promise<QuestionListResponse> => {
    const { data } = await api.get<QuestionListResponse>('/student-expert/my-questions');
    return data;
  },

  public: async (): Promise<QuestionListResponse> => {
    const { data } = await api.get<QuestionListResponse>('/student-expert/questions/public');
    return data;
  },

  trending: async (): Promise<QuestionListResponse> => {
    const { data } = await api.get<QuestionListResponse>('/student-expert/questions/trending');
    return data;
  },

  byId: async (questionId: number): Promise<QuestionDetails> => {
    const { data } = await api.get<QuestionDetails>(`/student-expert/questions/${questionId}`);
    return data;
  },

  upvote: async (questionId: number): Promise<QuestionVoteResponse> => {
    const { data } = await api.post<QuestionVoteResponse>(`/student-expert/questions/${questionId}/upvote`);
    return data;
  },

  downvote: async (questionId: number): Promise<QuestionVoteResponse> => {
    const { data } = await api.post<QuestionVoteResponse>(`/student-expert/questions/${questionId}/downvote`);
    return data;
  },
};
