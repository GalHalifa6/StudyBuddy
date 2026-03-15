import api from './axios';
import { DashboardOverview } from '../types';

export const dashboardService = {
  getOverview: async (): Promise<DashboardOverview> => {
    // Aggregate data from multiple endpoints
    const [coursesRes, groupsRes, sessionsRes, notificationsRes] = await Promise.allSettled([
      api.get('/courses/my-courses'),
      api.get('/groups/my-groups'),
      api.get('/sessions/my-upcoming'),
      api.get('/notifications/unread/count'),
    ]);

    const courses = coursesRes.status === 'fulfilled' ? coursesRes.value.data : [];
    const groups = groupsRes.status === 'fulfilled' ? groupsRes.value.data : [];
    const sessions = sessionsRes.status === 'fulfilled' ? sessionsRes.value.data : [];
    const notifCount = notificationsRes.status === 'fulfilled' ? notificationsRes.value.data.count : 0;

    // Find next upcoming session
    const nextSession = sessions.length > 0 ? sessions[0] : null;

    return {
      metrics: {
        enrolledCourses: courses.length,
        myGroups: groups.length,
        focusMinutesThisWeek: 0, // TODO: Need backend endpoint for this
        studyPalsCount: 0, // TODO: Need backend endpoint for this
        unreadMessages: 0, // TODO: Need backend endpoint for message unread summary
        upcomingSessions: sessions.length,
        notifications: notifCount,
      },
      courseHighlights: [], // TODO: Map courses to highlights format
      nextSession: nextSession,
      unreadMessages: {
        total: 0,
        groups: [],
      }, // TODO: Need backend endpoint for this
    };
  },
};

export default dashboardService;
