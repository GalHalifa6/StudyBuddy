import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { groupService, courseService, matchingService } from '../api';
import { StudyGroup, Course, GroupMemberRequest } from '../types';
import { useToast } from '../context/ToastContext';
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
  BookOpen,
  SlidersHorizontal,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Groups: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, isAdmin, isExpert } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  const initialRouteCourseId = courseId ? Number.parseInt(courseId, 10) : Number.NaN;
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [myPendingRequests, setMyPendingRequests] = useState<GroupMemberRequest[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<number | null>(
    Number.isNaN(initialRouteCourseId) ? null : initialRouteCourseId
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'match' | 'members' | 'recent' | 'name'>('match');
  const [filterVisibility, setFilterVisibility] = useState<'all' | 'open' | 'approval' | 'private'>('all');
  const [filterAvailability, setFilterAvailability] = useState<'all' | 'available' | 'full'>('all');
  const [showFilters, setShowFilters] = useState(false);

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

      const [coursesData, myGroupsData, pendingRequests] = await Promise.all([
        coursesPromise,
        groupService.getMyGroups(),
        groupService.getMyRequests(),
      ]);

      setCourses(coursesData);
      setMyGroups(myGroupsData);
      setMyPendingRequests(pendingRequests);

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

      // Fetch matched groups with server-side filtering and matching algorithm
      if (coursesData.length > 0) {
        try {
          // Convert filter values for API
          const visibilityParam = filterVisibility === 'all' ? undefined : filterVisibility;
          const availabilityParam = filterAvailability === 'all' ? undefined : filterAvailability;
          
          const matchedGroups = await matchingService.getMatchedGroups(
            effectiveCourseId || undefined,
            visibilityParam,
            availabilityParam
          );

          // Convert GroupMatch to StudyGroup format with matchPercentage
          const groupsWithMatch = matchedGroups.map(match => ({
            id: match.groupId,
            name: match.groupName,
            description: match.description || '',
            topic: match.topic || '',
            visibility: match.visibility,
            maxSize: match.maxSize,
            memberCount: match.currentSize,
            members: [], // Will be populated if needed
            isActive: true, // Default to true for matched groups
            course: match.courseId ? {
              id: match.courseId,
              name: match.courseName || '',
              code: match.courseCode || ''
            } : undefined,
            creator: undefined, // Not in GroupMatchDto, will be populated if needed
            createdAt: match.createdAt || new Date().toISOString(),
            matchPercentage: match.matchPercentage,
            matchReason: match.matchReason,
          } as StudyGroup & { matchPercentage: number; matchReason?: string }));

          setGroups(groupsWithMatch);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          if (error?.response?.status === 403) {
            setGroups([]);
            setGroupsError('Enroll in a course to view its study groups.');
          } else {
            console.error('Error fetching matched groups:', error);
            setGroupsError('Could not load groups. Please try again.');
          }
        }
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
  }, [courseId, isAdmin, isExpert, selectedCourse, filterVisibility, filterAvailability]);

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
      showError('This is a private group. Only the creator can invite members.');
      return;
    }

    setJoiningGroupId(groupId);
    try {
      const result = await groupService.joinGroup(groupId);
      if (result.status === 'PENDING') {
        // Request sent, refresh pending requests
        const pendingRequests = await groupService.getMyRequests();
        setMyPendingRequests(pendingRequests);
        showSuccess(result.message);
      } else {
        // Successfully joined - redirect to MyGroups chat
        showSuccess('Successfully joined the group! Redirecting to chat...');
        setTimeout(() => {
          navigate(`/my-groups?group=${groupId}`);
        }, 500);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error joining group:', error);
      showError(error?.response?.data?.message || 'Error joining group');
    } finally {
      setJoiningGroupId(null);
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

  // Filter and sort groups (match percentage already calculated by backend)
  const filteredGroups = groups
    .filter((group) => {
      // Search filter
      const matchesSearch = 
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.course?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'match':
          return (b.matchPercentage || 0) - (a.matchPercentage || 0);
        case 'members':
          return (b.members?.length || b.memberCount || 0) - (a.members?.length || a.memberCount || 0);
        case 'recent':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

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
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-3xl text-white p-8 shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 bg-noise" />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-100 mb-2">
                <Users className="h-5 w-5" />
                <span className="text-sm uppercase tracking-[0.2em]">Collaborate & Learn</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold mb-3">
                Discover Study Groups
              </h1>
              <p className="text-indigo-100 max-w-2xl leading-relaxed">
                Find the perfect study group from your enrolled courses. Connect with peers, share knowledge, and achieve your academic goals together.
              </p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <TrendingUp className="h-8 w-8 text-indigo-100" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-indigo-100/80">Available</p>
                  <p className="text-lg font-semibold">Groups from your courses</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-indigo-100/90">
                <div>
                  <p className="text-2xl font-semibold leading-none">{filteredGroups.length}</p>
                  <p className="mt-1">Groups found</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold leading-none">{courses.length}</p>
                  <p className="mt-1">Your courses</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-32 w-96 h-96 bg-gradient-to-br from-indigo-400/40 to-purple-400/40 blur-3xl rounded-full" />
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups by name, topic, or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-300"
          >
            <SlidersHorizontal className="w-5 h-5" />
            Filters
            {(filterVisibility !== 'all' || filterAvailability !== 'all') && (
              <span className="w-2 h-2 bg-indigo-600 rounded-full" />
            )}
          </button>

          <button
            onClick={openCreateModal}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex items-center gap-2 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={courses.length === 0}
            title={courses.length === 0 ? 'Enroll in a course to create a study group.' : undefined}
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Course Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course
                </label>
                <select
                  value={selectedCourse || ''}
                  onChange={(e) => setSelectedCourse(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                >
                  <option value="">All Courses</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Visibility Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Visibility
                </label>
                <select
                  value={filterVisibility}
                  onChange={(e) => setFilterVisibility(e.target.value as 'all' | 'open' | 'approval' | 'private')}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="open">Open</option>
                  <option value="approval">Requires Approval</option>
                  <option value="private">Private</option>
                </select>
              </div>

              {/* Availability Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Availability
                </label>
                <select
                  value={filterAvailability}
                  onChange={(e) => setFilterAvailability(e.target.value as 'all' | 'available' | 'full')}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
                >
                  <option value="all">All Groups</option>
                  <option value="available">Available to Join</option>
                  <option value="full">Full Groups</option>
                </select>
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort by
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'match', label: 'Best Match', icon: Sparkles },
                  { value: 'members', label: 'Most Members', icon: Users },
                  { value: 'recent', label: 'Recently Created', icon: Clock },
                  { value: 'name', label: 'Name', icon: BookOpen }
                ].map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setSortBy(value as 'match' | 'members' | 'recent' | 'name')}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      sortBy === value
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {groupsError && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          {groupsError}
        </div>
      )}

      {/* Groups Grid */}
      {filteredGroups.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchQuery ? 'No groups found' : 'No groups available'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery
              ? 'Try adjusting your filters or search term'
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
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
                    {group.name.charAt(0)}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getVisibilityBadge(group.visibility)}
                    {sortBy === 'match' && group.matchPercentage !== undefined && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200 dark:border-indigo-800 rounded-full">
                        <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                          {group.matchPercentage}% match
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{group.name}</h3>
                
                {group.course && (
                  <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 mb-2">
                    <BookOpen className="w-3 h-3" />
                    <span className="font-medium">{group.course.code}</span>
                  </div>
                )}
                
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                  {group.description || group.topic || 'No description'}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>
                      {group.members?.length || group.memberCount || 0} / {group.maxSize}
                    </span>
                  </div>
                  {group.topic && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full truncate max-w-[150px]">
                      {group.topic}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/groups/${group.id}`}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors text-center"
                  >
                    Details
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
