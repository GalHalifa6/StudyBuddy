import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { courseService } from '../api';
import { Course } from '../types';
import {
  expertService,
  ExpertProfile,
  DashboardStats,
  ExpertSession,
  ExpertQuestion,
  ExpertReview,
  ExpertProfileRequest,
  CreateSessionRequest,
  sessionRequestService,
  SessionRequest,
  ApproveSessionRequestPayload,
  RejectSessionRequestPayload,
  CounterProposeSessionRequestPayload,
  TimeSlot,
} from '../api/experts';
import { userSearchService, UserSearchResult } from '../api/sessions';
import {
  User,
  Star,
  Calendar,
  MessageCircle,
  Award,
  Clock,
  Users,
  CheckCircle,
  Plus,
  Edit,
  X,
  Send,
  TrendingUp,
  BookOpen,
  Video,
  HelpCircle,
  Search,
  Repeat,
} from 'lucide-react';

const ExpertDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sessions, setSessions] = useState<ExpertSession[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<ExpertSession[]>([]);
  const [questions, setQuestions] = useState<ExpertQuestion[]>([]);
  const [reviews, setReviews] = useState<ExpertReview[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessionRequests, setSessionRequests] = useState<SessionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Session request approval modal
  const [selectedRequest, setSelectedRequest] = useState<SessionRequest | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject' | 'counter' | null>(null);
  const [approvalForm, setApprovalForm] = useState<{
    chosenStart?: string;
    chosenEnd?: string;
    message?: string;
    reason?: string;
    proposedTimeSlots?: TimeSlot[];
  }>({});
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'questions' | 'reviews' | 'profile' | 'session-requests'>('overview');
  
  // Modal states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<ExpertQuestion | null>(null);
  const [answerText, setAnswerText] = useState('');

  // Form states
  const [profileForm, setProfileForm] = useState<ExpertProfileRequest>({
    title: '',
    institution: '',
    bio: '',
    qualifications: '',
    yearsOfExperience: 0,
    specializations: [],
    skills: [],
    offersGroupConsultations: true,
    offersOneOnOne: true,
    offersAsyncQA: true,
    maxSessionsPerWeek: 10,
    sessionDurationMinutes: 60,
  });
  const [specializationInput, setSpecializationInput] = useState('');
  const [skillInput, setSkillInput] = useState('');

  const [sessionForm, setSessionForm] = useState<CreateSessionRequest>({
    title: '',
    description: '',
    sessionType: 'OFFICE_HOURS',
    scheduledStartTime: '',
    scheduledEndTime: '',
    maxParticipants: 10,
    meetingLink: '',
    meetingPlatform: 'Zoom',
    isRecurring: false,
    recurrencePattern: '',
    courseId: undefined,
    studentId: undefined,
  });

  // Student search for one-on-one sessions
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<UserSearchResult | null>(null);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);

  useEffect(() => {
    loadData();
    loadCourses();
    loadSessionRequests();
    
    // Auto-refresh data every 30 seconds to catch new reviews/questions
    const refreshInterval = setInterval(() => {
      loadData();
      if (activeTab === 'session-requests') {
        loadSessionRequests();
      }
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [activeTab]);
  
  useEffect(() => {
    if (activeTab === 'session-requests') {
      loadSessionRequests();
    }
  }, [activeTab]);
  
  const loadSessionRequests = async () => {
    try {
      const data = await sessionRequestService.getExpertRequests('PENDING');
      setSessionRequests(data);
    } catch (error) {
      console.error('Failed to load session requests:', error);
    }
  };

  const loadCourses = async () => {
    try {
      const coursesData = await courseService.getAllCourses();
      setCourses(coursesData);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Try to get profile (might not exist yet)
      try {
        const profileData = await expertService.getProfile();
        setProfile(profileData);
        setProfileForm({
          title: profileData.title || '',
          institution: profileData.institution || '',
          bio: profileData.bio || '',
          qualifications: profileData.qualifications || '',
          yearsOfExperience: profileData.yearsOfExperience || 0,
          specializations: profileData.specializations || [],
          skills: profileData.skills || [],
          offersGroupConsultations: profileData.offersGroupConsultations ?? true,
          offersOneOnOne: profileData.offersOneOnOne ?? true,
          offersAsyncQA: profileData.offersAsyncQA ?? true,
          maxSessionsPerWeek: profileData.maxSessionsPerWeek || 10,
          sessionDurationMinutes: profileData.sessionDurationMinutes || 60,
        });
      } catch (err: unknown) {
        // Profile doesn't exist yet - show create profile modal
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { status?: number } };
          if (axiosError.response?.status === 404) {
            setShowProfileModal(true);
          }
        }
      }

      // Load dashboard data (includes sessions, questions, reviews)
      try {
        const dashboardData = await expertService.getDashboard();
        if (dashboardData.profile) setProfile(dashboardData.profile);
        if (dashboardData.stats) setStats(dashboardData.stats);
        if (dashboardData.upcomingSessions) setUpcomingSessions(dashboardData.upcomingSessions);
        if (dashboardData.pendingQuestions) setQuestions(dashboardData.pendingQuestions);
        if (dashboardData.recentReviews) setReviews(dashboardData.recentReviews);
        
        // Also load ALL sessions for the Sessions tab
        const allSessions = await expertService.getMySessions();
        setSessions(allSessions);
      } catch (err) {
        console.log('Dashboard not available, loading individual data');
        // Try loading individual endpoints
        try {
          const [sessionsData, questionsData, reviewsData] = await Promise.all([
            expertService.getMySessions(),
            expertService.getPendingQuestions(),
            expertService.getMyReviews(),
          ]);
          setSessions(sessionsData);
          setUpcomingSessions(sessionsData.filter(s => new Date(s.scheduledStartTime) > new Date()));
          setQuestions(questionsData);
          setReviews(reviewsData);
        } catch (e) {
          console.log('Some data not available yet');
        }
      }
    } catch (error) {
      console.error('Failed to load expert data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const savedProfile = await expertService.saveProfile(profileForm);
      setProfile(savedProfile);
      setShowProfileModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to save profile:', error);
    }
  };

  const handleCreateSession = async () => {
    // Validate required fields
    if (!sessionForm.title.trim()) {
      alert('Please enter a session title');
      return;
    }
    if (!sessionForm.scheduledStartTime) {
      alert('Please select a start time');
      return;
    }
    if (!sessionForm.scheduledEndTime) {
      alert('Please select an end time');
      return;
    }
    // Validate student selection for one-on-one
    if (sessionForm.sessionType === 'ONE_ON_ONE' && !selectedStudent) {
      alert('Please select a student for the one-on-one session');
      return;
    }

    try {
      // Convert datetime-local to ISO string
      const sessionData: CreateSessionRequest = {
        ...sessionForm,
        title: sessionForm.title.trim(),
        scheduledStartTime: new Date(sessionForm.scheduledStartTime).toISOString(),
        scheduledEndTime: new Date(sessionForm.scheduledEndTime).toISOString(),
        studentId: selectedStudent?.id,
      };
      
      console.log('Creating session with data:', sessionData);
      await expertService.createSession(sessionData);
      setShowSessionModal(false);
      setSessionForm({
        title: '',
        description: '',
        sessionType: 'OFFICE_HOURS',
        scheduledStartTime: '',
        scheduledEndTime: '',
        maxParticipants: 10,
        meetingLink: '',
        meetingPlatform: 'Zoom',
        isRecurring: false,
        recurrencePattern: '',
        courseId: undefined,
        studentId: undefined,
      });
      setSelectedStudent(null);
      setStudentSearchQuery('');
      setStudentSearchResults([]);
      loadData();
    } catch (error: unknown) {
      console.error('Failed to create session:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error
        ? error.message
        : 'Failed to create session. Please try again.';
      alert(errorMessage || 'Failed to create session. Please try again.');
    }
  };

  // Search students for one-on-one sessions
  const handleStudentSearch = async (query: string) => {
    setStudentSearchQuery(query);
    if (query.length < 2) {
      setStudentSearchResults([]);
      return;
    }
    setIsSearchingStudents(true);
    try {
      const results = await userSearchService.searchUsers(query);
      setStudentSearchResults(results);
    } catch (error) {
      console.error('Failed to search students:', error);
    } finally {
      setIsSearchingStudents(false);
    }
  };

  const handleAnswerQuestion = async () => {
    if (!selectedQuestion || !answerText.trim()) return;
    try {
      await expertService.answerQuestion(selectedQuestion.id, answerText);
      setShowAnswerModal(false);
      setSelectedQuestion(null);
      setAnswerText('');
      loadData();
    } catch (error) {
      console.error('Failed to answer question:', error);
    }
  };

  const handleUpdateSessionStatus = async (sessionId: number, action: 'start' | 'complete' | 'cancel') => {
    try {
      if (action === 'start') {
        await expertService.startSession(sessionId);
        // Navigate directly to the session room after starting
        navigate(`/session/${sessionId}`);
        return;
      } else if (action === 'complete') {
        await expertService.completeSession(sessionId);
      } else if (action === 'cancel') {
        await expertService.cancelSession(sessionId, 'Cancelled by expert');
      }
      loadData();
    } catch (error) {
      console.error('Failed to update session status:', error);
    }
  };

  const addSpecialization = () => {
    const specs = profileForm.specializations || [];
    if (specializationInput.trim() && !specs.includes(specializationInput.trim())) {
      setProfileForm({
        ...profileForm,
        specializations: [...specs, specializationInput.trim()],
      });
      setSpecializationInput('');
    }
  };

  const removeSpecialization = (spec: string) => {
    setProfileForm({
      ...profileForm,
      specializations: (profileForm.specializations || []).filter(s => s !== spec),
    });
  };

  const addSkill = () => {
    const skills = profileForm.skills || [];
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setProfileForm({
        ...profileForm,
        skills: [...skills, skillInput.trim()],
      });
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setProfileForm({
      ...profileForm,
      skills: (profileForm.skills || []).filter(s => s !== skill),
    });
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
      case 'QA_SESSION': return <HelpCircle className="w-4 h-4" />;
      case 'GROUP_CONSULTATION': return <Users className="w-4 h-4" />;
      case 'ONE_ON_ONE': return <User className="w-4 h-4" />;
      case 'WORKSHOP': return <BookOpen className="w-4 h-4" />;
      default: return <Video className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-700';
      case 'IN_PROGRESS': return 'bg-green-100 text-green-700';
      case 'COMPLETED': return 'bg-gray-100 text-gray-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'LOW': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expert Dashboard</h1>
          <p className="text-gray-500 mt-1">Manage your expert profile, sessions, and student questions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSessionModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Session
          </button>
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Edit className="w-5 h-5" />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Profile Summary Card */}
      {profile && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
                <User className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user?.fullName || user?.username}</h2>
                <p className="text-purple-100">{profile.title || 'Expert'}</p>
                {profile.institution && <p className="text-purple-200 text-sm">{profile.institution}</p>}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                    <span>{profile.averageRating?.toFixed(1) || '0.0'}</span>
                    <span className="text-purple-200">({profile.totalRatings || 0} reviews)</span>
                  </div>
                  {profile.isVerified && (
                    <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-sm">
                      <CheckCircle className="w-3 h-3" />
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-200">Availability</p>
              <span className={`px-3 py-1 rounded-full text-sm ${
                profile.acceptingNewStudents ? 'bg-green-400/20 text-green-100' : 'bg-red-400/20 text-red-100'
              }`}>
                {profile.acceptingNewStudents ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {profile.specializations?.map((spec, i) => (
              <span key={i} className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Upcoming Sessions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.upcomingSessions}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Questions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingQuestions}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Average Rating</p>
                <div className="flex items-center gap-1">
                  <p className="text-2xl font-bold text-gray-900">{stats.averageRating?.toFixed(1) || '0.0'}</p>
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Students Helped</p>
                <p className="text-2xl font-bold text-gray-900">{stats.studentsHelped}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'sessions', label: 'Sessions' },
            { id: 'session-requests', label: 'Session Requests' },
            { id: 'questions', label: 'Questions' },
            { id: 'reviews', label: 'Reviews' },
          ].map((tab) => (
            <button
              key={tab.id}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-4 px-1 border-b-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Sessions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Upcoming Sessions</h3>
              <button
                onClick={() => setActiveTab('sessions')}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                View all
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {upcomingSessions.filter(s => s.status === 'Scheduled').slice(0, 3).map((session) => (
                <div key={session.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {getSessionTypeIcon(session.sessionType)}
                        <span className="font-medium text-gray-900">{session.title}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{formatDateTime(session.scheduledStartTime)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                  </div>
                </div>
              ))}
              {upcomingSessions.filter(s => s.status === 'Scheduled').length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No upcoming sessions</p>
                </div>
              )}
            </div>
          </div>

          {/* Pending Questions */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Pending Questions</h3>
              <button
                onClick={() => setActiveTab('questions')}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                View all
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {questions.filter(q => q.status !== 'Answered' && q.status !== 'Resolved' && q.status !== 'Closed').slice(0, 3).map((question) => (
                <div key={question.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{question.title}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        From {question.student?.fullName || 'Anonymous'}
                      </p>
                    </div>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${getPriorityColor(question.priority)}`}>
                      {question.priority}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedQuestion(question);
                      setShowAnswerModal(true);
                    }}
                    className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                  >
                    Answer →
                  </button>
                </div>
              ))}
              {questions.filter(q => q.status !== 'Answered' && q.status !== 'Resolved' && q.status !== 'Closed').length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No pending questions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">All Sessions</h3>
            <button
              onClick={() => setShowSessionModal(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
            >
              <Plus className="w-4 h-4" />
              Create Session
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {sessions.map((session) => (
              <div key={session.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {getSessionTypeIcon(session.sessionType)}
                      <span className="font-medium text-gray-900">{session.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{session.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDateTime(session.scheduledStartTime)} - {formatDateTime(session.scheduledEndTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {session.currentParticipants}/{session.maxParticipants} participants
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {session.status === 'Scheduled' && (
                      <>
                        <button
                          onClick={() => handleUpdateSessionStatus(session.id, 'start')}
                          className="px-3 py-1.5 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200"
                        >
                          Start
                        </button>
                        <button
                          onClick={() => handleUpdateSessionStatus(session.id, 'cancel')}
                          className="px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {session.status === 'In Progress' && (
                      <>
                        <button
                          onClick={() => navigate(`/session/${session.id}`)}
                          className="px-3 py-1.5 bg-green-100 text-green-700 text-sm rounded-lg hover:bg-green-200 flex items-center gap-1"
                        >
                          <Video className="w-4 h-4" />
                          Join Room
                        </button>
                        <button
                          onClick={() => handleUpdateSessionStatus(session.id, 'complete')}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200"
                        >
                          Complete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {sessions.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No sessions yet</p>
                <p className="text-sm mt-1">Create your first session to start helping students</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Student Questions</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {questions.map((question) => (
              <div key={question.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{question.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        (question.status === 'Open' || question.status === 'Assigned to Expert') ? 'bg-yellow-100 text-yellow-700' :
                        (question.status === 'Answered' || question.status === 'Resolved') ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {question.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(question.priority)}`}>
                        {question.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{question.content}</p>
                    {question.answer && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-xs text-green-600 font-medium mb-1">Your Answer:</p>
                        <p className="text-sm text-gray-700">{question.answer}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>From: {question.student?.fullName || 'Anonymous'}</span>
                      <span>{new Date(question.createdAt).toLocaleDateString()}</span>
                      {question.course && <span>Course: {question.course.name}</span>}
                    </div>
                  </div>
                  {(question.status !== 'Answered' && question.status !== 'Resolved' && question.status !== 'Closed') && (
                    <button
                      onClick={() => {
                        setSelectedQuestion(question);
                        setShowAnswerModal(true);
                      }}
                      className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                    >
                      Answer
                    </button>
                  )}
                </div>
              </div>
            ))}
            {questions.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No questions yet</p>
                <p className="text-sm mt-1">Questions from students will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'session-requests' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Pending Session Requests</h3>
            <p className="text-sm text-gray-500 mt-1">Review and respond to student session requests</p>
          </div>
          <div className="divide-y divide-gray-100">
            {sessionRequests.length > 0 ? (
              sessionRequests.map((request) => (
                <div key={request.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{request.title}</h4>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          PENDING
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Student:</span> {request.student?.fullName || request.student?.username || 'Unknown'}
                        {request.course && (
                          <> • <span className="font-medium">Course:</span> {request.course.code} - {request.course.name}</>
                        )}
                      </div>
                      {request.description && (
                        <p className="text-sm text-gray-700 mb-2">{request.description}</p>
                      )}
                      {request.agenda && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-600 mb-1">Agenda:</p>
                          <p className="text-xs text-gray-700">{request.agenda}</p>
                        </div>
                      )}
                      {request.preferredTimeSlots && request.preferredTimeSlots.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-600 mb-1">Preferred Times:</p>
                          <div className="space-y-1">
                            {request.preferredTimeSlots.map((slot, idx) => (
                              <div key={idx} className="text-xs text-gray-700 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(slot.start).toLocaleString()} - {new Date(slot.end).toLocaleString()}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        Requested {new Date(request.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setApprovalAction('approve');
                          setApprovalForm({
                            chosenStart: request.preferredTimeSlots?.[0]?.start || '',
                            chosenEnd: request.preferredTimeSlots?.[0]?.end || '',
                            message: '',
                          });
                          setShowApprovalModal(true);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setApprovalAction('reject');
                          setApprovalForm({ reason: '' });
                          setShowApprovalModal(true);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setApprovalAction('counter');
                          setApprovalForm({ proposedTimeSlots: [], message: '' });
                          setShowApprovalModal(true);
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Counter
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No pending requests</p>
                <p className="text-sm mt-1">Session requests from students will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Student Reviews</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {reviews.map((review) => (
              <div key={review.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-medium">
                      {(review.student?.fullName || 'Anonymous').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-gray-900">
                          {review.isAnonymous ? 'Anonymous' : (review.student?.fullName || 'Student')}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{review.review}</p>
                    {review.highlights && (
                      <p className="text-xs text-green-600 mt-1">Highlights: {review.highlights}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {reviews.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No reviews yet</p>
                <p className="text-sm mt-1">Reviews from students will appear here</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {profile ? 'Edit Expert Profile' : 'Create Expert Profile'}
              </h2>
              <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={profileForm.title}
                    onChange={(e) => setProfileForm({ ...profileForm, title: e.target.value })}
                    placeholder="e.g., Senior Software Engineer"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Institution</label>
                  <input
                    type="text"
                    value={profileForm.institution}
                    onChange={(e) => setProfileForm({ ...profileForm, institution: e.target.value })}
                    placeholder="e.g., MIT, Google, etc."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="Tell students about your expertise and teaching style..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qualifications</label>
                <input
                  type="text"
                  value={profileForm.qualifications || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, qualifications: e.target.value })}
                  placeholder="e.g., Ph.D. Computer Science, AWS Certified"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specializations</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={specializationInput}
                    onChange={(e) => setSpecializationInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
                    placeholder="Add a specialization"
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={addSpecialization}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(profileForm.specializations || []).map((spec, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm"
                    >
                      {spec}
                      <button onClick={() => removeSpecialization(spec)} className="hover:text-purple-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Skills</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    placeholder="Add a skill (e.g., Python, React)"
                    className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={addSkill}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(profileForm.skills || []).map((skill, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                    >
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Years of Experience</label>
                  <input
                    type="number"
                    value={profileForm.yearsOfExperience || 0}
                    onChange={(e) => setProfileForm({ ...profileForm, yearsOfExperience: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Sessions/Week</label>
                  <input
                    type="number"
                    value={profileForm.maxSessionsPerWeek || 10}
                    onChange={(e) => setProfileForm({ ...profileForm, maxSessionsPerWeek: parseInt(e.target.value) || 10 })}
                    min="1"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Services Offered</label>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="offersOneOnOne"
                    checked={profileForm.offersOneOnOne ?? true}
                    onChange={(e) => setProfileForm({ ...profileForm, offersOneOnOne: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="offersOneOnOne" className="text-sm text-gray-700">
                    One-on-One Sessions
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="offersGroupConsultations"
                    checked={profileForm.offersGroupConsultations ?? true}
                    onChange={(e) => setProfileForm({ ...profileForm, offersGroupConsultations: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="offersGroupConsultations" className="text-sm text-gray-700">
                    Group Consultations
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="offersAsyncQA"
                    checked={profileForm.offersAsyncQA ?? true}
                    onChange={(e) => setProfileForm({ ...profileForm, offersAsyncQA: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="offersAsyncQA" className="text-sm text-gray-700">
                    Async Q&A (Answer student questions)
                  </label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Create New Session</h2>
              <button onClick={() => setShowSessionModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={sessionForm.title}
                  onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                  placeholder="e.g., Python Office Hours"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={sessionForm.description}
                  onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                  placeholder="Describe what you'll cover in this session..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Type</label>
                <select
                  value={sessionForm.sessionType}
                  onChange={(e) => {
                    const newType = e.target.value as CreateSessionRequest['sessionType'];
                    const updates: Partial<CreateSessionRequest> = { sessionType: newType };
                    
                    // Auto-set maxParticipants to 1 for ONE_ON_ONE sessions
                    if (newType === 'ONE_ON_ONE') {
                      updates.maxParticipants = 1;
                    } else {
                      // Reset to default if switching away from ONE_ON_ONE
                      updates.maxParticipants = 10;
                      // Clear student selection
                      setSelectedStudent(null);
                      setStudentSearchQuery('');
                      setStudentSearchResults([]);
                    }
                    
                    setSessionForm({ ...sessionForm, ...updates });
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="OFFICE_HOURS">Office Hours (Drop-in)</option>
                  <option value="ONE_ON_ONE">One-on-One (Private)</option>
                  <option value="GROUP">Group Session</option>
                  <option value="WORKSHOP">Workshop</option>
                  <option value="Q_AND_A">Q&A Session</option>
                </select>
              </div>

              {/* Student Selection for One-on-One */}
              {sessionForm.sessionType === 'ONE_ON_ONE' && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                  <label className="block text-sm font-medium text-purple-800 mb-2">
                    <User className="w-4 h-4 inline mr-1" />
                    Select Student (Required for One-on-One)
                  </label>
                  
                  {selectedStudent ? (
                    <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-purple-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                          {selectedStudent.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{selectedStudent.fullName}</p>
                          <p className="text-sm text-gray-500">{selectedStudent.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedStudent(null);
                          setStudentSearchQuery('');
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={studentSearchQuery}
                          onChange={(e) => handleStudentSearch(e.target.value)}
                          placeholder="Search by name or email..."
                          className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        {isSearchingStudents && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-500"></div>
                          </div>
                        )}
                      </div>
                      
                      {/* Search Results */}
                      {studentSearchResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto">
                          {studentSearchResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                setSelectedStudent(user);
                                setStudentSearchResults([]);
                                setStudentSearchQuery('');
                              }}
                              className="w-full flex items-center gap-3 p-3 hover:bg-purple-50 transition-colors text-left"
                            >
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                {user.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{user.fullName}</p>
                                <p className="text-xs text-gray-500">{user.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-purple-600 mt-2">
                    The selected student will be automatically enrolled and notified.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Related Course (optional)
                  <span className="text-xs text-gray-500 ml-2">Session will appear on course page</span>
                </label>
                <select
                  value={sessionForm.courseId || ''}
                  onChange={(e) => setSessionForm({ ...sessionForm, courseId: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">None - General Session</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <input
                    type="datetime-local"
                    value={sessionForm.scheduledStartTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, scheduledStartTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <input
                    type="datetime-local"
                    value={sessionForm.scheduledEndTime}
                    onChange={(e) => setSessionForm({ ...sessionForm, scheduledEndTime: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Participants</label>
                  <input
                    type="number"
                    value={sessionForm.maxParticipants || 10}
                    onChange={(e) => setSessionForm({ ...sessionForm, maxParticipants: parseInt(e.target.value) || 10 })}
                    min="1"
                    disabled={sessionForm.sessionType === 'ONE_ON_ONE'}
                    className={`w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      sessionForm.sessionType === 'ONE_ON_ONE' ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  />
                  {sessionForm.sessionType === 'ONE_ON_ONE' && (
                    <p className="text-xs text-gray-500 mt-1">Fixed to 1 for one-on-one sessions</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <select
                    value={sessionForm.meetingPlatform || 'Zoom'}
                    onChange={(e) => setSessionForm({ ...sessionForm, meetingPlatform: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Zoom">Zoom</option>
                    <option value="Google Meet">Google Meet</option>
                    <option value="Microsoft Teams">Microsoft Teams</option>
                    <option value="Discord">Discord</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Link (optional)</label>
                <input
                  type="url"
                  value={sessionForm.meetingLink || ''}
                  onChange={(e) => setSessionForm({ ...sessionForm, meetingLink: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              {/* Recurring Session Options */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={sessionForm.isRecurring || false}
                    onChange={(e) => setSessionForm({ ...sessionForm, isRecurring: e.target.checked })}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Repeat className="w-4 h-4" />
                    Make this a recurring session
                  </label>
                </div>
                
                {sessionForm.isRecurring && (
                  <div className="ml-8 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Recurrence Pattern</label>
                      <select
                        value={sessionForm.recurrencePattern || ''}
                        onChange={(e) => setSessionForm({ ...sessionForm, recurrencePattern: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select pattern</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <p className="text-xs text-gray-500">
                      The session will automatically repeat based on the selected pattern.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowSessionModal(false)}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
              >
                Create Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Answer Question Modal */}
      {showAnswerModal && selectedQuestion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Answer Question</h2>
              <button onClick={() => setShowAnswerModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-medium text-gray-900">{selectedQuestion.title}</h3>
                <p className="text-sm text-gray-600 mt-2">{selectedQuestion.content}</p>
                <p className="text-xs text-gray-400 mt-2">
                  Asked by {selectedQuestion.student?.fullName || 'Anonymous'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Answer</label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="Write your answer here..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowAnswerModal(false)}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAnswerQuestion}
                disabled={!answerText.trim()}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Submit Answer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Request Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {approvalAction === 'approve' && 'Approve Session Request'}
                {approvalAction === 'reject' && 'Reject Session Request'}
                {approvalAction === 'counter' && 'Counter-Propose Session Time'}
              </h2>
              <button onClick={() => setShowApprovalModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {approvalAction === 'approve' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session Start Time *</label>
                    <input
                      type="datetime-local"
                      value={approvalForm.chosenStart ? new Date(approvalForm.chosenStart).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setApprovalForm({ ...approvalForm, chosenStart: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Session End Time *</label>
                    <input
                      type="datetime-local"
                      value={approvalForm.chosenEnd ? new Date(approvalForm.chosenEnd).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setApprovalForm({ ...approvalForm, chosenEnd: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message (optional)</label>
                    <textarea
                      value={approvalForm.message || ''}
                      onChange={(e) => setApprovalForm({ ...approvalForm, message: e.target.value })}
                      placeholder="Add a message to the student..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </>
              )}
              {approvalAction === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason *</label>
                  <textarea
                    value={approvalForm.reason || ''}
                    onChange={(e) => setApprovalForm({ ...approvalForm, reason: e.target.value })}
                    placeholder="Please provide a reason for rejection..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
              {approvalAction === 'counter' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Proposed Time Slots *</label>
                    <div className="space-y-2">
                      {(approvalForm.proposedTimeSlots || []).map((slot, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <input
                            type="datetime-local"
                            value={slot.start ? new Date(slot.start).toISOString().slice(0, 16) : ''}
                            onChange={(e) => {
                              const newSlots = [...(approvalForm.proposedTimeSlots || [])];
                              newSlots[index] = { ...slot, start: e.target.value ? new Date(e.target.value).toISOString() : '' };
                              setApprovalForm({ ...approvalForm, proposedTimeSlots: newSlots });
                            }}
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="datetime-local"
                            value={slot.end ? new Date(slot.end).toISOString().slice(0, 16) : ''}
                            onChange={(e) => {
                              const newSlots = [...(approvalForm.proposedTimeSlots || [])];
                              newSlots[index] = { ...slot, end: e.target.value ? new Date(e.target.value).toISOString() : '' };
                              setApprovalForm({ ...approvalForm, proposedTimeSlots: newSlots });
                            }}
                            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <button
                            onClick={() => {
                              const newSlots = (approvalForm.proposedTimeSlots || []).filter((_, i) => i !== index);
                              setApprovalForm({ ...approvalForm, proposedTimeSlots: newSlots });
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          setApprovalForm({
                            ...approvalForm,
                            proposedTimeSlots: [...(approvalForm.proposedTimeSlots || []), { start: '', end: '' }],
                          });
                        }}
                        className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                      >
                        <Plus className="w-4 h-4" />
                        Add Time Slot
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message (optional)</label>
                    <textarea
                      value={approvalForm.message || ''}
                      onChange={(e) => setApprovalForm({ ...approvalForm, message: e.target.value })}
                      placeholder="Add a message to the student..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    if (approvalAction === 'approve') {
                      if (!approvalForm.chosenStart || !approvalForm.chosenEnd) {
                        alert('Please select start and end times');
                        return;
                      }
                      await sessionRequestService.approveRequest(selectedRequest.id, {
                        chosenStart: approvalForm.chosenStart,
                        chosenEnd: approvalForm.chosenEnd,
                        message: approvalForm.message,
                      } as ApproveSessionRequestPayload);
                      alert('Session request approved! A session has been created.');
                    } else if (approvalAction === 'reject') {
                      if (!approvalForm.reason?.trim()) {
                        alert('Please provide a rejection reason');
                        return;
                      }
                      await sessionRequestService.rejectRequest(selectedRequest.id, {
                        reason: approvalForm.reason,
                      } as RejectSessionRequestPayload);
                      alert('Session request rejected.');
                    } else if (approvalAction === 'counter') {
                      if (!approvalForm.proposedTimeSlots?.length) {
                        alert('Please add at least one proposed time slot');
                        return;
                      }
                      await sessionRequestService.counterProposeRequest(selectedRequest.id, {
                        proposedTimeSlots: approvalForm.proposedTimeSlots,
                        message: approvalForm.message,
                      } as CounterProposeSessionRequestPayload);
                      alert('Counter-proposal sent to student.');
                    }
                    setShowApprovalModal(false);
                    setSelectedRequest(null);
                    setApprovalAction(null);
                    setApprovalForm({});
                    await loadSessionRequests();
                  } catch (error: unknown) {
                    console.error('Failed to process request:', error);
                    const errorMessage = error && typeof error === 'object' && 'response' in error
                      ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
                      : error instanceof Error
                      ? error.message
                      : 'Failed to process request. Please try again.';
                    alert(errorMessage || 'Failed to process request. Please try again.');
                  }
                }}
                className={`px-6 py-2 text-white rounded-xl transition-colors ${
                  approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  approvalAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {approvalAction === 'approve' && 'Approve'}
                {approvalAction === 'reject' && 'Reject'}
                {approvalAction === 'counter' && 'Send Counter-Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpertDashboard;
