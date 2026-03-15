import React, { useState } from 'react';
import {
  Loader2,
  X,
  Clock,
  MapPin,
  Video,
  Calendar,
} from 'lucide-react';
import { calendarService } from '../../api';
import { Event, EventType, CreateEventRequest } from '../../types';
import { useToast } from '../../context/ToastContext';

interface GroupEventModalProps {
  selectedEvent: Event | null;
  groupId: number;
  userId?: number;
  onClose: () => void;
  onEventCreated: (event: Event) => void;
  onEventDeleted: (eventId: number) => void;
}

export default function GroupEventModal({
  selectedEvent,
  groupId,
  userId,
  onClose,
  onEventCreated,
  onEventDeleted,
}: GroupEventModalProps) {
  const { showError } = useToast();
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CreateEventRequest>>({
    title: '',
    description: '',
    eventType: 'STUDY_SESSION' as EventType,
    startDateTime: '',
    endDateTime: '',
    location: '',
    meetingLink: '',
  });

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.startDateTime) return;

    setIsCreatingEvent(true);
    try {
      const eventData: CreateEventRequest = {
        title: newEvent.title,
        description: newEvent.description || undefined,
        eventType: newEvent.eventType as EventType,
        startDateTime: newEvent.startDateTime,
        endDateTime: newEvent.endDateTime || undefined,
        location: newEvent.location || undefined,
        meetingLink: newEvent.meetingLink || undefined,
        groupId,
      };

      const createdEvent = await calendarService.createEvent(eventData);
      onEventCreated(createdEvent);
      onClose();
    } catch (error: unknown) {
      console.error('Error creating event:', error);
      let errorMsg = 'Failed to create event';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown } };
        if (axiosError.response?.data) {
          if (typeof axiosError.response.data === 'string') {
            errorMsg = axiosError.response.data;
          } else if (typeof axiosError.response.data === 'object' && axiosError.response.data !== null && 'message' in axiosError.response.data) {
            errorMsg = String((axiosError.response.data as { message: unknown }).message);
          } else {
            errorMsg = JSON.stringify(axiosError.response.data);
          }
        }
      }
      showError('Error creating event: ' + errorMsg);
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent || !window.confirm('Are you sure you want to delete this event?')) return;

    try {
      await calendarService.deleteEvent(selectedEvent.id);
      onEventDeleted(selectedEvent.id);
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      showError('Failed to delete event.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-up">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {selectedEvent ? 'Event Details' : 'Create Event'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {selectedEvent ? (
          /* View Event */
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedEvent.title}</h3>
              <span className="inline-block px-3 py-1 text-sm rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                {selectedEvent.eventType.replace(/_/g, ' ')}
              </span>
            </div>

            {selectedEvent.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <p className="text-gray-600 dark:text-gray-400">{selectedEvent.description}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date & Time</label>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="w-5 h-5" />
                <span>
                  {new Date(selectedEvent.startDateTime).toLocaleDateString()} at{' '}
                  {new Date(selectedEvent.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {selectedEvent.endDateTime && (
                    <> - {new Date(selectedEvent.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                  )}
                </span>
              </div>
            </div>

            {selectedEvent.location && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MapPin className="w-5 h-5" />
                  <span>{selectedEvent.location}</span>
                </div>
              </div>
            )}

            {selectedEvent.meetingLink && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meeting Link</label>
                <div className="flex items-center gap-2">
                  <Video className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <a
                    href={selectedEvent.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {selectedEvent.meetingLink}
                  </a>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Created by {selectedEvent.creatorName} on{' '}
                {new Date(selectedEvent.createdAt).toLocaleDateString()}
              </p>
            </div>

            {selectedEvent.creatorId === userId && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleDeleteEvent}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  Delete Event
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Create Event Form */
          <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Title *</label>
              <input
                type="text"
                value={newEvent.title || ''}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="input w-full"
                placeholder="e.g., Midterm Study Session"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Type *</label>
              <select
                value={newEvent.eventType || 'STUDY_SESSION'}
                onChange={(e) => setNewEvent({ ...newEvent, eventType: e.target.value as EventType })}
                className="input w-full"
                required
              >
                <option value="STUDY_SESSION">Study Session</option>
                <option value="MEETING">Meeting</option>
                <option value="EXAM">Exam</option>
                <option value="ASSIGNMENT_DUE">Assignment Due</option>
                <option value="PROJECT_DEADLINE">Project Deadline</option>
                <option value="PRESENTATION">Presentation</option>
                <option value="REVIEW_SESSION">Review Session</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  value={newEvent.startDateTime || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, startDateTime: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={newEvent.endDateTime || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, endDateTime: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
              <textarea
                value={newEvent.description || ''}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="input w-full min-h-[100px] resize-none"
                placeholder="What's this event about?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
              <input
                type="text"
                value={newEvent.location || ''}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                className="input w-full"
                placeholder="e.g., Library Room 203"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Link (optional)</label>
              <input
                type="text"
                value={newEvent.meetingLink || ''}
                onChange={(e) => setNewEvent({ ...newEvent, meetingLink: e.target.value })}
                className="input w-full"
                placeholder="e.g., https://zoom.us/j/..."
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingEvent || !newEvent.title || !newEvent.startDateTime}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingEvent ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Calendar className="w-5 h-5" />
                    Create Event
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
