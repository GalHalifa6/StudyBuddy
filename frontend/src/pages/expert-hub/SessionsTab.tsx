import {
  ArrowRight,
  Search,
  User,
  Users,
  CheckCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  Calendar,
  Video,
} from 'lucide-react';
import type { SessionInfo } from '../../api/sessions';
import type { Course } from '../../types';

interface SessionsTabProps {
  filteredSessions: SessionInfo[];
  sessionView: 'browse' | 'my-sessions';
  onSessionViewChange: (view: 'browse' | 'my-sessions') => void;
  mySessionsCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedCourseId: number | undefined;
  onCourseChange: (id: number | undefined) => void;
  courses: Course[];
  joiningSessionId: number | null;
  onJoinSession: (id: number) => void;
  onNavigate: (path: string) => void;
  formatDateTime: (dateStr: string) => string;
}

export default function SessionsTab({
  filteredSessions,
  sessionView,
  onSessionViewChange,
  mySessionsCount,
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedCourseId,
  onCourseChange,
  courses,
  joiningSessionId,
  onJoinSession,
  onNavigate,
  formatDateTime,
}: SessionsTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 text-sm dark:border-gray-700 dark:bg-gray-900">
          <button
            onClick={() => onSessionViewChange('browse')}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              sessionView === 'browse'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            Browse Sessions
          </button>
          <button
            onClick={() => onSessionViewChange('my-sessions')}
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              sessionView === 'my-sessions'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            My Sessions ({mySessionsCount})
          </button>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/sessions')}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          Open full sessions hub
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {sessionView === 'browse' && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search sessions, experts, or titles..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
          >
            <option value="">All Types</option>
            <option value="OFFICE_HOURS">Office Hours</option>
            <option value="Q_AND_A">Q&A Session</option>
            <option value="WORKSHOP">Workshop</option>
            <option value="ONE_ON_ONE">One-on-One</option>
          </select>
          <select
            value={selectedCourseId || ''}
            onChange={(e) => onCourseChange(e.target.value ? Number(e.target.value) : undefined)}
            className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
          >
            <option value="">All Courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.code}</option>
            ))}
          </select>
        </div>
      )}

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {sessionView === 'my-sessions' ? 'No upcoming sessions' : 'No sessions found'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {sessionView === 'my-sessions'
              ? 'Join a session to see it here'
              : 'Try adjusting your search or filters'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredSessions.map((session) => {
            const sessionActionDisabled = !session.canJoin || joiningSessionId === session.id;

            return (
              <div key={session.id} className="card p-6 hover:shadow-lg transition-shadow flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="badge badge-primary">{session.sessionType.replace(/_/g, ' ')}</span>
                      <span className={`badge ${session.status === 'In Progress'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                        {session.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {session.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {session.description}
                    </p>
                  </div>
                  {session.course && (
                    <span className="text-xs bg-sky-100 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 px-2 py-1 rounded-full font-medium shrink-0">
                      {session.course.code}
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{session.expert.fullName}</span>
                    {session.expert.isVerified && (
                      <CheckCircle className="w-3 h-3 text-green-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatDateTime(session.scheduledStartTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{session.currentParticipants} / {session.maxParticipants} participants</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                  {session.isJoined ? (
                    <button
                      type="button"
                      onClick={() => onNavigate(`/session/${session.id}`)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                    >
                      {session.status === 'In Progress' ? <Video className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                      {session.status === 'In Progress' ? 'Join Room' : 'Open Session'}
                    </button>
                  ) : (
                    <button
                      onClick={() => onJoinSession(session.id)}
                      disabled={sessionActionDisabled}
                      className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                      {joiningSessionId === session.id ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        'Join Session'
                      )}
                    </button>
                  )}
                  {session.meetingLink && (
                    <a
                      href={session.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                    >
                      <ExternalLink className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
