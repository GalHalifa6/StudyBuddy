import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { sessionService, SessionInfo } from '../api/sessions';
import { courseService } from '../api';
import { Course } from '../types';
import {
  Search,
  Calendar,
  Clock,
  Users,
  Video,
  User,
  BookOpen,
  Filter,
  CheckCircle,
  HelpCircle,
  Briefcase,
} from 'lucide-react';

const SessionsBrowse: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [mySessions, setMySessions] = useState<SessionInfo[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'browse' | 'my-sessions'>('browse');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedType, setSelectedType] = useState(searchParams.get('type') || '');
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>(
    searchParams.get('courseId') ? parseInt(searchParams.get('courseId')!) : undefined
  );

  const loadData = useCallback(async () => {
    try {
      const [sessionsData, coursesData, mySessionsData] = await Promise.all([
        sessionService.browseSessions(),
        courseService.getAllCourses(),
        sessionService.getMyUpcomingSessions(),
      ]);
      setSessions(sessionsData);
      setCourses(coursesData);
      setMySessions(mySessionsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sessionService.browseSessions({
        type: selectedType || undefined,
        courseId: selectedCourseId,
        search: searchQuery || undefined,
      });
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedCourseId, searchQuery]);

  const loadMySessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sessionService.getMyUpcomingSessions();
      // Filter out completed and cancelled sessions - only show active/upcoming
      const activeSessions = data.filter((s: SessionInfo) => 
        s.status !== 'Completed' && s.status !== 'Cancelled'
      );
      setMySessions(activeSessions);
    } catch (error) {
      console.error('Failed to load my sessions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'browse') {
      loadSessions();
    } else {
      loadMySessions();
    }
    // Include callbacks in dependencies to ensure we always use the latest versions
    // This prevents stale closures when filters change
  }, [activeTab, loadSessions, loadMySessions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Update URL params - the useEffect will automatically call loadSessions
    // when the filter state changes (which happens via the form inputs)
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedType) params.set('type', selectedType);
    if (selectedCourseId) params.set('courseId', selectedCourseId.toString());
    setSearchParams(params);
    // Note: We don't call loadSessions() here to avoid double-fetching.
    // The effect will run when filter values change (via form inputs),
    // and loadSessions callback will be recreated with new filter values.
  };

  const handleJoinSession = async (sessionId: number) => {
    try {
      await sessionService.joinSession(sessionId);
      // Reload sessions to update the joined status
      loadSessions();
      loadMySessions();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to join session');
    }
  };

  const handleLeaveSession = async (sessionId: number) => {
    try {
      await sessionService.leaveSession(sessionId);
      loadSessions();
      loadMySessions();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to leave session');
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'OFFICE_HOURS': return <Clock className="w-4 h-4" />;
      case 'Q_AND_A': return <HelpCircle className="w-4 h-4" />;
      case 'GROUP': return <Users className="w-4 h-4" />;
      case 'ONE_ON_ONE': return <User className="w-4 h-4" />;
      case 'WORKSHOP': return <Briefcase className="w-4 h-4" />;
      default: return <Video className="w-4 h-4" />;
    }
  };

  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case 'OFFICE_HOURS': return 'Office Hours';
      case 'Q_AND_A': return 'Q&A Session';
      case 'GROUP': return 'Group Session';
      case 'ONE_ON_ONE': return 'One-on-One';
      case 'WORKSHOP': return 'Workshop';
      default: return type;
    }
  };

  const SessionCard: React.FC<{ session: SessionInfo }> = ({ session }) => (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
              {getSessionTypeIcon(session.sessionType)}
            </span>
            <span className="text-xs font-medium text-purple-600">
              {getSessionTypeLabel(session.sessionType)}
            </span>
          </div>
          {session.course && (
            <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
              <BookOpen className="w-3 h-3" />
              {session.course.code}
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="font-semibold text-gray-900 mb-1">{session.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{session.description}</p>

        {/* Expert Info */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {session.expert.fullName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-900">{session.expert.fullName}</span>
              {session.expert.isVerified && (
                <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
              )}
            </div>
            {session.expert.title && (
              <span className="text-xs text-gray-500">{session.expert.title}</span>
            )}
          </div>
        </div>

        {/* Time & Participants */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {formatDateTime(session.scheduledStartTime)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {session.currentParticipants}/{session.maxParticipants}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {session.status === 'In Progress' && session.isJoined ? (
            <>
              <button
                onClick={() => navigate(`/session/${session.id}`)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors animate-pulse"
              >
                <Video className="w-4 h-4" />
                Join Room Now
              </button>
            </>
          ) : session.isJoined ? (
            <>
              <button
                onClick={() => navigate(`/session/${session.id}`)}
                className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Clock className="w-4 h-4" />
                Waiting for Expert
              </button>
              <button
                onClick={() => handleLeaveSession(session.id)}
                className="px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Leave
              </button>
            </>
          ) : session.currentParticipants < session.maxParticipants ? (
            <button
              onClick={() => handleJoinSession(session.id)}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Register
            </button>
          ) : (
            <button
              disabled
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed"
            >
              Session Full
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sessions</h1>
        <p className="text-gray-500 mt-1">Browse and join expert-led sessions</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('browse')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
              activeTab === 'browse'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Browse Sessions
          </button>
          <button
            onClick={() => setActiveTab('my-sessions')}
            className={`pb-4 px-1 border-b-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'my-sessions'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            My Sessions
            {mySessions.length > 0 && (
              <span className="bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded-full">
                {mySessions.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {activeTab === 'browse' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search sessions..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Type Filter */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Types</option>
                <option value="OFFICE_HOURS">Office Hours</option>
                <option value="GROUP">Group Session</option>
                <option value="WORKSHOP">Workshop</option>
                <option value="Q_AND_A">Q&A Session</option>
              </select>

              {/* Course Filter */}
              <select
                value={selectedCourseId || ''}
                onChange={(e) => setSelectedCourseId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} - {course.name}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </form>
          </div>

          {/* Sessions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>

          {sessions.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No sessions found</h3>
              <p className="text-gray-500">
                {searchQuery || selectedType || selectedCourseId
                  ? 'Try adjusting your filters'
                  : 'No upcoming sessions available right now'}
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === 'my-sessions' && (
        <div className="space-y-4">
          {mySessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mySessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No upcoming sessions</h3>
              <p className="text-gray-500 mb-4">Browse and join sessions to see them here</p>
              <button
                onClick={() => setActiveTab('browse')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Browse Sessions
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionsBrowse;
