import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { groupService, courseService } from '../api';
import { StudyGroup, Course, GroupMemberRequest } from '../types';
import { 
  Users, 
  Plus, 
  Search,
  Loader2,
  X,
  Lock,
  Unlock,
  UserPlus,
  Clock,
  Shield,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Groups: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, isAdmin, isExpert } = useAuth();
  const initialRouteCourseId = courseId ? Number.parseInt(courseId, 10) : Number.NaN;
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [myPendingRequests, setMyPendingRequests] = useState<GroupMemberRequest[]>([]);
  const [myInvites, setMyInvites] = useState<GroupMemberRequest[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(
    Number.isNaN(initialRouteCourseId) ? null : initialRouteCourseId
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'invites'>('all');
  const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    topic: '',
    maxSize: 10,
    visibility: 'open',
    courseId: selectedCourse || 0,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const openCreateModal = () => {
    if (courses.length === 0) {
      return;
    }

    const defaultCourseId = selectedCourse ?? courses[0].id;
    setNewGroup({
      name: '',
      description: '',
      topic: '',
      maxSize: 10,
      visibility: 'open',
      courseId: defaultCourseId,
    });
    setShowCreateModal(true);
  };

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setGroupsError(null);
    try {
      const coursesPromise = (isAdmin || isExpert)
        ? courseService.getAllCourses()
        : courseService.getMyCourses();

      const [coursesData, myGroupsData, pendingRequests, invites] = await Promise.all([
        coursesPromise,
        groupService.getMyGroups(),
        groupService.getMyRequests(),
        groupService.getMyInvites(),
      ]);

      setCourses(coursesData);
      setMyGroups(myGroupsData);
      setMyPendingRequests(pendingRequests);
      setMyInvites(invites);

      let effectiveCourseId = selectedCourse;
      if (courseId) {
        const parsedRouteId = Number.parseInt(courseId, 10);
        if (!Number.isNaN(parsedRouteId)) {
          effectiveCourseId = parsedRouteId;
        }
      }
      const availableCourseIds = new Set(coursesData.map((course) => course.id));

      if (effectiveCourseId && !availableCourseIds.has(effectiveCourseId)) {
        effectiveCourseId = coursesData.length > 0 ? coursesData[0].id : null;
      }

      if (effectiveCourseId !== selectedCourse) {
        setSelectedCourse(effectiveCourseId);
      }

      const fallbackCourseId = effectiveCourseId ?? (coursesData[0]?.id ?? null);
      const normalizedCourseId = fallbackCourseId ?? 0;

      setNewGroup((prev) =>
        prev.courseId === normalizedCourseId
          ? prev
          : {
              ...prev,
              courseId: normalizedCourseId,
            }
      );

      if (effectiveCourseId) {
        try {
          const courseGroups = await groupService.getGroupsByCourse(effectiveCourseId);
          setGroups(courseGroups);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          if (error?.response?.status === 403) {
            setGroups([]);
            setGroupsError('Enroll in this course to view its study groups.');
          } else {
            console.error('Error fetching groups:', error);
          }
        }
      } else if (coursesData.length > 0) {
        const allGroups: StudyGroup[] = [];
        for (const course of coursesData) {
          try {
            const courseGroups = await groupService.getGroupsByCourse(course.id);
            allGroups.push(...courseGroups);
          } catch (error) {
            // Skip courses we cannot access
          }
        }
        setGroups(allGroups);
      } else {
        setGroups([]);
        setGroupsError('Enroll in a course to browse study groups.');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setGroups([]);
      setGroupsError('We could not load study groups right now. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [courseId, isAdmin, isExpert, selectedCourse]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroup.courseId) return;
    
    setIsCreating(true);
    try {
      await groupService.createGroup({
        name: newGroup.name,
        description: newGroup.description,
        topic: newGroup.topic,
        maxSize: newGroup.maxSize,
        visibility: newGroup.visibility,
        course: { id: newGroup.courseId },
      });
      setShowCreateModal(false);
      await fetchData();
      setNewGroup({
        name: '',
        description: '',
        topic: '',
        maxSize: 10,
        visibility: 'open',
        courseId: selectedCourse ?? (courses[0]?.id ?? 0),
      });
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGroup = async (groupId: number, visibility: string) => {
    // Private groups can't be joined directly
    if (visibility === 'private') {
      alert('This is a private group. Only the creator can invite members.');
      return;
    }

    setJoiningGroupId(groupId);
    try {
      const result = await groupService.joinGroup(groupId);
      if (result.status === 'PENDING') {
        // Request sent, refresh pending requests
        const pendingRequests = await groupService.getMyRequests();
        setMyPendingRequests(pendingRequests);
        alert(result.message);
      } else {
        // Successfully joined
        await fetchData();
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error joining group:', error);
      alert(error?.response?.data?.message || 'Error joining group');
    } finally {
      setJoiningGroupId(null);
    }
  };

  const handleAcceptInvite = async (requestId: number) => {
    try {
      await groupService.acceptRequest(requestId);
      await fetchData();
    } catch (error) {
      console.error('Error accepting invite:', error);
    }
  };

  const handleRejectInvite = async (requestId: number) => {
    try {
      await groupService.rejectRequest(requestId);
      const invites = await groupService.getMyInvites();
      setMyInvites(invites);
    } catch (error) {
      console.error('Error rejecting invite:', error);
    }
  };

  const handleLeaveGroup = async (groupId: number) => {
    setJoiningGroupId(groupId);
    try {
      await groupService.leaveGroup(groupId);
      await fetchData();
    } catch (error) {
      console.error('Error leaving group:', error);
    } finally {
      setJoiningGroupId(null);
    }
  };

  const isUserMember = (group: StudyGroup) => {
    return group.members?.some((member) => member.id === user?.id) || 
           myGroups.some((g) => g.id === group.id);
  };

  const hasPendingRequest = (groupId: number) => {
    return myPendingRequests.some((r) => r.group.id === groupId);
  };

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return (
          <span className="badge-warning flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Private
          </span>
        );
      case 'approval':
        return (
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs flex items-center gap-1">
            <Shield className="w-3 h-3" />
            Approval
          </span>
        );
      default:
        return (
          <span className="badge-success flex items-center gap-1">
            <Unlock className="w-3 h-3" />
            Open
          </span>
        );
    }
  };

  const getJoinButton = (group: StudyGroup) => {
    if (isUserMember(group)) {
      // User is a member - show leave button (unless creator)
      const isCreator = group.creator?.id === user?.id;
      if (isCreator) {
        return (
          <span className="text-xs text-gray-500 px-3 py-2">Owner</span>
        );
      }
      return (
        <button
          onClick={() => handleLeaveGroup(group.id)}
          disabled={joiningGroupId === group.id}
          className="btn-ghost text-red-600 hover:bg-red-50"
        >
          {joiningGroupId === group.id ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Leave'
          )}
        </button>
      );
    }

    if (hasPendingRequest(group.id)) {
      // User has a pending request
      return (
        <span className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg">
          <Clock className="w-4 h-4" />
          Pending
        </span>
      );
    }

    // Check visibility
    if (group.visibility === 'private') {
      return (
        <span className="text-xs text-gray-400 px-3 py-2">Invite Only</span>
      );
    }

    const isFull = (group.members?.length || group.memberCount || 0) >= group.maxSize;

    return (
      <button
        onClick={() => handleJoinGroup(group.id, group.visibility)}
        disabled={joiningGroupId === group.id || isFull}
        className="btn-primary flex items-center gap-1"
      >
        {joiningGroupId === group.id ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            {group.visibility === 'approval' ? 'Request' : 'Join'}
          </>
        )}
      </button>
    );
  };

  const filteredGroups = (activeTab === 'my' ? myGroups : activeTab === 'invites' ? [] : groups).filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.topic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Study Groups</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Find and join study groups or create your own</p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={courses.length === 0}
          title={courses.length === 0 ? 'Enroll in a course to create a study group.' : undefined}
        >
          <Plus className="w-5 h-5" />
          Create Group
        </button>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All Groups
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'my'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            My Groups ({myGroups.length})
          </button>
          {myInvites.length > 0 && (
            <button
              onClick={() => setActiveTab('invites')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'invites'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Invites ({myInvites.length})
            </button>
          )}
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-12"
          />
        </div>

        <select
          value={selectedCourse || ''}
          onChange={(e) => setSelectedCourse(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="input w-auto"
        >
          <option value="">All Courses</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.code} - {course.name}
            </option>
          ))}
        </select>
      </div>

      {groupsError && activeTab === 'all' && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          {groupsError}
        </div>
      )}

      {/* Groups Grid / Invites */}
      {activeTab === 'invites' ? (
        /* Invites Tab */
        <div className="space-y-4">
          {myInvites.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No pending invites</h3>
              <p className="text-gray-500 dark:text-gray-400">You don't have any group invitations.</p>
            </div>
          ) : (
            myInvites.map((invite) => (
              <div key={invite.id} className="card p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center text-white text-lg font-bold">
                    {invite.group.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 dark:text-white">{invite.group.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Invited by {invite.invitedBy?.fullName || invite.invitedBy?.username}
                    </p>
                    {invite.message && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 italic">"{invite.message}"</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInvite(invite.id)}
                      className="btn-primary flex items-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectInvite(invite.id)}
                      className="btn-ghost text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchQuery ? 'No groups found' : activeTab === 'my' ? 'No groups joined yet' : 'No groups available'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery
              ? 'Try a different search term'
              : activeTab === 'my'
              ? 'Join a study group to start collaborating!'
              : courses.length === 0
              ? 'Enroll in a course to unlock study groups tailored to you.'
              : 'Be the first to create a study group!'}
          </p>
          {courses.length > 0 && (
            <button
              onClick={openCreateModal}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <div key={group.id} className="card overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 gradient-bg rounded-xl flex items-center justify-center text-white text-xl font-bold">
                    {group.name.charAt(0)}
                  </div>
                  <div className="flex items-center gap-2">
                    {getVisibilityBadge(group.visibility)}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{group.name}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {group.description || group.topic || 'No description'}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{group.members?.length || group.memberCount || 0} / {group.maxSize} members</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/groups/${group.id}`}
                    className="btn-secondary flex-1 text-center"
                  >
                    View Details
                  </Link>
                  {getJoinButton(group)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg animate-slide-up">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Study Group</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course *
                </label>
                <select
                  value={newGroup.courseId || ''}
                  onChange={(e) => setNewGroup({
                    ...newGroup,
                    courseId: e.target.value ? parseInt(e.target.value, 10) : 0,
                  })}
                  className="input"
                  required
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="input"
                  placeholder="e.g., CS101 Study Squad"
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
                  placeholder="e.g., Midterm Prep"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="input min-h-[100px] resize-none"
                  placeholder="What will you study together?"
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
                    onChange={(e) => setNewGroup({ ...newGroup, maxSize: parseInt(e.target.value) })}
                    className="input"
                    min={2}
                    max={50}
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
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !newGroup.courseId}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {isCreating ? (
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

export default Groups;
