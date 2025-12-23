import api from './axios';

export interface GroupMatch {
  groupId: number;
  groupName: string;
  description?: string;
  topic?: string;
  visibility: string;
  courseId?: number;
  courseName?: string;
  courseCode?: string;
  currentSize: number;
  maxSize: number;
  matchPercentage: number;
  matchReason: string;
  isMember: boolean;
  hasPendingRequest: boolean;
  currentVariance?: number;
  projectedVariance?: number;
  createdAt?: string;
}

export const matchingService = {
  getMatchedGroups: async (
    courseId?: number,
    visibility?: string,
    availability?: string
  ): Promise<GroupMatch[]> => {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId.toString());
    if (visibility) params.append('visibility', visibility);
    if (availability) params.append('availability', availability);

    const response = await api.get<GroupMatch[]>(`/matching/groups?${params.toString()}`);
    return response.data;
  },

  getGroupMatchScore: async (groupId: number): Promise<GroupMatch> => {
    const response = await api.get<GroupMatch>(`/matching/groups/${groupId}/score`);
    return response.data;
  },
};
