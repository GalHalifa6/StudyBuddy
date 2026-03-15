import {
  Clock,
  MapPin,
  Video,
  Calendar,
  Plus,
} from 'lucide-react';
import { Event, EventType } from '../../types';

interface GroupScheduleTabProps {
  events: Event[];
  onCreateEvent: () => void;
  onSelectEvent: (event: Event) => void;
}

const getEventTypeColor = (eventType: EventType) => {
  switch (eventType) {
    case 'STUDY_SESSION':
      return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300';
    case 'MEETING':
      return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300';
    case 'EXAM':
      return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300';
    case 'ASSIGNMENT_DUE':
      return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300';
    case 'PROJECT_DEADLINE':
      return 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300';
    case 'PRESENTATION':
      return 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300';
    case 'REVIEW_SESSION':
      return 'bg-teal-100 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300';
    case 'OTHER':
    default:
      return 'bg-gray-100 dark:bg-gray-700/30 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300';
  }
};

export default function GroupScheduleTab({
  events,
  onCreateEvent,
  onSelectEvent,
}: GroupScheduleTabProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 flex flex-col">
      {/* Header with Create Event button */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Group Events</h3>
        <button
          onClick={onCreateEvent}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-6">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No events yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Create an event to get started!</p>
            <button
              onClick={onCreateEvent}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              <Plus className="w-4 h-4" />
              Create First Event
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {events
              .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
              .map((event) => {
                const startDate = new Date(event.startDateTime);
                const endDate = event.endDateTime ? new Date(event.endDateTime) : null;
                const isPast = startDate < new Date();

                return (
                  <div
                    key={event.id}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                      isPast
                        ? 'opacity-60 ' + getEventTypeColor(event.eventType)
                        : getEventTypeColor(event.eventType)
                    }`}
                    onClick={() => onSelectEvent(event)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold">{event.title}</h4>
                        <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full font-medium ${getEventTypeColor(event.eventType)}`}>
                          {event.eventType.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mt-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {startDate.toLocaleDateString()} at {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {endDate && ` - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      {event.meetingLink && (
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          <a
                            href={event.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 dark:text-indigo-400 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Join Meeting
                          </a>
                        </div>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{event.description}</p>
                    )}

                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      Created by {event.creatorName}
                    </p>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
