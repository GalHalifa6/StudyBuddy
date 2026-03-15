import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { courseService, groupService } from '../api';
import { ExpertSession } from '../api/experts';
import { Course, StudyGroup } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, 
  Users, 
  ArrowLeft,
  Building,
  Plus,
  Clock,
  Video,
  UserCheck,
  Loader2,
  ChevronRight,
  Sparkles,
  X,
  MinusCircle,
  Lock
} from 'lucide-react';

interface CourseSession extends ExpertSession {
  // Sessions related to this course
}

const CourseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isUser } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    topic: '',
    maxSize: 10,
    visibility: 'open',
  });
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessMessage, setAccessMessage] = useState('');

  const loadCourseData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setAccessDenied(false);
    setAccessMessage('');
    try {
      const courseId = parseInt(id, 10);
      const courseData = await courseService.getCourseById(courseId);
      const [groupsData, myCoursesData] = await Promise.all([
        groupService.getGroupsByCourse(courseId),
        courseService.getMyCourses(),
      ]);

      setCourse(courseData);
      setGroups(groupsData);

      const enrolled = myCoursesData.some((item) => item.id === courseId);
      setIsEnrolled(courseData?.enrolled ?? enrolled);

      try {
        const response = await fetch(`/api/sessions/course/${id}/active`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (response.ok) {
          const sessionsData = await response.json();
          setSessions(sessionsData);
        }
      } catch (sessionError) {
        console.log('Sessions not available');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        setAccessDenied(true);
        setAccessMessage(error?.response?.data?.message || 'Enroll in this course to unlock its materials.');
      } else if (status === 404) {
        setCourse(null);
      } else {
        console.error('Error loading course:', error);
      }
      setCourse(null);
      setGroups([]);
      setSessions([]);
      setIsEnrolled(false);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadCourseData();
    }
  }, [id, loadCourseData]);

  const handleEnroll = async () => {
    if (!id) return;
    setEnrolling(true);
    try {
      await courseService.enrollInCourse(parseInt(id, 10));
      setIsEnrolled(true);
      setAccessDenied(false);
      loadCourseData();
    } catch (error) {
      console.error('Error enrolling:', error);
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    if (!id) return;
    setUnenrolling(true);
    try {
      await courseService.unenrollFromCourse(parseInt(id, 10));
      setIsEnrolled(false);
      loadCourseData();
    } catch (error) {
      console.error('Error unenrolling:', error);
    } finally {
      setUnenrolling(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setIsCreatingGroup(true);
    try {
      await groupService.createGroup({
        ...newGroup,
        course: { id: parseInt(id, 10) },
      });
      setShowCreateGroupModal(false);
      setNewGroup({ name: '', description: '', topic: '', maxSize: 10, visibility: 'open' });
      loadCourseData();
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleJoinSession = async (sessionId: number) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        loadCourseData();
      }
    } catch (error) {
      console.error('Error joining session:', error);
    }
  };

  const isSessionActive = (session: CourseSession) => {
    const now = new Date();
    const start = new Date(session.scheduledStartTime);
    const end = new Date(session.scheduledEndTime);
    return now >= start && now <= end;
  };

  const formatSessionTime = (session: CourseSession) => {
    const start = new Date(session.scheduledStartTime);
    const end = new Date(session.scheduledEndTime);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading course...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="card p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Enroll to access this course</h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">{accessMessage || 'Join the course to explore study groups, sessions, and exclusive resources.'}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {isUser && (
            <button
              onClick={handleEnroll}
              disabled={enrolling}
              className="btn-primary inline-flex items-center gap-2"
            >
              {enrolling ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <UserCheck className="w-5 h-5" />
                  Enroll Now
                </>
              )}
            </button>
          )}
          <Link to="/courses" className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="card p-12 text-center">
        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Course not found</h3>
        <Link to="/courses" className="btn-primary inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <button 
        onClick={() => navigate('/courses')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back to Courses</span>
      </button>

      {/* Course Header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {course.code.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="badge-primary">{course.code}</span>
                {course.semester && <span className="badge-secondary">{course.semester}</span>}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{course.name}</h1>
              {course.description && (
                <p className="text-gray-600 dark:text-gray-400 mt-2">{course.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
                {course.faculty && (
                  <div className="flex items-center gap-1">
                    <Building className="w-4 h-4" />
                    <span>{course.faculty}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{groups.length} study groups</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {isEnrolled ? (
              <button
                onClick={handleUnenroll}
                disabled={unenrolling}
                className="btn-secondary flex items-center gap-2"
              >
                {unenrolling ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <MinusCircle className="w-5 h-5" />
                    Leave Course
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="btn-primary flex items-center gap-2"
              >
                {enrolling ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <UserCheck className="w-5 h-5" />
                    Enroll
                  </>
                )}
              </button>
            )}
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="btn-secondary flex items-center gap-2"
              disabled={!isEnrolled}
            >
              <Plus className="w-5 h-5" />
              Create Group
            </button>
          </div>
        </div>
      </div>

      {/* Active Sessions (Highlighted) */}
      {sessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Live & Upcoming Sessions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.map(session => (
              <div 
                key={session.id}
                className={`card p-4 border-2 ${
                  isSessionActive(session) 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isSessionActive(session) ? (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse">
                        <span className="w-2 h-2 bg-white rounded-full"></span>
                        LIVE NOW
                      </span>
                    ) : (
                      <span className="badge-primary">Upcoming</span>
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">{session.sessionType}</span>
                  </div>
                  <Video className="w-5 h-5 text-primary-500" />
                </div>
                
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{session.title}</h3>
                {session.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{session.description}</p>
                )}
                
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <Clock className="w-4 h-4" />
                  <span>{formatSessionTime(session)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {session.currentParticipants}/{session.maxParticipants} participants
                    </span>
                  </div>
                  
                  {session.currentParticipants < session.maxParticipants ? (
                    <button
                      onClick={() => handleJoinSession(session.id)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        isSessionActive(session)
                          ? 'bg-green-500 hover:bg-green-600 text-white'
                          : 'bg-primary-500 hover:bg-primary-600 text-white'
                      }`}
                    >
                      {isSessionActive(session) ? 'Join Now' : 'Register'}
                    </button>
                  ) : (
                    <span className="text-sm text-gray-500">Full</span>
                  )}
                </div>
                
                {session.expert && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {session.expert.fullName?.charAt(0) || 'E'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{session.expert.fullName}</p>
                      {session.expert.title && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{session.expert.title}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study Groups */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Study Groups</h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">{groups.length} groups</span>
        </div>

        {groups.length === 0 ? (
          <div className="card p-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No study groups yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Be the first to create a study group for this course!</p>
            <button
              onClick={() => setShowCreateGroupModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(group => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="card-hover p-4 flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-secondary-400 to-primary-500 rounded-lg flex items-center justify-center text-white font-bold">
                    {group.name.charAt(0)}
                  </div>
                  <span className={`badge ${
                    group.visibility === 'open' ? 'badge-success' :
                    group.visibility === 'approval' ? 'badge-warning' :
                    'badge-secondary'
                  }`}>
                    {group.visibility}
                  </span>
                </div>
                
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">{group.name}</h3>
                {group.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{group.description}</p>
                )}
                
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>{group.members?.length || group.memberCount || 0}/{group.maxSize}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg animate-slide-up">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Study Group</h2>
              <button
                onClick={() => setShowCreateGroupModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="input"
                  placeholder="e.g., Advanced Topics Study Group"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Topic
                </label>
                <input
                  type="text"
                  value={newGroup.topic}
                  onChange={(e) => setNewGroup({ ...newGroup, topic: e.target.value })}
                  className="input"
                  placeholder="e.g., Final Exam Prep"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="input min-h-[80px] resize-none"
                  placeholder="What will your group focus on?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Members
                  </label>
                  <input
                    type="number"
                    value={newGroup.maxSize}
                    onChange={(e) => setNewGroup({ ...newGroup, maxSize: parseInt(e.target.value) || 10 })}
                    className="input"
                    min="2"
                    max="50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Visibility
                  </label>
                  <select
                    value={newGroup.visibility}
                    onChange={(e) => setNewGroup({ ...newGroup, visibility: e.target.value })}
                    className="input"
                  >
                    <option value="open">Open (Anyone can join)</option>
                    <option value="approval">Approval Required</option>
                    <option value="private">Private (Invite only)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingGroup}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isCreatingGroup ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Create Group
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetail;
