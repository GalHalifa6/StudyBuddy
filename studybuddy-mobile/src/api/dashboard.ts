import api from './client';
import { DashboardOverview } from './types';

export const dashboardApi = {
  overview: async (): Promise<DashboardOverview> => {
    const { data } = await api.get<DashboardOverview>('/dashboard/overview');
    return data;
  },
};
