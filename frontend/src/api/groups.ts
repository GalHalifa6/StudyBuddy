import api from './axios';
import { StudyGroup, CreateGroupRequest, GroupMemberStatus, GroupMemberRequest } from '../types';

export const groupService = {
  createGroup: async (data: CreateGroupRequest): Promise<StudyGroup> => {
    const response = await api.post<StudyGroup>('/groups', data);
    return response.data;
  },

  getGroupsByCourse: async (courseId: number): Promise<StudyGroup[]> => {
    const response = await api.get<StudyGroup[]>(`/groups/course/${courseId}`);
    return response.data;
  },

  getGroupById: async (id: number): Promise<StudyGroup> => {
    const response = await api.get<StudyGroup>(`/groups/${id}`);
    return response.data;
  },

  joinGroup: async (id: number): Promise<{ message: string; status: string }> => {
    const response = await api.post<{ message: string; status: string }>(`/groups/${id}/join`);
    return response.data;
  },

  requestJoin: async (id: number, message?: string): Promise<{ message: string; status: string }> => {
    const response = await api.post<{ message: string; status: string }>(`/groups/${id}/request-join`, { message });
    return response.data;
  },

  leaveGroup: async (id: number): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/groups/${id}/leave`);
    return response.data;
  },

  getMyGroups: async (): Promise<StudyGroup[]> => {
    const response = await api.get<StudyGroup[]>('/groups/my-groups');
    return response.data;
  },

  getMyStatus: async (id: number): Promise<GroupMemberStatus> => {
    const response = await api.get<GroupMemberStatus>(`/groups/${id}/my-status`);
    return response.data;
  },

  canViewContent: async (id: number): Promise<{ canView: boolean; isMember: boolean; visibility: string }> => {
    const response = await api.get<{ canView: boolean; isMember: boolean; visibility: string }>(`/groups/${id}/can-view-content`);
    return response.data;
  },

  // Invitation methods (for group creators)
  inviteUser: async (groupId: number, userId: number, message?: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/groups/${groupId}/invite`, { userId, message });
    return response.data;
  },

  searchUsersToInvite: async (groupId: number, query: string): Promise<{ id: number; fullName: string; email: string; username: string }[]> => {
    const response = await api.get(`/groups/${groupId}/search-users`, { params: { query } });
    return response.data;
  },

  getPendingRequests: async (groupId: number): Promise<GroupMemberRequest[]> => {
    const response = await api.get<GroupMemberRequest[]>(`/groups/${groupId}/pending-requests`);
    return response.data;
  },

  // User's requests and invites
  getMyInvites: async (): Promise<GroupMemberRequest[]> => {
    const response = await api.get<GroupMemberRequest[]>('/groups/my-invites');
    return response.data;
  },

  getMyRequests: async (): Promise<GroupMemberRequest[]> => {
    const response = await api.get<GroupMemberRequest[]>('/groups/my-requests');
    return response.data;
  },

  // Accept/Reject requests
  acceptRequest: async (requestId: number): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/groups/requests/${requestId}/accept`);
    return response.data;
  },

  rejectRequest: async (requestId: number): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/groups/requests/${requestId}/reject`);
    return response.data;
  },
};
