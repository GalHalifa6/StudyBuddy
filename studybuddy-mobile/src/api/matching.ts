import api from './client';
import { GroupMatch } from './types';

export const matchingApi = {
  /**
   * Get matched groups with compatibility scores
   */
  getMatchedGroups: async (
    courseId?: number,
    visibility?: string,
    availability?: string
  ): Promise<GroupMatch[]> => {
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId.toString());
    if (visibility) params.append('visibility', visibility);
    if (availability) params.append('availability', availability);

    const { data } = await api.get<GroupMatch[]>(`/matching/groups?${params.toString()}`);
    return data;
  },

  /**
   * Get match score for a specific group
   */
  getGroupMatchScore: async (groupId: number): Promise<GroupMatch> => {
    const { data } = await api.get<GroupMatch>(`/matching/groups/${groupId}/score`);
    return data;
  },
};

export default matchingApi;
