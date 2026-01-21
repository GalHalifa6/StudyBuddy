import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Clock,
  MessageSquare,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Video,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dashboardService, groupService, feedService, sessionService, topicsService } from '../api';
import { FeedResponse } from '../api/feed';
import {
  DashboardOverview,
  MessageUnreadSummary,
  StudyGroup,
} from '../types';

const Dashboard: React.FC = () => {
  const { user, isAdmin, isExpert } = useAuth();
  const { showToast } = useToast();
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [feedData, setFeedData] = useState<FeedResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedOffset, setFeedOffset] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreFeed, setHasMoreFeed] = useState(true);
  const [registeringSessionIds, setRegisteringSessionIds] = useState<Set<number>>(new Set());
  const [hasTopics, setHasTopics] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching dashboard data...');
        
        // Fetch independently so one failure doesn't block others
        const [groupsResult, overviewResult, feedResult, topicsResult] = await Promise.allSettled([
          groupService.getMyGroups(),
          dashboardService.getOverview(),
          feedService.getStudentFeed(0),
          topicsService.getMyTopics(),
        ]);
        
        if (groupsResult.status === 'fulfilled') {
          console.log('My groups:', groupsResult.value);
          setMyGroups(groupsResult.value);
        } else {
          console.error('Failed to load groups:', groupsResult.reason);
        }
        
        if (overviewResult.status === 'fulfilled') {
          console.log('Overview data:', overviewResult.value);
          setOverview(overviewResult.value);
        } else {
          console.error('Failed to load overview:', overviewResult.reason);
        }
        
        if (feedResult.status === 'fulfilled') {
          console.log('Feed data:', feedResult.value);
          setFeedData(feedResult.value);
          // Check if we got less than 4 items (page size), meaning no more items
          setHasMoreFeed(feedResult.value.feedItems.length === 4);
        } else {
          console.error('Failed to load feed:', feedResult.reason);
        }
        
        if (topicsResult.status === 'fulfilled') {
          console.log('Topics data:', topicsResult.value);
          setHasTopics(topicsResult.value.topics.length > 0);
        } else {
          console.error('Failed to load topics:', topicsResult.reason);
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        if (error instanceof Error) {
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const loadMoreFeed = async () => {
    if (isLoadingMore || !hasMoreFeed) return;
    
    try {
      setIsLoadingMore(true);
      const newOffset = feedOffset + 4;
      const moreFeed = await feedService.getStudentFeed(newOffset);
      
      if (moreFeed.feedItems.length > 0) {
        setFeedData(prev => ({
          ...moreFeed,
          feedItems: [...(prev?.feedItems || []), ...moreFeed.feedItems]
        }));
        setFeedOffset(newOffset);
        setHasMoreFeed(moreFeed.feedItems.length === 4);
      } else {
        setHasMoreFeed(false);
      }
    } catch (error) {
      console.error('Failed to load more feed items:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleRegisterSession = async (sessionId: number) => {
    if (registeringSessionIds.has(sessionId)) return;
    
    try {
      setRegisteringSessionIds(prev => new Set(prev).add(sessionId));
      await sessionService.joinSession(sessionId);
      showToast('Successfully registered for session!', 'success');
      
      // Refresh feed to update the card
      const refreshedFeed = await feedService.getStudentFeed(0);
      setFeedData(refreshedFeed);
      setFeedOffset(0);
      setHasMoreFeed(refreshedFeed.feedItems.length === 4);
    } catch (error) {
      console.error('Failed to register for session:', error);
      showToast('Failed to register for session', 'error');
    } finally {
      setRegisteringSessionIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const stats = useMemo(() => {
    const metrics = overview?.metrics ?? ({} as Record<string, number>);

    return [
      {
        label: 'My Groups',
        value: (metrics as Record<string, number>).myGroups ?? myGroups.length,
        icon: Users,
        color: 'from-blue-500 to-blue-600',
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-500',
        description: 'Study circles you belong to',
      },
      {
        label: 'Active Courses',
        value: (metrics as Record<string, number>).enrolledCourses ?? 0,
        icon: BookOpen,
        color: 'from-purple-500 to-purple-600',
        bgColor: 'bg-purple-500/10',
        textColor: 'text-purple-500',
        description: 'Courses on your schedule',
      },
      {
        label: 'Focus Minutes (7d)',
        value: (metrics as Record<string, number>).focusMinutesThisWeek ?? 0,
        icon: Clock,
        color: 'from-emerald-500 to-emerald-600',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-500',
        description: 'Time logged in live sessions',
      },
      {
        label: 'Upcoming Sessions',
        value: (metrics as Record<string, number>).upcomingSessions ?? 0,
        icon: Calendar,
        color: 'from-amber-500 to-amber-600',
        bgColor: 'bg-amber-500/10',
        textColor: 'text-amber-500',
        description: 'Reserved spots ready to join',
      },
    ];
  }, [overview, myGroups.length]);

  const unreadSummary = useMemo(() => overview?.unreadMessages ?? ({
    total: 0,
    groups: [],
  } as MessageUnreadSummary), [overview?.unreadMessages]);
  const focusMinutesThisWeek = overview?.metrics?.focusMinutesThisWeek ?? 0;
  const peersCollaborated = overview?.metrics?.studyPalsCount ?? 0;

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // const formatDateRange = (session: SessionSummary) => {
  //   const startIso = session.scheduledStartTime ?? (session as unknown as { startTime?: string }).startTime;
  //   const endIso = session.scheduledEndTime ?? (session as unknown as { endTime?: string }).endTime;

  //   if (!startIso || !endIso) {
  //     return 'Schedule to be confirmed';
  //   }

  //   const start = new Date(startIso);
  //   const end = new Date(endIso);

  //   return `${start.toLocaleDateString(undefined, {
  //     weekday: 'short',
  //     month: 'short',
  //     day: 'numeric',
  //   })} • ${start.toLocaleTimeString(undefined, {
  //     hour: 'numeric',
  //     minute: '2-digit',
  //   })} - ${end.toLocaleTimeString(undefined, {
  //     hour: 'numeric',
  //     minute: '2-digit',
  //   })}`;
  // };

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

  // const formatSessionType = (sessionType?: string) =>
  //   sessionType
  //     ? sessionType
  //         .replace(/_/g, ' ')
  //         .toLowerCase()
  //         .replace(/(^|\s)\S/g, (s) => s.toUpperCase())
  //     : 'Session';

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
                {getGreeting()}, {user?.fullName?.split(' ')[0] ?? user?.username ?? 'there'}
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-indigo-100 dark:border-indigo-900/60 p-6 shadow-md shadow-indigo-100/40 dark:shadow-indigo-950/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your Feed</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Personalized updates and recommendations just for you.</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-medium bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-200 px-2.5 py-1 rounded-full">
                <Sparkles className="h-3.5 w-3.5" />
                AI Powered
              </span>
            </div>
            
            {!feedData || !feedData.feedItems || feedData.feedItems.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900/60 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-10 text-center">
                <div className="mx-auto h-16 w-16 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-500 dark:text-indigo-200 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Nothing to show yet</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Complete your profile quiz and enroll in courses to get personalized recommendations.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Topics Reminder - Show if user has no topics */}
                {!hasTopics && (
                  <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl text-white p-5 shadow-md">
                    <div className="flex items-start gap-3">
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold mb-1">Choose Your Topics</h4>
                        <p className="text-purple-50 text-sm mb-3">
                          Select topics you're interested in to get personalized group recommendations and better matches.
                        </p>
                        <Link
                          to="/settings"
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition text-sm font-medium"
                        >
                          Choose topics
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
                
                {feedData.feedItems.map((item, index) => {
                  // QUIZ_REMINDER
                  if (item.itemType === 'QUIZ_REMINDER') {
                    return (
                      <div key={`quiz-${index}`} className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white p-5 shadow-md">
                        <div className="flex items-start gap-3">
                          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-base font-semibold mb-1">Complete Your Profile</h4>
                            <p className="text-amber-50 text-sm mb-3">{item.quizMessage}</p>
                            <Link
                              to="/quiz-onboarding"
                              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white text-amber-600 rounded-lg hover:bg-amber-50 transition text-sm font-medium"
                            >
                              Continue the quiz
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // UPCOMING_EVENT
                  if (item.itemType === 'UPCOMING_EVENT') {
                    return (
                      <div key={`event-${index}`} className="border border-teal-200 dark:border-teal-900 rounded-xl p-4 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/40 hover:shadow-md transition">
                        <div className="flex items-start gap-3">
                          <div className="bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-200 p-2 rounded-lg">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.eventTitle}</h4>
                            <p className="text-xs text-teal-600 dark:text-teal-300">{item.groupName}</p>
                            {item.eventDescription && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{item.eventDescription}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-600 dark:text-gray-400">
                              <Clock className="h-3 w-3" />
                              {new Date(item.eventStartTime!).toLocaleDateString()} at {new Date(item.eventStartTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {(item.eventLocation || item.eventMeetingLink) && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                📍 {item.eventLocation || 'Online'}
                              </p>
                            )}
                            <div className="flex justify-end mt-3">
                              <Link
                                to={`/groups/${item.groupId}`}
                                className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 dark:text-teal-400"
                              >
                                View details
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // REGISTERED_SESSION
                  if (item.itemType === 'REGISTERED_SESSION') {
                    return (
                      <div key={`registered-${index}`} className="border border-green-200 dark:border-green-900 rounded-xl p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 hover:shadow-md transition">
                        <div className="flex items-start gap-3">
                          <div className="bg-green-100 dark:bg-green-900/60 text-green-600 dark:text-green-200 p-2 rounded-lg">
                            <Video className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.sessionTitle}</h4>
                              <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full font-medium">Registered</span>
                            </div>
                            {item.courseName && (
                              <p className="text-xs text-green-600 dark:text-green-300">{item.courseName}</p>
                            )}
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              with {item.expertName} • {new Date(item.scheduledAt!).toLocaleDateString()} at {new Date(item.scheduledAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <div className="flex items-center justify-between mt-3">
                              {item.availableSpots !== undefined && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium bg-white/60 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                                  <Users className="h-3 w-3" />
                                  {item.currentSize || 0}/{(item.currentSize || 0) + item.availableSpots} participants
                                </span>
                              )}
                              <Link
                                to={`/session/${item.sessionId}`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition text-sm font-medium ml-auto"
                              >
                                <Video className="h-3.5 w-3.5" />
                                Open session room
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // RECOMMENDED_SESSION
                  if (item.itemType === 'RECOMMENDED_SESSION') {
                    const isRegistering = registeringSessionIds.has(item.sessionId!);
                    return (
                      <div key={`recommended-${index}`} className="border border-cyan-200 dark:border-cyan-900 rounded-xl p-4 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/40 dark:to-blue-950/40 hover:shadow-md transition">
                        <div className="flex items-start gap-3">
                          <div className="bg-cyan-100 dark:bg-cyan-900/60 text-cyan-600 dark:text-cyan-200 p-2 rounded-lg">
                            <Sparkles className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.sessionTitle}</h4>
                              {item.topicMatchPercentage && item.topicMatchPercentage > 0 && (
                                <span className="text-xs bg-cyan-600 text-white px-2 py-0.5 rounded-full font-medium">
                                  {item.topicMatchPercentage}% match
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-cyan-600 dark:text-cyan-300">{item.courseName}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              with {item.expertName} • {new Date(item.scheduledAt!).toLocaleDateString()}
                            </p>
                            {item.availableSpots && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium bg-white/60 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full mt-2">
                                <Users className="h-3 w-3" />
                                {item.availableSpots} spots left
                              </span>
                            )}
                            <div className="flex justify-end mt-3">
                              <button
                                onClick={() => handleRegisterSession(item.sessionId!)}
                                disabled={isRegistering}
                                className="inline-flex items-center gap-1 text-sm font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isRegistering ? (
                                  <>
                                    <div className="h-3.5 w-3.5 border-2 border-cyan-600 dark:border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                    Registering...
                                  </>
                                ) : (
                                  <>
                                    Register
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // GROUP_MATCH
                  if (item.itemType === 'GROUP_MATCH') {
                    return (
                      <div key={`match-${index}`} className="border border-indigo-200 dark:border-indigo-900 rounded-xl p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 hover:shadow-md transition">
                        <div className="flex items-start gap-3">
                          <div className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-200 p-2 rounded-lg">
                            <Users className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.groupName}</h4>
                              <span className="inline-flex items-center gap-1 text-xs font-bold bg-indigo-600 text-white px-2 py-1 rounded-full">
                                {item.matchPercentage}% match
                              </span>
                            </div>
                            <p className="text-xs text-indigo-600 dark:text-indigo-300 mb-2">{item.courseName}</p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{item.matchReason}</p>
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center gap-1 text-xs font-medium bg-white/60 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full">
                                <Users className="h-3 w-3" />
                                {item.currentSize}/{item.maxSize}
                              </span>
                              <Link
                                to={`/groups/${item.groupId}`}
                                className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400"
                              >
                                View group
                                <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })}
                
                {hasMoreFeed && (
                  <button
                    onClick={loadMoreFeed}
                    disabled={isLoadingMore}
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-900 rounded-xl hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/60 dark:hover:to-purple-900/60 transition text-indigo-600 dark:text-indigo-300 font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="h-4 w-4 border-2 border-indigo-600 dark:border-indigo-300 border-t-transparent rounded-full animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Load more
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
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


    </div>
  );
};

export default Dashboard;
