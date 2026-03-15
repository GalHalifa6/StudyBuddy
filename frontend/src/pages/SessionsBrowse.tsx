import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  HelpCircle,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Users,
  Video,
  X,
} from 'lucide-react';
import { courseService } from '../api';
import { sessionService, SessionInfo } from '../api/sessions';
import { useToast } from '../context/ToastContext';
import { Course } from '../types';

type SessionTab = 'browse' | 'my-sessions';

type SessionFilters = {
  type?: string;
  courseId?: number;
  search?: string;
};

const SESSION_TYPE_OPTIONS = [
  { value: '', label: 'All session types' },
  { value: 'OFFICE_HOURS', label: 'Office Hours' },
  { value: 'GROUP', label: 'Group Session' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'Q_AND_A', label: 'Q&A Session' },
  { value: 'ONE_ON_ONE', label: 'One-on-One' },
];

const formatSessionTypeLabel = (type: string) => {
  switch (type) {
    case 'OFFICE_HOURS':
      return 'Office Hours';
    case 'Q_AND_A':
      return 'Q&A Session';
    case 'GROUP':
      return 'Group Session';
    case 'ONE_ON_ONE':
      return 'One-on-One';
    case 'WORKSHOP':
      return 'Workshop';
    default:
      return type.replace(/_/g, ' ');
  }
};

const getSessionTypeIcon = (type: string) => {
  switch (type) {
    case 'OFFICE_HOURS':
      return Clock;
    case 'Q_AND_A':
      return HelpCircle;
    case 'GROUP':
      return Users;
    case 'ONE_ON_ONE':
      return User;
    case 'WORKSHOP':
      return Briefcase;
    default:
      return Video;
  }
};

const getStatusClasses = (session: SessionInfo) => {
  if (session.status === 'In Progress') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }

  if (session.status === 'Completed') {
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }

  if (session.status === 'Cancelled') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300';
  }

  return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
};

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return {
    dateLabel: date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    timeLabel: date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
};

