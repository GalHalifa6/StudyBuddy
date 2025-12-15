import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  MessageSquare,
  Plus,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dashboardService, groupService } from '../api';
import {
  CourseHighlight,
  DashboardOverview,
  MessageUnreadGroupSummary,
  MessageUnreadSummary,
  SessionSummary,
  StudyGroup,
} from '../types';

const Dashboard: React.FC = () => {
  const { user, isAdmin, isExpert } = useAuth();
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupsData, overviewData] = await Promise.all([
          groupService.getMyGroups(),
          dashboardService.getOverview(),
        ]);

        setMyGroups(groupsData);
        setOverview(overviewData);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const stats = useMemo(() => {
    const metrics = overview?.metrics ?? {};

    return [
      {
        label: 'My Groups',
        value: metrics.myGroups ?? myGroups.length,
        icon: Users,
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-500',
        description: 'Study circles you belong to',
      },
      {
        label: 'Active Courses',
        value: metrics.enrolledCourses ?? 0,
        icon: BookOpen,
        color: 'from-purple-500 to-purple-600',
        bgColor: 'bg-purple-500/10',
        textColor: 'text-purple-500',
        description: 'Courses on your schedule',
      },
      {
        label: 'Focus Minutes (7d)',
        value: metrics.focusMinutesThisWeek ?? 0,
        icon: Clock,
        color: 'from-emerald-500 to-emerald-600',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-500',
        description: 'Time logged in live sessions',
      },
      {
        label: 'Upcoming Sessions',
        value: metrics.upcomingSessions ?? 0,
        icon: Calendar,
        color: 'from-amber-500 to-amber-600',
        bgColor: 'bg-amber-500/10',
        textColor: 'text-amber-500',
        description: 'Reserved spots ready to join',
      },
    ];
  }, [overview, myGroups.length]);

  const nextSession = overview?.nextSession ?? null;
  const unreadSummary = overview?.unreadMessages ?? ({
    total: 0,
    groups: [],
  } as MessageUnreadSummary);
  const courseHighlights = overview?.courseHighlights ?? [];
  const focusMinutesThisWeek = overview?.metrics?.focusMinutesThisWeek ?? 0;
  const peersCollaborated = overview?.metrics?.studyPalsCount ?? 0;

  const unreadByGroup = useMemo(() => {
    const map = new Map<number, MessageUnreadGroupSummary>();
    unreadSummary.groups.forEach((group) => {
      map.set(group.groupId, group);
    });
    return map;
  }, [unreadSummary]);

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDateRange = (session: SessionSummary) => {
    const startIso = session.scheduledStartTime ?? (session as unknown as { startTime?: string }).startTime;
    const endIso = session.scheduledEndTime ?? (session as unknown as { endTime?: string }).endTime;

    if (!startIso || !endIso) {
      return 'Schedule to be confirmed';
    }

    const start = new Date(startIso);
    const end = new Date(endIso);

    return `${start.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })} • ${start.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })} - ${end.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  };

  const formatRelativeTime = (isoDate?: string) => {
    if (!isoDate) return 'Just now';

    const now = new Date();
    const target = new Date(isoDate);
    const diffMs = now.getTime() - target.getTime();

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return target.toLocaleDateString();
  };

  const formatSessionType = (sessionType?: string) =>
    sessionType
      ? sessionType
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/(^|\s)\S/g, (s) => s.toUpperCase())
      : 'Session';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your personalized dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-3xl text-white p-8 shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 bg-noise" />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-100 mb-2">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm uppercase tracking-[0.2em]">Learning hub</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold mb-3">
                {getGreeting()}, {user?.firstName ?? user?.username ?? 'there'}
              </h1>
              <p className="text-indigo-100 max-w-xl leading-relaxed">
                Here's a snapshot of your study activity. Jump into your next session, explore recommended courses, or catch up on unread conversations.
              </p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="h-8 w-8 text-indigo-100" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-indigo-100/80">This week</p>
                  <p className="text-lg font-semibold">Your progress pulses</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-indigo-100/90">
                <div>
                  <p className="text-2xl font-semibold leading-none">{focusMinutesThisWeek}</p>
                  <p className="mt-1">Focused minutes logged</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold leading-none">{peersCollaborated}</p>
                  <p className="mt-1">Peers you collaborated with</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-32 w-96 h-96 bg-gradient-to-br from-indigo-400/40 to-purple-400/40 blur-3xl rounded-full" />
      </div>

      {(isAdmin || isExpert) && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 p-6 shadow-lg shadow-indigo-100/40 dark:shadow-indigo-950/30">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-200 p-3 rounded-xl">
                {isAdmin ? <Shield className="h-6 w-6" /> : <Award className="h-6 w-6" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {isAdmin ? 'Administrator tools available' : 'Expert coaching shortcuts'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {isAdmin
                    ? 'Manage users, courses, and platform announcements from the Admin Portal.'
                    : 'Review upcoming coaching sessions and respond to new student questions from your dedicated workspace.'}
                </p>
              </div>
            </div>
            <Link
              to={isAdmin ? '/admin' : '/expert'}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition"
            >
              Open {isAdmin ? 'Admin Portal' : 'Expert Hub'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-lg shadow-gray-100/50 dark:shadow-gray-950/40"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{stat.label}</p>
                <p className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mt-1">{stat.value}</p>
              </div>
              <div className={`${stat.bgColor} ${stat.textColor} p-3 rounded-xl`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-md shadow-gray-200/60 dark:shadow-gray-950/40">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">My Study Groups</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Stay on top of the conversations and plans happening with your peers.</p>
              </div>
              <Link
                to="/groups"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-lg"
              >
                Manage groups
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {myGroups.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900/60 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-10 text-center">
                <div className="mx-auto h-16 w-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 dark:text-indigo-200 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No study groups yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Join or create a study group to collaborate with classmates, share resources, and keep discussions organized.
                </p>
                <Link
                  to="/groups"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition"
                >
                  Find a study group
                  <Plus className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {myGroups.map((group) => {
                  const unreadMeta = unreadByGroup.get(group.id);
                  const unreadCount = unreadMeta?.unreadCount ?? 0;
                  const memberCount = group.memberCount ?? group.members?.length ?? 0;
                  const activityTimestamp = unreadMeta?.lastMessageAt ?? group.updatedAt ?? group.createdAt;

                  return (
                  <div
                    key={group.id}
                    className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-white dark:bg-gray-900/80 hover:border-indigo-200 dark:hover:border-indigo-900 transition"
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{group.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{group.course?.code ?? 'Independent study'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {unreadCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-200 px-2.5 py-1 rounded-full">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {unreadCount}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-xs font-medium bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200 px-2.5 py-1 rounded-full">
                          <Users className="h-3.5 w-3.5" />
                          {memberCount} members
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">{group.description || 'No description provided yet.'}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        Active {activityTimestamp ? formatRelativeTime(activityTimestamp) : 'recently'}
                      </span>
                      <Link
                        to={`/groups/${group.id}`}
                        className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-400"
                      >
                        Enter group
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {nextSession && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-emerald-100 dark:border-emerald-900/60 p-6 shadow-md shadow-emerald-100/40 dark:shadow-emerald-950/30">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-200 p-3 rounded-xl">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-emerald-600 dark:text-emerald-300 font-medium mb-1">Next session</p>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {nextSession.title || `Upcoming ${formatSessionType(nextSession.sessionType)}`}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatSessionType(nextSession.sessionType)} with {nextSession.expert?.fullName ?? 'your expert mentor'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatDateRange(nextSession)}</p>
                </div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="bg-white dark:bg-emerald-950 text-emerald-600 dark:text-emerald-200 p-2 rounded-lg">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-200">{nextSession.course?.name ?? nextSession.title ?? 'Live study session'}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-300/80 mt-1">
                      {nextSession.course?.code
                        ? `${nextSession.course.code} • ${formatSessionType(nextSession.sessionType)}`
                        : 'We will share prep materials ahead of the call.'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Reminder scheduled 30 minutes ahead
                  </span>
                </div>
                <Link
                  to={`/session/${nextSession.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition"
                >
                  Open session room
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-md shadow-gray-200/60 dark:shadow-gray-950/40">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Quick actions</h2>
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200 px-2.5 py-1 rounded-full">
                <Sparkles className="h-3.5 w-3.5" />
                Recommended
              </span>
            </div>
            <div className="space-y-3">
              <Link
                to="/sessions"
                className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900 rounded-xl px-4 py-3 transition"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-indigo-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Browse upcoming sessions</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Reserve a spot with your favorite expert.</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-indigo-500" />
              </Link>
              <Link
                to="/qa"
                className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900 rounded-xl px-4 py-3 transition"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-indigo-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Ask or answer questions</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Contribute to the Q&A community.</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-indigo-500" />
              </Link>
              <Link
                to="/experts"
                className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-900 rounded-xl px-4 py-3 transition"
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-5 w-5 text-indigo-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Connect with experts</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Find mentors matched to your goals.</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-indigo-500" />
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-rose-100 dark:border-rose-900/60 p-6 shadow-md shadow-rose-100/40 dark:shadow-rose-950/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-200 p-3 rounded-xl">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Unread messages</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Catch up on conversations that need your attention.</p>
                </div>
              </div>
              <Link
                to="/messages"
                className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 dark:text-rose-300"
              >
                Open inbox
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-rose-700 dark:text-rose-200">{unreadSummary.total} total unread across your groups</p>
              <p className="text-xs text-rose-600 dark:text-rose-300 mt-1">
                We notify you about new replies and session reminders automatically.
              </p>
            </div>
            {unreadSummary.groups.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">All conversations are up to date. Great job staying engaged!</p>
            ) : (
              <div className="space-y-3">
                {unreadSummary.groups.slice(0, 3).map((group) => (
                  <div
                    key={group.groupId}
                    className="flex items-center justify-between bg-white dark:bg-gray-900/80 border border-rose-100 dark:border-rose-900/40 rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{group.groupName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Last activity {formatRelativeTime(group.lastMessageAt)}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-medium bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-200 px-2.5 py-1 rounded-full">
                      <MessageSquare className="h-3 w-3" />
                      {group.unreadCount}
                    </span>
                  </div>
                ))}
                {unreadSummary.groups.length > 3 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">And {unreadSummary.groups.length - 3} more groups need attention.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-md shadow-gray-200/60 dark:shadow-gray-950/40">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your course highlights</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Personalized recommendations and activity signals drawn from your enrolled courses.</p>
          </div>
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition"
          >
            Explore catalog
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {courseHighlights.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900/60 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-10 text-center">
            <div className="mx-auto h-16 w-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 dark:text-indigo-200 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No course insights yet</h3>
            <p className="text-gray-500 dark:text-gray-400">
              Enroll in a course to unlock curated study groups, upcoming sessions, and popular discussion threads.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {courseHighlights.map((highlight: CourseHighlight) => (
              <div
                key={highlight.courseId}
                className="border border-gray-200 dark:border-gray-800 rounded-xl p-5 bg-white dark:bg-gray-900/80 hover:border-indigo-200 dark:hover:border-indigo-900 transition"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-indigo-500 font-medium">{highlight.code}</p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{highlight.name}</h3>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200 px-2.5 py-1 rounded-full">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {highlight.questionCount} Q&A
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-500" />
                    {highlight.groupCount} study groups · {highlight.openGroupCount} open to join
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    {highlight.upcomingSession
                      ? `Next session ${formatDateRange(highlight.upcomingSession)}`
                      : 'No upcoming sessions scheduled'}
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-indigo-500" />
                    {highlight.questionCount} public questions
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-indigo-500" />
                    {highlight.expertCount} experts specializing in this course
                  </div>
                </div>

                {highlight.recentQuestion && (
                  <div className="bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl p-3 mb-4">
                    <p className="text-xs uppercase font-medium text-indigo-500 mb-1">Community question highlight</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{highlight.recentQuestion.title}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <Link
                    to={`/courses/${highlight.courseId}`}
                    className="inline-flex items-center gap-2 font-medium text-indigo-600 dark:text-indigo-400"
                  >
                    View course extras
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Enrolled course</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
