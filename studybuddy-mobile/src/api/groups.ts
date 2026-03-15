import api from './client';
import { CreateGroupRequest, GroupMemberRequest, GroupMemberStatus, StudyGroup } from './types';

type JoinResponse = { message: string; status?: string };

type CanViewResponse = { canView: boolean; isMember: boolean; visibility: string };

type UserSearchResult = { id: number; fullName?: string; email?: string; username: string };

export const groupApi = {
  create: async (payload: CreateGroupRequest): Promise<StudyGroup> => {
    const { data } = await api.post<StudyGroup>('/groups', payload);
    return data;
  },

  getByCourse: async (courseId: number): Promise<StudyGroup[]> => {
    const { data } = await api.get<StudyGroup[]>(`/groups/course/${courseId}`);
    return data;
  },

  getById: async (id: number): Promise<StudyGroup> => {
    const { data } = await api.get<StudyGroup>(`/groups/${id}`);
    return data;
  },

  join: async (groupId: number): Promise<JoinResponse> => {
    const { data } = await api.post<JoinResponse>(`/groups/${groupId}/join`);
    return data;
  },

  requestJoin: async (groupId: number, message?: string): Promise<JoinResponse> => {
    const { data } = await api.post<JoinResponse>(`/groups/${groupId}/request-join`, { message });
    return data;
  },

  leave: async (groupId: number): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>(`/groups/${groupId}/leave`);
    return data;
  },

  myGroups: async (): Promise<StudyGroup[]> => {
    const { data } = await api.get<StudyGroup[]>('/groups/my-groups');
    return data;
  },

  myStatus: async (groupId: number): Promise<GroupMemberStatus> => {
    const { data } = await api.get<GroupMemberStatus>(`/groups/${groupId}/my-status`);
    return data;
  },

  canView: async (groupId: number): Promise<CanViewResponse> => {
    const { data } = await api.get<CanViewResponse>(`/groups/${groupId}/can-view-content`);
    return data;
  },

  pendingRequests: async (groupId: number): Promise<GroupMemberRequest[]> => {
    const { data } = await api.get<GroupMemberRequest[]>(`/groups/${groupId}/pending-requests`);
    return data;
  },

  myInvites: async (): Promise<GroupMemberRequest[]> => {
    const { data } = await api.get<GroupMemberRequest[]>('/groups/my-invites');
    return data;
  },

  myRequests: async (): Promise<GroupMemberRequest[]> => {
    const { data } = await api.get<GroupMemberRequest[]>('/groups/my-requests');
    return data;
  },

  inviteUser: async (groupId: number, userId: number, message?: string): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>(`/groups/${groupId}/invite`, { userId, message });
    return data;
  },

  searchInvitees: async (groupId: number, query: string): Promise<UserSearchResult[]> => {
    const { data } = await api.get<UserSearchResult[]>(`/groups/${groupId}/search-users`, { params: { query } });
    return data;
  },

  acceptRequest: async (requestId: number): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>(`/groups/requests/${requestId}/accept`);
    return data;
  },

  rejectRequest: async (requestId: number): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>(`/groups/requests/${requestId}/reject`);
    return data;
  },
};
