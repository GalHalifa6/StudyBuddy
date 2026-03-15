import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useToast } from '../context/ToastContext';
import { Course } from '../types';
import {
  Users,
  X,
  Send,
  Loader2,
  Calendar,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Star,
} from 'lucide-react';
import ExpertsTab from './expert-hub/ExpertsTab';
import SessionsTab from './expert-hub/SessionsTab';
import QuestionsTab from './expert-hub/QuestionsTab';
import ExpertProfileModal from './expert-hub/ExpertProfileModal';

type TabType = 'experts' | 'sessions' | 'questions';

const parseErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const ExpertsBrowse: React.FC = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('experts');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [joiningSessionId, setJoiningSessionId] = useState<number | null>(null);
  const [profileLoadingId, setProfileLoadingId] = useState<number | null>(null);
  const [personalQuestionsLoading, setPersonalQuestionsLoading] = useState(false);
  const [isSubmittingQuestion, setIsSubmittingQuestion] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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

  const loadInitialData = useCallback(async (options?: { silent?: boolean }) => {
    if (options?.silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [expertsData, sessionsData, mySessionsData, coursesData, publicQuestionsData] = await Promise.all([
        studentExpertService.getAllExperts(),
        sessionService.getAllSessions(),
        sessionService.getMyUpcomingSessions().catch(() => []),
        courseService.getAllCourses(),
        questionService.getPublicQuestions(),
      ]);

      setExperts(expertsData);
      setSessions(sessionsData);
      setMySessions(mySessionsData);
      setCourses(coursesData);
      setPublicQuestions(publicQuestionsData);
      setLoadError(null);

      setStats({
        totalExperts: expertsData.length,
        upcomingSessions: sessionsData.filter((s: SessionInfo) => s.status !== 'Completed' && s.status !== 'Cancelled').length,
        answeredQuestions: publicQuestionsData.filter((q: ExpertQuestion) => q.answer).length,
      });
    } catch (error) {
      console.error('Failed to load initial data:', error);
      const message = 'We could not load the expert hub right now.';
      if (options?.silent) {
        showError(message);
      } else {
        setLoadError(message);
      }
    } finally {
      if (options?.silent) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [showError]);

  const loadPersonalQuestions = async () => {
    setPersonalQuestionsLoading(true);
    try {
      const data = await questionService.getMyQuestions();
      setPersonalQuestions(data);
    } catch (error) {
      console.error('Failed to load personal questions:', error);
      showError('We could not load your questions right now.');
    } finally {
      setPersonalQuestionsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

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
    setProfileLoadingId(expertUserId);
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
      showError('We could not load this expert profile right now.');
    } finally {
      setProfileLoadingId(null);
    }
  };

  const handleAskQuestion = async () => {
    if (!selectedExpert || !questionForm.title?.trim() || !questionForm.content?.trim()) return;

    setIsSubmittingQuestion(true);
    try {
      await studentExpertService.askQuestion({
        ...questionForm as AskQuestionRequest,
        expertId: selectedExpert.userId,
      });
      setShowAskModal(false);
      setShowExpertModal(true);
      setQuestionForm({ title: '', content: '', isPublic: true, isUrgent: false });
      showSuccess('Question submitted successfully.');
      await loadInitialData({ silent: true });
    } catch (error) {
      console.error('Failed to ask question:', error);
      showError(parseErrorMessage(error, 'Failed to submit question. Please try again.'));
    } finally {
      setIsSubmittingQuestion(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedExpert || !reviewForm.review.trim() || reviewForm.rating < 1 || reviewForm.rating > 5) return;

    setIsSubmittingReview(true);
    try {
      await studentExpertService.submitReview(selectedExpert.userId, {
        rating: reviewForm.rating,
        review: reviewForm.review,
      });
      setShowReviewModal(false);
      setShowExpertModal(true);
      setReviewForm({ rating: 5, review: '' });
      showSuccess('Review submitted successfully.');
      const reviews = await studentExpertService.getExpertReviews(selectedExpert.userId);
      setExpertReviews(reviews);
    } catch (error) {
      console.error('Failed to submit review:', error);
      showError(parseErrorMessage(error, 'Failed to submit review. Please try again.'));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleJoinSession = async (sessionId: number) => {
    setJoiningSessionId(sessionId);
    try {
      await sessionService.joinSession(sessionId);
      showSuccess('You are registered for the session.');
      await loadInitialData({ silent: true });
    } catch (error: unknown) {
      showError(parseErrorMessage(error, 'Failed to join session. Please try again.'));
    } finally {
      setJoiningSessionId(null);
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
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-indigo-100 mb-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm uppercase tracking-[0.25em]">Expert Network</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold mb-3">
              Connect with Experts
            </h1>
            <p className="text-indigo-100 max-w-2xl text-lg leading-relaxed">
              Browse expert profiles, track session options, and move from discovery to live help with less friction.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:min-w-[30rem]">
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4">
              <p className="text-xs uppercase tracking-wide text-indigo-100/80">Experts</p>
              <p className="mt-2 text-2xl font-semibold">{stats.totalExperts}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4">
              <p className="text-xs uppercase tracking-wide text-indigo-100/80">Sessions</p>
              <p className="mt-2 text-2xl font-semibold">{stats.upcomingSessions}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4">
              <p className="text-xs uppercase tracking-wide text-indigo-100/80">Q&As</p>
              <p className="mt-2 text-2xl font-semibold">{stats.answeredQuestions}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4">
              <p className="text-xs uppercase tracking-wide text-indigo-100/80">My sessions</p>
              <p className="mt-2 text-2xl font-semibold">{mySessions.length}</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-32 w-96 h-96 bg-gradient-to-br from-indigo-400/40 to-purple-400/40 blur-3xl rounded-full" />
      </div>

      {/* Tab Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex rounded-2xl border border-gray-200 bg-white p-1 text-sm dark:border-gray-700 dark:bg-gray-900 shadow-sm overflow-x-auto">
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

        <button
          type="button"
          onClick={() => loadInitialData({ silent: true })}
          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loadError && (
        <div className="card p-4 border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 text-sm text-amber-800 dark:text-amber-200">
          {loadError}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'experts' && (
        <ExpertsTab
          filteredExperts={filteredExperts}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedSpecialization={selectedSpecialization}
          onSpecializationChange={setSelectedSpecialization}
          allSpecializations={allSpecializations}
          profileLoadingId={profileLoadingId}
          onViewProfile={openExpertProfile}
        />
      )}

      {activeTab === 'sessions' && (
        <SessionsTab
          filteredSessions={filteredSessions}
          sessionView={sessionView}
          onSessionViewChange={setSessionView}
          mySessionsCount={mySessions.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          selectedCourseId={selectedCourseId}
          onCourseChange={setSelectedCourseId}
          courses={courses}
          joiningSessionId={joiningSessionId}
          onJoinSession={handleJoinSession}
          onNavigate={navigate}
          formatDateTime={formatDateTime}
        />
      )}

      {activeTab === 'questions' && (
        <QuestionsTab
          filteredQuestions={filteredQuestions}
          questionView={questionView}
          onQuestionViewChange={(view) => {
            setQuestionView(view);
            if (view === 'personal' && personalQuestions.length === 0) loadPersonalQuestions();
          }}
          personalQuestionsLoading={personalQuestionsLoading}
          filterStatus={filterStatus}
          onFilterStatusChange={setFilterStatus}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          expandedQuestion={expandedQuestion}
          onToggleExpand={setExpandedQuestion}
        />
      )}

      {/* Expert Profile Modal */}
      {showExpertModal && selectedExpert && (
        <ExpertProfileModal
          expert={selectedExpert}
          reviews={expertReviews}
          sessions={expertSessions}
          activeTab={expertModalTab}
          onTabChange={setExpertModalTab}
          onClose={() => setShowExpertModal(false)}
          onAskQuestion={() => {
            setShowAskModal(true);
            setShowExpertModal(false);
          }}
          onWriteReview={() => {
            setShowReviewModal(true);
            setShowExpertModal(false);
          }}
          onNavigate={navigate}
          formatDateTime={formatDateTime}
        />
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
                onClick={() => {
                  setShowAskModal(false);
                  setShowExpertModal(true);
                }}
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
                  onClick={() => {
                    setShowAskModal(false);
                    setShowExpertModal(true);
                  }}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAskQuestion}
                  disabled={isSubmittingQuestion || !questionForm.title?.trim() || !questionForm.content?.trim()}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingQuestion ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {isSubmittingQuestion ? 'Submitting...' : 'Submit Question'}
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
                  disabled={isSubmittingReview || !reviewForm.review.trim()}
                  className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmittingReview ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
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
