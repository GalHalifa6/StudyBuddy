import api from './client';

// ==================== Types ====================

export type EventType = 
  | 'STUDY_SESSION' 
  | 'MEETING' 
  | 'EXAM' 
  | 'ASSIGNMENT_DUE' 
  | 'PROJECT_DEADLINE' 
  | 'PRESENTATION' 
  | 'REVIEW_SESSION' 
  | 'OTHER';

export interface Event {
  id: number;
  title: string;
  description?: string;
  eventType: EventType;
  startDateTime: string;
  endDateTime?: string;
  location?: string;
  meetingLink?: string;
  creatorId: number;
  creatorName: string;
  groupId: number;
  groupName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  eventType: EventType;
  startDateTime: string;
  endDateTime?: string;
  location?: string;
  meetingLink?: string;
  groupId: number;
}

// ==================== API Calls ====================

export const calendarApi = {
  /**
   * Create a new event
   */
  createEvent: async (data: CreateEventRequest): Promise<Event> => {
    const { data: response } = await api.post<Event>('/events', data);
    return response;
  },

  /**
   * Get all events for a specific group
   */
  getGroupEvents: async (groupId: number): Promise<Event[]> => {
    const { data } = await api.get<Event[]>(`/events/group/${groupId}`);
    return data;
  },

  /**
   * Get upcoming events for a specific group
   */
  getUpcomingGroupEvents: async (groupId: number): Promise<Event[]> => {
    const { data } = await api.get<Event[]>(`/events/group/${groupId}/upcoming`);
    return data;
  },

  /**
   * Get all events for the current user across all their groups
   */
  getMyEvents: async (): Promise<Event[]> => {
    const { data } = await api.get<Event[]>('/events/my-events');
    return data;
  },

  /**
   * Get upcoming events for the current user across all their groups
   */
  getMyUpcomingEvents: async (): Promise<Event[]> => {
    const { data } = await api.get<Event[]>('/events/my-events/upcoming');
    return data;
  },

  /**
   * Get a specific event by ID
   */
  getEventById: async (eventId: number): Promise<Event> => {
    const { data } = await api.get<Event>(`/events/${eventId}`);
    return data;
  },

  /**
   * Update an event
   */
  updateEvent: async (eventId: number, eventData: CreateEventRequest): Promise<Event> => {
    const { data } = await api.put<Event>(`/events/${eventId}`, eventData);
    return data;
  },

  /**
   * Delete an event
   */
  deleteEvent: async (eventId: number): Promise<void> => {
    await api.delete(`/events/${eventId}`);
  },
};

export default calendarApi;
