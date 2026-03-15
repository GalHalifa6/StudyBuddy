import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Clock,
  ExternalLink,
  Filter,
  MapPin,
  RefreshCw,
  Users,
  Video,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { calendarService } from '../api/calendar';
import { sessionService } from '../api/sessions';
import { Event, EventType, SessionSummary } from '../types';

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

type EventFilter = 'all' | 'session' | 'event';

const FILTER_OPTIONS: Array<{ value: EventFilter; label: string; emptyTitle: string; emptyDescription: string }> = [
  {
    value: 'all',
    label: 'All activity',
    emptyTitle: 'No upcoming activity',
    emptyDescription: 'You do not have any upcoming sessions or group events scheduled yet.',
  },
  {
    value: 'session',
    label: 'Expert sessions',
    emptyTitle: 'No upcoming sessions',
    emptyDescription: 'Book an expert session to keep your study plan moving.',
  },
  {
    value: 'event',
    label: 'Group events',
    emptyTitle: 'No group events scheduled',
    emptyDescription: 'Create or join a study group to see meetings, deadlines, and shared events here.',
  },
];

const getEventStatus = (startTime: string): 'upcoming' | 'today' | 'this-week' => {
  const now = new Date();
  const eventDate = new Date(startTime);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfNextWeek = new Date(startOfToday);
  startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

  if (eventDate < startOfTomorrow) {
    return 'today';
  }

  if (eventDate < startOfNextWeek) {
    return 'this-week';
  }

  return 'upcoming';
};

