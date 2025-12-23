import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, MapPin, ExternalLink, Video, Filter, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { sessionService } from '../api/sessions';
import { calendarService } from '../api/calendar';
import { Event, EventType } from '../types';

interface UpcomingEvent {
  id: number;
  type: 'session' | 'event';
  eventType?: EventType;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  meetingLink?: string;
  attendees?: number;
  maxAttendees?: number;
  groupName?: string;
  groupId?: number;
  expertName?: string;
  isOnline: boolean;
  status: 'upcoming' | 'today' | 'this-week';
}

const UpcomingEvents: React.FC = () => {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [filter, setFilter] = useState<'all' | 'session' | 'group'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  const fetchUpcomingEvents = async () => {
    try {
      // Fetch both sessions and calendar events
      const [sessions, calendarEvents] = await Promise.all([
        sessionService.getMyUpcomingSessions(),
        calendarService.getMyEvents(),
      ]);
      
      // Transform sessions to events
      const sessionEvents: UpcomingEvent[] = sessions.map((session: any) => ({
        id: session.id,
        type: 'session',
        title: session.title,
        description: session.description,
        startTime: session.scheduledStartTime,
        endTime: session.scheduledEndTime,
        expertName: session.expert?.fullName || 'Expert',
        attendees: session.currentParticipants,
        maxAttendees: session.maxParticipants,
        isOnline: true,
        status: getEventStatus(session.scheduledStartTime),
      }));

      // Transform calendar events
      const now = new Date();
      const upcomingCalendarEvents: UpcomingEvent[] = calendarEvents
        .filter((event: Event) => new Date(event.startDateTime) >= now)
        .map((event: Event) => ({
          id: event.id,
          type: 'event',
          eventType: event.eventType,
          title: event.title,
          description: event.description,
          startTime: event.startDateTime,
          endTime: event.endDateTime,
          location: event.location,
          meetingLink: event.meetingLink,
          groupName: event.groupName,
          groupId: event.groupId,
          isOnline: !!event.meetingLink,
          status: getEventStatus(event.startDateTime),
        }));

      // Combine and sort by start time
      const allEvents = [...sessionEvents, ...upcomingCalendarEvents].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      setEvents(allEvents);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventStatus = (startTime: string): 'upcoming' | 'today' | 'this-week' => {
    const now = new Date();
    const eventDate = new Date(startTime);
    const diffTime = eventDate.getTime() - now.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);

    if (diffDays < 1) return 'today';
    if (diffDays < 7) return 'this-week';
    return 'upcoming';
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
    };
  };

  const getEventTypeColor = (type: string, eventType?: EventType) => {
    if (type === 'session') {
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
    }
    
    // Color code by event type
    switch (eventType) {
      case 'STUDY_SESSION':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'MEETING':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
      case 'EXAM':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      case 'ASSIGNMENT_DUE':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
      case 'PROJECT_DEADLINE':
        return 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400';
      case 'PRESENTATION':
        return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400';
      case 'REVIEW_SESSION':
        return 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400';
      case 'OTHER':
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'today':
        return <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs font-semibold">Today</span>;
      case 'this-week':
        return <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-semibold">This Week</span>;
      default:
        return null;
    }
  };

  const filteredEvents = filter === 'all' 
    ? events 
    : events.filter(event => event.type === filter);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-3xl text-white p-8 shadow-lg">
        <h1 className="text-4xl font-bold mb-3">Upcoming Events</h1>
        <p className="text-indigo-100 text-lg">
          Stay on top of your schedule with all your upcoming sessions, group meetings, and deadlines
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {events.filter(e => e.status === 'today').length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {events.filter(e => e.status === 'this-week').length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">This Week</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {events.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Events</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <div className="flex gap-2">
            {['all', 'session', 'event'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === f
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {f === 'all' ? 'All' : f === 'session' ? 'Sessions' : 'Group Events'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No upcoming events
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You don't have any scheduled events at the moment.
          </p>
          <Link
            to="/experts"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium"
          >
            <Video className="w-5 h-5" />
            Browse Expert Sessions
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const datetime = formatDateTime(event.startTime);
            
            return (
              <div
                key={`${event.type}-${event.id}`}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getEventTypeColor(event.type, event.eventType)}`}>
                        {event.type === 'session' ? 'EXPERT SESSION' : event.eventType?.replace(/_/g, ' ')}
                      </span>
                      {getStatusBadge(event.status)}
                      {event.groupName && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                          <BookOpen className="w-3 h-3" />
                          {event.groupName}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      {event.title}
                    </h3>

                    {event.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {datetime.date}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {datetime.time}
                      </div>
                      {event.isOnline && (
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          Online
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </div>
                      )}
                      {event.maxAttendees && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {event.attendees || 0}/{event.maxAttendees}
                        </div>
                      )}
                    </div>

                    {event.expertName && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                        with <span className="font-medium text-gray-700 dark:text-gray-300">{event.expertName}</span>
                      </p>
                    )}
                    
                    {event.meetingLink && (
                      <a
                        href={event.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mt-2"
                      >
                        <Video className="w-4 h-4" />
                        Join Meeting
                      </a>
                    )}
                  </div>

                  <Link
                    to={event.type === 'session' ? `/sessions` : event.groupId ? `/my-groups?group=${event.groupId}` : `/groups`}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium flex items-center gap-2 whitespace-nowrap"
                  >
                    View Details
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UpcomingEvents;
