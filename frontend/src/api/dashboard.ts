import api from './axios';
import { DashboardOverview } from '../types';

export const dashboardService = {
  getOverview: async (): Promise<DashboardOverview> => {
    const response = await api.get<DashboardOverview>('/dashboard/overview');
    return response.data;
  },
};