const formatDateParts = (startTime: string, endTime?: string) => {
  const startDate = new Date(startTime);
  const endDate = endTime ? new Date(endTime) : null;

  return {
    weekday: startDate.toLocaleDateString(undefined, { weekday: 'short' }),
    month: startDate.toLocaleDateString(undefined, { month: 'short' }),
    day: startDate.toLocaleDateString(undefined, { day: 'numeric' }),
    dateLabel: startDate.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    timeLabel: endDate
      ? `${startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
      : startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
};

const formatEventTypeLabel = (eventType?: EventType) => {
  if (!eventType) {
    return 'Group Event';
  }

  return eventType
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getEventTypeColor = (type: UpcomingEvent['type'], eventType?: EventType) => {
  if (type === 'session') {
    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
  }

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

const getStatusBadge = (status: UpcomingEvent['status']) => {
  switch (status) {
    case 'today':
      return (
        <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Today
        </span>
      );
    case 'this-week':
      return (
        <span className="badge bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
          This week
        </span>
      );
    default:
      return null;
  }
};

const UpcomingEvents: React.FC = () => {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [filter, setFilter] = useState<EventFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchUpcomingEvents = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [sessions, calendarEvents] = await Promise.all([
        sessionService.getMyUpcomingSessions(),
        calendarService.getMyEvents(),
      ]);

      const sessionEvents: UpcomingEvent[] = sessions.map((session: SessionSummary) => ({
        id: session.id,
        type: 'session',
        title: session.title,
        description: (session as { description?: string }).description || '',
        startTime: session.scheduledStartTime,
        endTime: session.scheduledEndTime,
        expertName: session.expert?.fullName || 'Expert',
        attendees: session.currentParticipants,
        maxAttendees: session.maxParticipants,
        isOnline: true,
        status: getEventStatus(session.scheduledStartTime),
      }));

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
          isOnline: Boolean(event.meetingLink),
          status: getEventStatus(event.startDateTime),
        }));

      const allEvents = [...sessionEvents, ...upcomingCalendarEvents].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      setEvents(allEvents);
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setLoadError('We could not load your calendar right now.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchUpcomingEvents();
  }, [fetchUpcomingEvents]);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') {
      return events;
    }

    return events.filter((event) => event.type === filter);
  }, [events, filter]);

  const counts = useMemo(
    () => ({
      today: events.filter((event) => event.status === 'today').length,
      thisWeek: events.filter((event) => event.status === 'this-week').length,
      total: events.length,
      session: events.filter((event) => event.type === 'session').length,
      event: events.filter((event) => event.type === 'event').length,
    }),
    [events]
  );

  const selectedFilterOption = FILTER_OPTIONS.find((option) => option.value === filter) || FILTER_OPTIONS[0];

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 p-8 text-white shadow-lg animate-pulse">
          <div className="h-5 w-36 rounded bg-white/20 mb-4" />
          <div className="h-10 w-64 rounded bg-white/20 mb-3" />
          <div className="h-4 w-full max-w-2xl rounded bg-white/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 animate-pulse">
              <div className="h-14 w-14 rounded-2xl bg-gray-200 dark:bg-gray-800 mb-4" />
              <div className="h-8 w-16 rounded bg-gray-200 dark:bg-gray-800 mb-2" />
              <div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800/70" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 text-white p-8 shadow-lg">
        <div className="absolute inset-0 opacity-20 bg-noise" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-100 mb-2">Schedule overview</p>
            <h1 className="text-4xl font-semibold mb-3">Upcoming Events</h1>
            <p className="text-indigo-100 text-lg leading-relaxed">
              Keep sessions, group meetings, and deadlines in one clear timeline so your next commitment is always easy to spot.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-5 min-w-[18rem]">
            <p className="text-xs uppercase tracking-wide text-indigo-100/80 mb-2">Next seven days</p>
            <div className="grid grid-cols-2 gap-4 text-sm text-indigo-100">
              <div>
                <p className="text-2xl font-semibold text-white">{counts.today}</p>
                <p className="mt-1">Happening today</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">{counts.thisWeek}</p>
                <p className="mt-1">Due this week</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{counts.today}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Today</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-300">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{counts.thisWeek}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">This week</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{counts.total}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Scheduled items</p>
            </div>
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900/60 p-8 shadow-sm">
          <div className="max-w-xl">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Calendar unavailable</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              {loadError} Retry to reload your upcoming sessions and group events.
            </p>
            <button onClick={() => void fetchUpcomingEvents()} className="btn-primary inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh calendar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <Filter className="w-4 h-4 text-indigo-500" />
                  Filter your schedule
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">What do you want to focus on?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Separate expert sessions from group activity when you need a cleaner view.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTER_OPTIONS.map((option) => {
                  const count = option.value === 'all' ? counts.total : counts[option.value];
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFilter(option.value)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                        filter === option.value
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span>{option.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${filter === option.value ? 'bg-white/15 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {selectedFilterOption.emptyTitle}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                {selectedFilterOption.emptyDescription}
              </p>
              <Link
                to={filter === 'event' ? '/groups' : '/sessions'}
                className="btn-primary inline-flex items-center gap-2"
              >
                {filter === 'event' ? <BookOpen className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                {filter === 'event' ? 'Explore study groups' : 'Browse expert sessions'}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => {
                const dateParts = formatDateParts(event.startTime, event.endTime);
                return (
                  <div
                    key={`${event.type}-${event.id}`}
                    className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition"
                  >
                    <div className="flex flex-col xl:flex-row gap-5 xl:items-start xl:justify-between">
                      <div className="flex flex-col sm:flex-row gap-5 flex-1 min-w-0">
                        <div className="shrink-0 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 p-4 min-w-[7.5rem] text-center">
                          <p className="text-xs uppercase tracking-wide text-indigo-500 dark:text-indigo-300">{dateParts.weekday}</p>
                          <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{dateParts.day}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{dateParts.month}</p>
                          <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300 mt-3">{dateParts.timeLabel}</p>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className={`badge ${getEventTypeColor(event.type, event.eventType)}`}>
                              {event.type === 'session' ? 'Expert Session' : formatEventTypeLabel(event.eventType)}
                            </span>
                            {getStatusBadge(event.status)}
                            {event.groupName && (
                              <span className="badge bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                <BookOpen className="w-3.5 h-3.5 mr-1" />
                                {event.groupName}
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                            {event.title}
                          </h3>

                          {event.description && (
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-4 line-clamp-2">
                              {event.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="inline-flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              {dateParts.dateLabel}
                            </div>
                            <div className="inline-flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              {dateParts.timeLabel}
                            </div>
                            {event.isOnline && (
                              <div className="inline-flex items-center gap-2">
                                <Video className="w-4 h-4" />
                                Online
                              </div>
                            )}
                            {event.location && (
                              <div className="inline-flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {event.location}
                              </div>
                            )}
                            {event.maxAttendees && (
                              <div className="inline-flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                {event.attendees || 0}/{event.maxAttendees} attending
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
                              className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-300 hover:underline mt-3"
                            >
                              <Video className="w-4 h-4" />
                              Join meeting
                            </a>
                          )}
                        </div>
                      </div>

                      <Link
                        to={event.type === 'session' ? '/sessions' : event.groupId ? `/my-groups?group=${event.groupId}` : '/groups'}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-white px-5 py-3 font-medium hover:bg-indigo-500 transition whitespace-nowrap self-start"
                      >
                        View details
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UpcomingEvents;
