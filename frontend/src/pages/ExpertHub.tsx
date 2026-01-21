import React, { useState, useEffect } from 'react';
import {
  studentExpertService,
  ExpertSearchResult,
  ExpertProfile,
  ExpertSession,
  AskQuestionRequest,
  ExpertReview,
} from '../api/experts';
import { sessionService, SessionInfo } from '../api/sessions';
import { questionService } from '../api/questions';
import type { ExpertQuestion } from '../api/experts';
import { courseService } from '../api';
import { Course } from '../types';
import {
  Search,
  Star,
  MessageCircle,
  Users,
  CheckCircle,
  X,
  Send,
  User,
  Award,
  Clock,
  ExternalLink,
  Shield,
  Loader2,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  GraduationCap,
  Calendar,
  HelpCircle,
  BookOpen,
} from 'lucide-react';

type TabType = 'experts' | 'sessions' | 'questions';

const ExpertsBrowse: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('experts');
  const [loading, setLoading] = useState(true);
  
  // Experts state
  const [experts, setExperts] = useState<ExpertSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  
  // Sessions state
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [mySessions, setMySessions] = useState<SessionInfo[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessionView, setSessionView] = useState<'browse' | 'my-sessions'>('browse');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<number | undefined>();
  
  // Questions state
  const [publicQuestions, setPublicQuestions] = useState<ExpertQuestion[]>([]);
  const [personalQuestions, setPersonalQuestions] = useState<ExpertQuestion[]>([]);
  const [questionView, setQuestionView] = useState<'public' | 'personal'>('public');
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'answered' | 'unanswered'>('all');
  
  // Expert detail modal
  const [selectedExpert, setSelectedExpert] = useState<ExpertProfile | null>(null);
  const [expertReviews, setExpertReviews] = useState<ExpertReview[]>([]);
  const [expertSessions, setExpertSessions] = useState<ExpertSession[]>([]);
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [expertModalTab, setExpertModalTab] = useState<'about' | 'sessions' | 'reviews'>('about');
  
  // Ask question modal
  const [showAskModal, setShowAskModal] = useState(false);
  const [questionForm, setQuestionForm] = useState<Partial<AskQuestionRequest>>({
    title: '',
    content: '',
    isPublic: true,
    isUrgent: false,
  });

  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    review: '',
  });

  // Stats for header
  const [stats, setStats] = useState({
    totalExperts: 0,
    upcomingSessions: 0,
    answeredQuestions: 0,
  });

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [expertsData, sessionsData, mySessionsData, coursesData, publicQuestionsData] = await Promise.all([
        studentExpertService.getAllExperts(),
        sessionService.getAllSessions(), // Changed to show ALL sessions in the system
        sessionService.getMyUpcomingSessions().catch(() => []),
        courseService.getAllCourses(),
        questionService.getPublicQuestions(),
      ]);

      setExperts(expertsData);
      setSessions(sessionsData);
      setMySessions(mySessionsData);
      setCourses(coursesData);
      setPublicQuestions(publicQuestionsData);

      // Calculate stats
      setStats({
        totalExperts: expertsData.length,
        upcomingSessions: sessionsData.filter((s: SessionInfo) => s.status !== 'Completed').length,
        answeredQuestions: publicQuestionsData.filter((q: ExpertQuestion) => q.answer).length,
      });
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPersonalQuestions = async () => {
    try {
      const data = await questionService.getMyQuestions();
      setPersonalQuestions(data);
    } catch (error) {
      console.error('Failed to load personal questions:', error);
    }
  };

  // Filter experts by search and specialization
  const filteredExperts = experts.filter((expert) => {
    const matchesSearch = !searchQuery || 
      expert.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expert.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expert.bio?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSpec = !selectedSpecialization || 
      expert.specializations?.includes(selectedSpecialization);
    
    return matchesSearch && matchesSpec;
  });

  // Filter sessions
  const filteredSessions = sessionView === 'browse' 
    ? sessions.filter((session) => {
        const matchesSearch = !searchQuery || 
          session.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = !selectedType || session.sessionType === selectedType;
        const matchesCourse = !selectedCourseId || session.course?.id === selectedCourseId;
        return matchesSearch && matchesType && matchesCourse;
      })
    : mySessions;

  // Filter questions
  const filteredQuestions = (questionView === 'public' ? publicQuestions : personalQuestions).filter((q) => {
    const matchesSearch = !searchQuery || 
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'answered' && q.answer) ||
      (filterStatus === 'unanswered' && !q.answer);
    
    return matchesSearch && matchesStatus;
  });

  const openExpertProfile = async (expertUserId: number) => {
    try {
      const [profile, reviews, sessions] = await Promise.all([
        studentExpertService.getExpertProfile(expertUserId),
        studentExpertService.getExpertReviews(expertUserId),
        studentExpertService.getExpertSessions(expertUserId),
      ]);
      setSelectedExpert(profile);
      setExpertReviews(reviews);
      setExpertSessions(sessions);
      setExpertModalTab('about');
      setShowExpertModal(true);
    } catch (error) {
      console.error('Failed to load expert profile:', error);
    }
  };

  const handleAskQuestion = async () => {
    if (!selectedExpert || !questionForm.title?.trim() || !questionForm.content?.trim()) return;
    try {
      await studentExpertService.askQuestion({
        ...questionForm as AskQuestionRequest,
        expertId: selectedExpert.userId,
      });
      setShowAskModal(false);
      setQuestionForm({ title: '', content: '', isPublic: true, isUrgent: false });
      alert('Question submitted successfully!');
      loadInitialData();
    } catch (error) {
      console.error('Failed to ask question:', error);
      alert('Failed to submit question.');
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedExpert || !reviewForm.review.trim() || reviewForm.rating < 1 || reviewForm.rating > 5) return;
    try {
      await studentExpertService.submitReview(selectedExpert.userId, {
        rating: reviewForm.rating,
        review: reviewForm.review,
      });
      setShowReviewModal(false);
      setReviewForm({ rating: 5, review: '' });
      alert('Review submitted successfully!');
      // Reload reviews
      const reviews = await studentExpertService.getExpertReviews(selectedExpert.userId);
      setExpertReviews(reviews);
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review.');
    }
  };

  const handleJoinSession = async (sessionId: number) => {
    try {
      await sessionService.joinSession(sessionId);
      loadInitialData();
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error
        ? error.message
        : 'Failed to join session';
      alert(errorMessage || 'Failed to join session');
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

  const allSpecializations = [...new Set(experts.flatMap(e => e.specializations || []))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading expert hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-3xl text-white p-8 shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 bg-noise" />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-100 mb-2">
                <GraduationCap className="h-5 w-5" />
                <span className="text-sm uppercase tracking-[0.2em]">Expert Network</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold mb-3">
                Connect with Experts
              </h1>
              <p className="text-indigo-100 max-w-2xl leading-relaxed">
                Browse expert profiles, book sessions, ask questions, and get personalized help from verified mentors and instructors.
              </p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <Award className="h-8 w-8 text-indigo-100" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-indigo-100/80">Available</p>
                  <p className="text-lg font-semibold">Expert Resources</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm text-indigo-100/90">
                <div>
                  <p className="text-2xl font-semibold leading-none">{stats.totalExperts}</p>
                  <p className="mt-1">Experts</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold leading-none">{stats.upcomingSessions}</p>
                  <p className="mt-1">Sessions</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold leading-none">{stats.answeredQuestions}</p>
                  <p className="mt-1">Q&As</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-32 w-96 h-96 bg-gradient-to-br from-indigo-400/40 to-purple-400/40 blur-3xl rounded-full" />
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1 text-sm dark:border-gray-700 dark:bg-gray-900 shadow-sm">
          <button
            onClick={() => setActiveTab('experts')}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-colors ${
              activeTab === 'experts'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Browse Experts
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-colors ${
              activeTab === 'sessions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Sessions
          </button>
          <button
            onClick={() => {
              setActiveTab('questions');
              if (questionView === 'personal' && personalQuestions.length === 0) {
                loadPersonalQuestions();
              }
            }}
            className={`flex items-center gap-2 rounded-xl px-6 py-3 font-medium transition-colors ${
              activeTab === 'questions'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Q&A
          </button>
        </div>
      </div>

      {/* Experts Tab */}
      {activeTab === 'experts' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search experts by name, title, or expertise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={selectedSpecialization}
              onChange={(e) => setSelectedSpecialization(e.target.value)}
              className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
            >
              <option value="">All Specializations</option>
              {allSpecializations.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          {/* Experts Grid */}
          {filteredExperts.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No experts found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExperts.map((expert) => (
                <div key={expert.userId} className="card p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 shadow-lg">
                      {expert.fullName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                        {expert.fullName}
                      </h3>
                      {expert.title && (
                        <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                          {expert.title}
                        </p>
                      )}
                      {expert.isVerified && (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                  </div>

                  {expert.bio && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {expert.bio}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold">{expert.averageRating?.toFixed(1) || 'N/A'}</span>
                      <span className="text-xs">({(expert as { totalReviews?: number }).totalReviews || 0})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{(expert as { totalQuestions?: number }).totalQuestions || 0} Q&A</span>
                    </div>
                  </div>

                  {expert.specializations && expert.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {expert.specializations.slice(0, 3).map((spec) => (
                        <span key={spec} className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-full">
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => openExpertProfile(expert.userId)}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
                  >
                    View Profile
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-6">
          {/* Session View Toggle */}
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 text-sm dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={() => setSessionView('browse')}
                className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                  sessionView === 'browse'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
                }`}
              >
                Browse All
              </button>
              <button
                onClick={() => setSessionView('my-sessions')}
                className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                  sessionView === 'my-sessions'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
                }`}
              >
                My Sessions ({mySessions.length})
              </button>
            </div>
          </div>

          {sessionView === 'browse' && (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                />
              </div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
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
                onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : undefined)}
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
              {filteredSessions.map((session) => (
                <div key={session.id} className="card p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {session.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                        {session.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
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
                    {session.course && (
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          {session.course.code}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{session.currentParticipants} / {session.maxParticipants} participants</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                    {session.isJoined ? (
                      <span className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Enrolled
                      </span>
                    ) : (
                      <button
                        onClick={() => handleJoinSession(session.id)}
                        disabled={!session.canJoin}
                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Join Session
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === 'questions' && (
        <div className="space-y-6">
          {/* Question View Toggle and Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 text-sm dark:border-gray-700 dark:bg-gray-900">
              <button
                onClick={() => setQuestionView('public')}
                className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                  questionView === 'public'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
                }`}
              >
                Community Q&A
              </button>
              <button
                onClick={() => {
                  setQuestionView('personal');
                  if (personalQuestions.length === 0) loadPersonalQuestions();
                }}
                className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                  questionView === 'personal'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
                }`}
              >
                My Questions
              </button>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => {
                const value = e.target.value;
                if (value === 'all' || value === 'answered' || value === 'unanswered') {
                  setFilterStatus(value);
                }
              }}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white text-sm"
            >
              <option value="all">All Questions</option>
              <option value="answered">Answered</option>
              <option value="unanswered">Unanswered</option>
            </select>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
            />
          </div>

          {/* Questions List */}
          {filteredQuestions.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No questions found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {questionView === 'personal' 
                  ? 'Ask your first question to an expert'
                  : 'Try adjusting your search or filters'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((question) => (
                <div key={question.id} className="card p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {question.title}
                        </h3>
                        {question.isUrgent && (
                          <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-medium">
                            Urgent
                          </span>
                        )}
                        {question.answer && (
                          <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Answered
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {question.content.substring(0, 200)}
                        {question.content.length > 200 && '...'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {question.expert?.fullName || 'Expert'}
                        </span>
                        {question.course && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {question.course.code}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(question.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          {question.upvotes || 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {expandedQuestion === question.id && question.answer && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-start gap-3 bg-green-50 dark:bg-green-900/10 rounded-xl p-4">
                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                            Expert Answer
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {question.answer}
                          </p>
                          {question.answeredAt && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                              Answered on {new Date(question.answeredAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setExpandedQuestion(expandedQuestion === question.id ? null : question.id)}
                    className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
                  >
                    {expandedQuestion === question.id ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        {question.answer ? 'View answer' : 'View details'}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expert Profile Modal */}
      {showExpertModal && selectedExpert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Expert Profile</h2>
              <button
                onClick={() => setShowExpertModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Expert Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg flex-shrink-0">
                  {selectedExpert.fullName.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {selectedExpert.fullName}
                      </h3>
                      {selectedExpert.title && (
                        <p className="text-lg text-indigo-600 dark:text-indigo-400 font-medium mb-2">
                          {selectedExpert.title}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold">{selectedExpert.averageRating?.toFixed(1) || 'N/A'}</span>
                          <span className="text-gray-500">({(selectedExpert as { totalReviews?: number }).totalReviews || 0} reviews)</span>
                        </div>
                        {selectedExpert.isVerified && (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            <Shield className="w-4 h-4" />
                            Verified Expert
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAskModal(true);
                    setShowExpertModal(false);
                  }}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Ask Question
                </button>
                <button
                  onClick={() => {
                    setExpertModalTab('sessions');
                  }}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <Calendar className="w-5 h-5" />
                  View Sessions
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-6">
              <div className="flex gap-6">
                {(['about', 'sessions', 'reviews'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setExpertModalTab(tab)}
                    className={`py-4 font-medium border-b-2 transition-colors capitalize ${
                      expertModalTab === tab
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {expertModalTab === 'about' && (
                <div className="space-y-6">
                  {selectedExpert.bio && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">About</h4>
                      <p className="text-gray-600 dark:text-gray-400">{selectedExpert.bio}</p>
                    </div>
                  )}

                  {selectedExpert.specializations && selectedExpert.specializations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Specializations</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedExpert.specializations.map((spec) => (
                          <span key={spec} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium">
                            {spec}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedExpert.yearsOfExperience && (
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Experience</h4>
                      <p className="text-gray-600 dark:text-gray-400">{selectedExpert.yearsOfExperience} years</p>
                    </div>
                  )}
                </div>
              )}

              {expertModalTab === 'sessions' && (
                <div className="space-y-4">
                  {expertSessions.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No upcoming sessions scheduled
                    </p>
                  ) : (
                    expertSessions.map((session) => (
                      <div key={session.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                          {session.title}
                        </h5>
                        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDateTime(session.scheduledStartTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {session.currentParticipants} / {session.maxParticipants}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {expertModalTab === 'reviews' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Reviews</h4>
                    <button
                      onClick={() => {
                        setShowReviewModal(true);
                        setShowExpertModal(false);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
                    >
                      <Star className="w-4 h-4" />
                      Write Review
                    </button>
                  </div>
                  {expertReviews.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                      No reviews yet
                    </p>
                  ) : (
                    expertReviews.map((review) => (
                      <div key={review.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? 'text-yellow-500 fill-yellow-500'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{review.review}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ask Question Modal */}
      {showAskModal && selectedExpert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl animate-slide-up">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Ask {selectedExpert.fullName}
              </h2>
              <button
                onClick={() => setShowAskModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Question Title *
                </label>
                <input
                  type="text"
                  value={questionForm.title || ''}
                  onChange={(e) => setQuestionForm({ ...questionForm, title: e.target.value })}
                  className="input"
                  placeholder="Brief summary of your question"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Question Details *
                </label>
                <textarea
                  value={questionForm.content || ''}
                  onChange={(e) => setQuestionForm({ ...questionForm, content: e.target.value })}
                  className="input min-h-[150px]"
                  placeholder="Provide detailed information about your question"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questionForm.isPublic}
                    onChange={(e) => setQuestionForm({ ...questionForm, isPublic: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Make this question public (visible to others)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questionForm.isUrgent}
                    onChange={(e) => setQuestionForm({ ...questionForm, isUrgent: e.target.checked })}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Mark as urgent
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAskModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAskQuestion}
                  disabled={!questionForm.title?.trim() || !questionForm.content?.trim()}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Submit Question
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      {showReviewModal && selectedExpert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl animate-slide-up">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Write Review for {selectedExpert.fullName}
              </h2>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setShowExpertModal(true);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Rating *
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          star <= reviewForm.rating
                            ? 'text-yellow-500 fill-yellow-500'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white">
                    {reviewForm.rating} / 5
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Review *
                </label>
                <textarea
                  value={reviewForm.review}
                  onChange={(e) => setReviewForm({ ...reviewForm, review: e.target.value })}
                  className="input min-h-[150px]"
                  placeholder="Share your experience with this expert..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setShowExpertModal(true);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={!reviewForm.review.trim()}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Submit Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpertsBrowse;