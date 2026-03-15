import api from './axios';
import { Event, CreateEventRequest } from '../types';

export const calendarService = {
  /**
   * Create a new event
   */
  createEvent: async (data: CreateEventRequest): Promise<Event> => {
    const response = await api.post<Event>('/events', data);
    return response.data;
  },

  /**
   * Get all events for a specific group
   */
  getGroupEvents: async (groupId: number): Promise<Event[]> => {
    const response = await api.get<Event[]>(`/events/group/${groupId}`);
    return response.data;
  },

  /**
   * Get upcoming events for a specific group
   */
  getUpcomingGroupEvents: async (groupId: number): Promise<Event[]> => {
    const response = await api.get<Event[]>(`/events/group/${groupId}/upcoming`);
    return response.data;
  },

  /**
   * Get all events for the current user across all their groups
   */
  getMyEvents: async (): Promise<Event[]> => {
    const response = await api.get<Event[]>('/events/my-events');
    return response.data;
  },

  /**
   * Get upcoming events for the current user across all their groups
   */
  getMyUpcomingEvents: async (): Promise<Event[]> => {
    const response = await api.get<Event[]>('/events/my-events/upcoming');
    return response.data;
  },

  /**
   * Get a specific event by ID
   */
  getEventById: async (eventId: number): Promise<Event> => {
    const response = await api.get<Event>(`/events/${eventId}`);
    return response.data;
  },

  /**
   * Update an event
   */
  updateEvent: async (eventId: number, data: CreateEventRequest): Promise<Event> => {
    const response = await api.put<Event>(`/events/${eventId}`, data);
    return response.data;
  },

  /**
   * Delete an event
   */
  deleteEvent: async (eventId: number): Promise<void> => {
    await api.delete(`/events/${eventId}`);
  },
};

export default calendarService;