const SessionsBrowse: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showError, showSuccess } = useToast();

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [mySessions, setMySessions] = useState<SessionInfo[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SessionTab>('browse');
  const [actionSessionId, setActionSessionId] = useState<number | null>(null);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>(
    searchParams.get('courseId') ? parseInt(searchParams.get('courseId')!, 10) : undefined
  );

  const activeFilters = useMemo<SessionFilters>(
    () => ({
      type: selectedType || undefined,
      courseId: selectedCourseId,
      search: searchQuery.trim() || undefined,
    }),
    [searchQuery, selectedCourseId, selectedType]
  );

  const loadCourses = useCallback(async () => {
    try {
      const coursesData = await courseService.getAllCourses();
      setCourses(coursesData);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  }, []);

  const loadBrowseSessions = useCallback(
    async (filters: SessionFilters = activeFilters, options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setIsLoadingTab(true);
      }
      setLoadError(null);
      try {
        const data = await sessionService.browseSessions(filters);
        setSessions(data);
      } catch (error) {
        console.error('Failed to load sessions:', error);
        setLoadError('We could not load available sessions right now.');
      } finally {
        if (!options?.silent) {
          setIsLoadingTab(false);
        }
      }
    },
    [activeFilters]
  );

  const loadMySessions = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoadingTab(true);
    }
    try {
      const data = await sessionService.getMyUpcomingSessions();
      const activeSessions = data.filter(
        (session) => session.status !== 'Completed' && session.status !== 'Cancelled'
      );
      setMySessions(activeSessions);
    } catch (error) {
      console.error('Failed to load my sessions:', error);
      if (activeTab === 'my-sessions') {
        setLoadError('We could not load your registered sessions right now.');
      }
    } finally {
      if (!options?.silent) {
        setIsLoadingTab(false);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        await Promise.all([
          loadCourses(),
          loadBrowseSessions(activeFilters, { silent: true }),
          loadMySessions({ silent: true }),
        ]);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [activeFilters, loadBrowseSessions, loadCourses, loadMySessions]);

  const handleTabChange = async (tab: SessionTab) => {
    setActiveTab(tab);
    setLoadError(null);

    if (tab === 'browse') {
      await loadBrowseSessions();
      return;
    }

    await loadMySessions();
  };

  const updateUrlParams = (filters: SessionFilters) => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.type) params.set('type', filters.type);
    if (filters.courseId) params.set('courseId', filters.courseId.toString());
    setSearchParams(params);
  };

  const handleApplyFilters = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const filters = activeFilters;
    updateUrlParams(filters);
    setActiveTab('browse');
    await loadBrowseSessions(filters);
  };

  const handleClearFilters = async () => {
    setSearchQuery('');
    setSelectedType('');
    setSelectedCourseId(undefined);
    setSearchParams(new URLSearchParams());
    setActiveTab('browse');
    await loadBrowseSessions({});
  };

  const refreshCurrentView = async () => {
    if (activeTab === 'browse') {
      await loadBrowseSessions();
      return;
    }

    await loadMySessions();
  };

  const handleJoinSession = async (sessionId: number) => {
    setActionSessionId(sessionId);
    try {
      await sessionService.joinSession(sessionId);
      showSuccess('You are registered for the session.');
      await Promise.all([
        loadBrowseSessions(activeFilters, { silent: true }),
        loadMySessions({ silent: true }),
      ]);
    } catch (error) {
      console.error('Failed to join session:', error);
      const message =
        typeof error === 'object' && error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      showError(message || 'Failed to join session. Please try again.');
    } finally {
      setActionSessionId(null);
    }
  };

  const handleLeaveSession = async (sessionId: number) => {
    setActionSessionId(sessionId);
    try {
      await sessionService.leaveSession(sessionId);
      showSuccess('You left the session.');
      await Promise.all([
        loadBrowseSessions(activeFilters, { silent: true }),
        loadMySessions({ silent: true }),
      ]);
    } catch (error) {
      console.error('Failed to leave session:', error);
      const message =
        typeof error === 'object' && error && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      showError(message || 'Failed to leave session. Please try again.');
    } finally {
      setActionSessionId(null);
    }
  };

  const availableSessions = useMemo(
    () => sessions.filter((session) => session.status !== 'Completed' && session.status !== 'Cancelled'),
    [sessions]
  );

  const liveSessions = useMemo(
    () => sessions.filter((session) => session.status === 'In Progress').length,
    [sessions]
  );

  const registeredCount = useMemo(
    () => sessions.filter((session) => session.isJoined).length,
    [sessions]
  );

  const SessionCard: React.FC<{ session: SessionInfo; inMySessions?: boolean }> = ({
    session,
    inMySessions = false,
  }) => {
    const SessionTypeIcon = getSessionTypeIcon(session.sessionType);
    const datetime = formatDateTime(session.scheduledStartTime);
    const isActionPending = actionSessionId === session.id;
    const isFull = session.currentParticipants >= session.maxParticipants;
    const isClosed = session.status === 'Completed' || session.status === 'Cancelled';

    return (
      <div className="card p-5 flex flex-col gap-4 shadow-md shadow-gray-100/40 dark:shadow-gray-950/30 hover:shadow-lg transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <SessionTypeIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="badge badge-primary">{formatSessionTypeLabel(session.sessionType)}</span>
                <span className={`badge ${getStatusClasses(session)}`}>{session.status}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {session.title}
              </h3>
            </div>
          </div>
          {session.course && (
            <span className="badge bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300 shrink-0">
              <BookOpen className="w-3.5 h-3.5 mr-1" />
              {session.course.code}
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed min-h-[2.5rem]">
          {session.description || 'No session description provided yet.'}
        </p>

        <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white font-semibold flex items-center justify-center shrink-0">
              {session.expert.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {session.expert.fullName}
                </p>
                {session.expert.isVerified && (
                  <CheckCircle className="w-4 h-4 text-sky-500 fill-sky-500 shrink-0" />
                )}
              </div>
              {session.expert.title && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{session.expert.title}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>{datetime.dateLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>{datetime.timeLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>
                {session.currentParticipants}/{session.maxParticipants} participants
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-indigo-500" />
              <span>{session.meetingPlatform || 'Virtual session room'}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col sm:flex-row gap-2">
          {session.status === 'In Progress' && session.isJoined ? (
            <button
              type="button"
              onClick={() => navigate(`/session/${session.id}`)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white px-4 py-3 font-medium hover:bg-emerald-500 transition"
            >
              <Video className="w-4 h-4" />
              Join room now
            </button>
          ) : session.isJoined ? (
            <>
              <button
                type="button"
                onClick={() => navigate(`/session/${session.id}`)}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 text-white px-4 py-3 font-medium hover:bg-indigo-500 transition"
              >
                <Clock className="w-4 h-4" />
                {session.status === 'In Progress' ? 'Open live room' : 'Open session'}
              </button>
              <button
                type="button"
                onClick={() => void handleLeaveSession(session.id)}
                disabled={isActionPending}
                className="inline-flex items-center justify-center rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 px-4 py-3 font-medium hover:bg-rose-100 dark:hover:bg-rose-950/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isActionPending ? 'Leaving...' : 'Leave'}
              </button>
            </>
          ) : isClosed ? (
            <button
              type="button"
              disabled
              className="flex-1 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-4 py-3 font-medium cursor-not-allowed"
            >
              Session closed
            </button>
          ) : isFull ? (
            <button
              type="button"
              disabled
              className="flex-1 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 px-4 py-3 font-medium cursor-not-allowed"
            >
              Session full
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleJoinSession(session.id)}
              disabled={isActionPending}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-white px-4 py-3 font-medium hover:bg-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isActionPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  Register
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>

        {inMySessions && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Registered sessions stay here so you can quickly rejoin or keep track of what is coming up next.
          </p>
        )}
      </div>
    );
  };

  if (isInitialLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 p-8 text-white shadow-lg animate-pulse">
          <div className="h-5 w-32 rounded bg-white/20 mb-4" />
          <div className="h-10 w-72 rounded bg-white/20 mb-3" />
          <div className="h-4 w-full max-w-2xl rounded bg-white/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((item) => (
            <div key={item} className="card p-6 animate-pulse">
              <div className="h-10 w-10 rounded-2xl bg-gray-200 dark:bg-gray-800 mb-4" />
              <div className="h-7 w-16 rounded bg-gray-200 dark:bg-gray-800 mb-2" />
              <div className="h-4 w-28 rounded bg-gray-100 dark:bg-gray-800/70" />
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
            <div className="flex items-center gap-2 text-indigo-100 mb-2">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm uppercase tracking-[0.25em]">Session hub</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold mb-3">Sessions</h1>
            <p className="text-indigo-100 text-lg leading-relaxed">
              Discover expert-led study sessions, keep your registrations organized, and jump into live rooms with confidence.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[24rem]">
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4">
              <p className="text-xs uppercase tracking-wide text-indigo-100/80">Open sessions</p>
              <p className="mt-2 text-2xl font-semibold">{availableSessions.length}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4">
              <p className="text-xs uppercase tracking-wide text-indigo-100/80">Live now</p>
              <p className="mt-2 text-2xl font-semibold">{liveSessions}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4 col-span-2 sm:col-span-1">
              <p className="text-xs uppercase tracking-wide text-indigo-100/80">Registered</p>
              <p className="mt-2 text-2xl font-semibold">{mySessions.length || registeredCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex gap-2 rounded-2xl bg-gray-100 dark:bg-gray-900/70 p-1.5 self-start">
          <button
            type="button"
            onClick={() => void handleTabChange('browse')}
            className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              activeTab === 'browse'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
            }`}
          >
            Browse sessions
          </button>
          <button
            type="button"
            onClick={() => void handleTabChange('my-sessions')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              activeTab === 'my-sessions'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
            }`}
          >
            My sessions
            {mySessions.length > 0 && (
              <span className="rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 px-2 py-0.5 text-xs">
                {mySessions.length}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={() => void refreshCurrentView()}
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition self-start"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingTab ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {activeTab === 'browse' && (
        <div className="card p-5 shadow-sm">
          <form onSubmit={handleApplyFilters} className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Filter className="w-4 h-4 text-indigo-500" />
              Filter sessions by topic, course, or format
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void handleApplyFilters(event);
                    }
                  }}
                  placeholder="Search by session title, topic, or expert"
                  className="input pl-12"
                />
              </div>

              <select
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
                className="input"
              >
                {SESSION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={selectedCourseId || ''}
                onChange={(event) =>
                  setSelectedCourseId(event.target.value ? parseInt(event.target.value, 10) : undefined)
                }
                className="input"
              >
                <option value="">All courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button type="submit" className="btn-primary inline-flex items-center gap-2 whitespace-nowrap">
                  <Filter className="w-4 h-4" />
                  Apply
                </button>
                {(searchQuery || selectedType || selectedCourseId) && (
                  <button
                    type="button"
                    onClick={() => void handleClearFilters()}
                    className="btn-secondary inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {loadError ? (
        <div className="card p-8 border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20">
          <div className="max-w-xl">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Unable to load sessions</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">{loadError}</p>
            <button onClick={() => void refreshCurrentView()} className="btn-primary inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      ) : activeTab === 'browse' ? (
        <>
          {isLoadingTab ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[0, 1, 2].map((item) => (
                <div key={item} className="card p-5 animate-pulse space-y-4">
                  <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-16 rounded bg-gray-100 dark:bg-gray-800/70" />
                  <div className="h-10 rounded bg-gray-100 dark:bg-gray-800/70" />
                </div>
              ))}
            </div>
          ) : sessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No sessions found</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                {searchQuery || selectedType || selectedCourseId
                  ? 'Try broadening your filters or switching to another session type.'
                  : 'There are no upcoming expert-led sessions available right now.'}
              </p>
              {(searchQuery || selectedType || selectedCourseId) && (
                <button onClick={() => void handleClearFilters()} className="btn-primary inline-flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Clear filters
                </button>
              )}
            </div>
          )}
        </>
      ) : mySessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {mySessions.map((session) => (
            <SessionCard key={session.id} session={session} inMySessions />
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No registered sessions yet</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            Register for an expert session and it will appear here with a quick path back into the session room.
          </p>
          <button
            type="button"
            onClick={() => void handleTabChange('browse')}
            className="btn-primary inline-flex items-center gap-2"
          >
            Browse sessions
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SessionsBrowse;
