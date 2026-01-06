import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Course, StudyGroup, ROLE_LABELS, UserRole, SuspendUserRequest, BanUserRequest, DeleteUserRequest, UpdateRoleRequest, UpdateStatusRequest, CreateCourseRequest } from '../types';
import api from '../api/axios';
import { courseService } from '../api/courses';

interface AdminStats {
  totalUsers?: number;
  activeUsers30d?: number;
  activeUsers7d?: number;
  inactiveUsers30d?: number;
  weekOverWeekChange?: number;
  expertCount?: number;
  studentCount?: number;
  newUsersThisWeek?: number;
  suspendedUsers?: number;
  bannedUsers?: number;
}

interface RecentActivity {
  type: string;
  message: string;
  timestamp: string;
  icon: string;
  color: string;
}

interface CourseWithDetails extends Course {
  groups?: StudyGroup[];
  students?: User[];
}
import {
  Shield,
  Users,
  GraduationCap,
  BookOpen,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Trash2,
  Eye,
  Award,
  TrendingUp,
  X,
  UserCheck,
  UserX,
  MoreVertical,
  Loader2,
  Ban,
  Clock,
  FileText,
  HelpCircle,
} from 'lucide-react';
import QuizManagement from '../components/admin/QuizManagement';

const Admin: React.FC = () => {
  const { isAdmin, user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const getErrorMessage = (error: unknown, defaultMessage: string): string => {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      return axiosError.response?.data?.message || defaultMessage;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return defaultMessage;
  };
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'courses' | 'groups' | 'quiz'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showDeleted, setShowDeleted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Modals
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUnsuspendModal, setShowUnsuspendModal] = useState(false);
  const [showUnbanModal, setShowUnbanModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState(false);
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>('USER');
  const [reason, setReason] = useState('');
  const [suspendDays, setSuspendDays] = useState<number | null>(7);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Add Course form state
  const [newCourse, setNewCourse] = useState<CreateCourseRequest>({
    code: '',
    name: '',
    description: '',
    faculty: '',
    semester: '',
  });
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<CourseWithDetails | null>(null);
  const [showCourseDetailModal, setShowCourseDetailModal] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [showArchiveCourseModal, setShowArchiveCourseModal] = useState(false);
  const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
  const [editCourseData, setEditCourseData] = useState({ name: '', description: '' });
  const [showGroupDetailModal, setShowGroupDetailModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<StudyGroup | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [usersRes, coursesRes, groupsRes, statsRes, activityRes] = await Promise.all([
        api.get(`/admin/users${showDeleted ? '?includeDeleted=true' : ''}`).catch((err) => {
          console.error('Error fetching users:', err.response?.status, err.response?.data, err.message);
          return { data: [], error: err };
        }),
        api.get(`/admin/courses${showArchived ? '?includeArchived=true' : ''}`).catch((err) => {
          console.error('Error fetching courses:', err.response?.status, err.response?.data, err.message);
          return { data: [], error: err };
        }),
        api.get('/admin/groups').catch((err) => {
          console.error('Error fetching groups:', err.response?.status, err.response?.data, err.message);
          return { data: [], error: err };
        }),
        api.get('/admin/stats').catch((err) => {
          console.error('Error fetching stats:', err.response?.status, err.response?.data, err.message);
          return { data: null, error: err };
        }),
        api.get('/admin/activity').catch((err) => {
          console.error('Error fetching activity:', err.response?.status, err.response?.data, err.message);
          return { data: [], error: err };
        }),
      ]);
      
      // Check for errors
      const errors: string[] = [];
      if ('error' in usersRes && usersRes.error) {
        const err = usersRes.error as { response?: { status?: number; data?: { message?: string } }; message?: string };
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.message;
        errors.push(`Users: ${status ? `HTTP ${status}` : 'Network error'}${msg ? ` - ${msg}` : ''}`);
      }
      if ('error' in coursesRes && coursesRes.error) {
        const err = coursesRes.error as { response?: { status?: number; data?: { message?: string } }; message?: string };
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.message;
        errors.push(`Courses: ${status ? `HTTP ${status}` : 'Network error'}${msg ? ` - ${msg}` : ''}`);
      }
      if ('error' in groupsRes && groupsRes.error) {
        const err = groupsRes.error as { response?: { status?: number; data?: { message?: string } }; message?: string };
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.message;
        errors.push(`Groups: ${status ? `HTTP ${status}` : 'Network error'}${msg ? ` - ${msg}` : ''}`);
      }
      if ('error' in statsRes && statsRes.error) {
        const err = statsRes.error as { response?: { status?: number; data?: { message?: string } }; message?: string };
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.message;
        errors.push(`Stats: ${status ? `HTTP ${status}` : 'Network error'}${msg ? ` - ${msg}` : ''}`);
      }
      if ('error' in activityRes && activityRes.error) {
        const err = activityRes.error as { response?: { status?: number; data?: { message?: string } }; message?: string };
        const status = err.response?.status;
        const msg = err.response?.data?.message || err.message;
        console.warn('Activity endpoint error:', status, msg);
        // Don't add to main errors, just log it
      }
      
      if (errors.length > 0) {
        setFetchError(errors.join('; '));
      }
      
      setUsers('data' in usersRes ? usersRes.data : []);
      setCourses('data' in coursesRes ? coursesRes.data : []);
      setGroups('data' in groupsRes ? groupsRes.data : []);
      setStats('data' in statsRes ? statsRes.data : null);
      setRecentActivity('data' in activityRes ? activityRes.data : []);
    } catch (error: unknown) {
      console.error('Error fetching admin data:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : error instanceof Error
        ? error.message
        : 'Failed to load admin data';
      setFetchError(errorMessage || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [showDeleted, showArchived]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, navigate, showDeleted, showArchived]);

  // Helper functions
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
  };

  const getUserStatus = (user: User): { label: string; color: string; icon: React.ReactNode } => {
    if (user.isDeleted) {
      return { label: 'Deleted', color: 'text-gray-600', icon: <Trash2 className="w-4 h-4" /> };
    }
    if (user.bannedAt) {
      return { label: 'Banned', color: 'text-red-600', icon: <Ban className="w-4 h-4" /> };
    }
    if (user.suspendedUntil) {
      const now = new Date();
      const suspendedUntil = new Date(user.suspendedUntil);
      if (suspendedUntil >= now) {
        return { label: 'Suspended', color: 'text-orange-600', icon: <Clock className="w-4 h-4" /> };
      }
    }
    if (!user.isActive) {
      return { label: 'Inactive', color: 'text-gray-600', icon: <XCircle className="w-4 h-4" /> };
    }
    return { label: 'Active', color: 'text-green-600', icon: <CheckCircle className="w-4 h-4" /> };
  };

  // Action handlers
  const handleChangeRole = async () => {
    if (!selectedUser || !reason.trim()) {
      setErrorMessage('Reason is required');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const request: UpdateRoleRequest = { role: newRole as UserRole, reason };
      await api.put(`/admin/users/${selectedUser.id}/role`, request);
      setShowRoleModal(false);
      setSelectedUser(null);
      setReason('');
      fetchData();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to change role'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    if (!selectedUser || !reason.trim()) {
      setErrorMessage('Reason is required');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const request: SuspendUserRequest = { days: suspendDays ?? undefined, reason };
      await api.post(`/admin/users/${selectedUser.id}/suspend`, request);
      setShowSuspendModal(false);
      setSelectedUser(null);
      setReason('');
      setSuspendDays(7);
      fetchData();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to suspend user'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleBan = async () => {
    if (!selectedUser || !reason.trim()) {
      setErrorMessage('Reason is required');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const request: BanUserRequest = { reason };
      await api.post(`/admin/users/${selectedUser.id}/ban`, request);
      setShowBanModal(false);
      setSelectedUser(null);
      setReason('');
      fetchData();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to ban user'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnban = async () => {
    if (!selectedUser || !reason.trim()) {
      setErrorMessage('Reason is required');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await api.post(`/admin/users/${selectedUser.id}/unban`, { reason });
      setShowUnbanModal(false);
      setSelectedUser(null);
      setReason('');
      fetchData();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to unban user'));
    } finally {
      setActionLoading(false);
    }
  };

  const openUnbanModal = (u: User) => {
    setSelectedUser(u);
    setReason('');
    setErrorMessage(null);
    setShowUnbanModal(true);
  };

  const handleUnsuspend = async () => {
    if (!selectedUser || !reason.trim()) {
      setErrorMessage('Reason is required');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await api.post(`/admin/users/${selectedUser.id}/unsuspend`, { reason });
      setShowUnsuspendModal(false);
      setSelectedUser(null);
      setReason('');
      fetchData();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to unsuspend user'));
    } finally {
      setActionLoading(false);
    }
  };

  const openUnsuspendModal = (u: User) => {
    setSelectedUser(u);
    setReason('');
    setErrorMessage(null);
    setShowUnsuspendModal(true);
  };

  const openRestoreModal = (u: User) => {
    setSelectedUser(u);
    setReason('');
    setErrorMessage(null);
    setShowRestoreModal(true);
  };

  const handleRestore = async () => {
    if (!selectedUser || !reason.trim()) {
      setErrorMessage('Reason is required');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await api.post(`/admin/users/${selectedUser.id}/restore`, { reason });
      setShowRestoreModal(false);
      setSelectedUser(null);
      setReason('');
      fetchData();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to restore user'));
    } finally {
      setActionLoading(false);
    }
  };

  const openPermanentDeleteModal = (u: User) => {
    setSelectedUser(u);
    setReason('');
    setErrorMessage(null);
    setShowPermanentDeleteModal(true);
  };

  const handlePermanentDelete = async () => {
    if (!selectedUser || !reason.trim()) {
      setErrorMessage('Reason is required');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const request: DeleteUserRequest = { reason };
      await api.delete(`/admin/users/${selectedUser.id}`, { data: request });
      setShowPermanentDeleteModal(false);
      setSelectedUser(null);
      setReason('');
      fetchData();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to permanently delete user'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSoftDelete = async () => {
    if (!selectedUser || !reason.trim()) {
      setErrorMessage('Reason is required');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const request: DeleteUserRequest = { reason };
      await api.post(`/admin/users/${selectedUser.id}/soft-delete`, request);
      setShowDeleteModal(false);
      setSelectedUser(null);
      setReason('');
      fetchData();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to delete user'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (userId: number, _currentStatus: boolean) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    setSelectedUser(user);
    setReason('');
    setShowStatusModal(true);
  };

  const handleStatusChange = async () => {
    if (!selectedUser || !reason.trim()) {
      setErrorMessage('Reason is required');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const request: UpdateStatusRequest = { active: !selectedUser.isActive, reason };
      await api.put(`/admin/users/${selectedUser.id}/status`, request);
      setShowStatusModal(false);
      setSelectedUser(null);
      setReason('');
      fetchData();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to update status'));
    } finally {
      setActionLoading(false);
    }
  };

  // Modal openers
  const openRoleModal = (u: User) => {
    setSelectedUser(u);
    setNewRole(u.role);
    setReason('');
    setErrorMessage(null);
    setShowRoleModal(true);
  };

  const openSuspendModal = (u: User) => {
    setSelectedUser(u);
    setReason('');
    setSuspendDays(7);
    setErrorMessage(null);
    setShowSuspendModal(true);
  };

  const openBanModal = (u: User) => {
    setSelectedUser(u);
    setReason('');
    setErrorMessage(null);
    setShowBanModal(true);
  };

  const handleCreateCourse = async () => {
    if (!newCourse.code.trim() || !newCourse.name.trim()) {
      setErrorMessage('Course code and name are required');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await courseService.createCourse(newCourse);
      setShowAddCourseModal(false);
      setNewCourse({ code: '', name: '', description: '', faculty: '', semester: '' });
      fetchData();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to create course'));
    } finally {
      setActionLoading(false);
    }
  };

  const fetchCourseDetails = async (courseId: number) => {
    try {
      const response = await api.get(`/admin/courses/${courseId}`);
      setSelectedCourse(response.data);
      setShowCourseDetailModal(true);
    } catch (error: unknown) {
      alert(getErrorMessage(error, 'Failed to fetch course details'));
    }
  };

  const handleUpdateCourse = async () => {
    if (!selectedCourse || !editCourseData.name.trim()) {
      setErrorMessage('Course name is required');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Reason is required');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await api.put(`/admin/courses/${selectedCourse.id}`, {
        name: editCourseData.name,
        description: editCourseData.description,
        reason: reason
      });
      setShowEditCourseModal(false);
      setReason('');
      fetchData();
      fetchCourseDetails(selectedCourse.id);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to update course'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveCourse = async () => {
    if (!selectedCourse || !reason.trim()) {
      setErrorMessage('Reason is required');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await api.post(`/admin/courses/${selectedCourse.id}/archive`, { reason });
      setShowArchiveCourseModal(false);
      setReason('');
      fetchData();
      setShowCourseDetailModal(false);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to archive course'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnarchiveCourse = async (courseId: number) => {
    if (!window.confirm('Are you sure you want to unarchive this course?')) return;
    try {
      await api.post(`/admin/courses/${courseId}/unarchive`, { reason: 'Unarchived by admin' });
      fetchData();
      if (selectedCourse && selectedCourse.id === courseId) {
        fetchCourseDetails(courseId);
      }
    } catch (error: unknown) {
      alert(getErrorMessage(error, 'Failed to unarchive course'));
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse || !reason.trim()) {
      setErrorMessage('Reason is required');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await api.delete(`/admin/courses/${selectedCourse.id}`, { data: { reason } });
      setShowDeleteCourseModal(false);
      setReason('');
      setShowCourseDetailModal(false);
      fetchData();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to delete course'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveUserFromCourse = async (courseId: number, userId: number) => {
    if (!window.confirm('Are you sure you want to remove this user from the course?')) return;
    try {
      await api.delete(`/admin/courses/${courseId}/members/${userId}`, { 
        data: { reason: 'Removed by admin' } 
      });
      fetchCourseDetails(courseId);
      fetchData();
    } catch (error: unknown) {
      alert(getErrorMessage(error, 'Failed to remove user from course'));
    }
  };

  const fetchGroupDetails = async (groupId: number) => {
    try {
      const response = await api.get(`/admin/groups/${groupId}`);
      setSelectedGroup(response.data);
      setShowGroupDetailModal(true);
    } catch (error: unknown) {
      alert(getErrorMessage(error, 'Failed to fetch group details'));
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup || !reason.trim()) {
      setErrorMessage('Reason is required');
      return;
    }
    setActionLoading(true);
    setErrorMessage(null);
    try {
      await api.delete(`/admin/groups/${selectedGroup.id}`, { 
        data: { reason } 
      });
      setShowDeleteGroupModal(false);
      setReason('');
      setShowGroupDetailModal(false);
      fetchData();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Failed to delete group'));
    } finally {
      setActionLoading(false);
    }
  };

  const openDeleteModal = (u: User) => {
    setSelectedUser(u);
    setReason('');
    setErrorMessage(null);
    setShowDeleteModal(true);
  };

  // Real statistics from backend
  const kpiStats = stats ? [
    {
      label: 'Total Users',
      value: stats.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-500',
      change: (stats.weekOverWeekChange ?? 0) > 0 
        ? `↑ ${stats.weekOverWeekChange} this week` 
        : (stats.weekOverWeekChange ?? 0) < 0 
        ? `↓ ${Math.abs(stats.weekOverWeekChange ?? 0)} this week`
        : 'No change',
      changeColor: (stats.weekOverWeekChange ?? 0) > 0 ? 'text-green-500' : (stats.weekOverWeekChange ?? 0) < 0 ? 'text-red-500' : 'text-gray-500',
    },
    {
      label: 'Active Users (30d)',
      value: stats.activeUsers30d || 0,
      icon: Activity,
      color: 'bg-green-500',
      change: stats.activeUsers7d ? `${stats.activeUsers7d} active (7d)` : '0 active (7d)',
      changeColor: 'text-gray-600',
    },
    {
      label: 'Study Groups',
      value: groups.length,
      icon: BookOpen,
      color: 'bg-purple-500',
      change: `${courses.length} courses`,
      changeColor: 'text-gray-600',
    },
    {
      label: 'Experts',
      value: stats.expertCount || 0,
      icon: Award,
      color: 'bg-orange-500',
      change: `${stats.studentCount || 0} students`,
      changeColor: 'text-gray-600',
    },
  ] : [
    {
      label: 'Total Users',
      value: users.length,
      icon: Users,
      color: 'bg-blue-500',
      change: 'Loading...',
      changeColor: 'text-gray-500',
    },
    {
      label: 'Active Users',
      value: 0,
      icon: Activity,
      color: 'bg-green-500',
      change: 'Loading...',
      changeColor: 'text-gray-500',
    },
    {
      label: 'Study Groups',
      value: groups.length,
      icon: BookOpen,
      color: 'bg-purple-500',
      change: `${courses.length} courses`,
      changeColor: 'text-gray-600',
    },
    {
      label: 'Experts',
      value: users.filter(u => u.role === 'EXPERT').length,
      icon: Award,
      color: 'bg-orange-500',
      change: 'Loading...',
      changeColor: 'text-gray-500',
    },
  ];

  // Filter states
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [registrationDateFilter, setRegistrationDateFilter] = useState<string>('all');
  const [lastLoginFilter, setLastLoginFilter] = useState<string>('all');

  const filteredUsers = users.filter(u => {
    // Create a single "now" Date object for consistent comparisons
    const now = new Date();
    
    // Search filter
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    // Role filter
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    
    // Activity filter
    let matchesActivity = true;
    if (activityFilter !== 'all') {
      // Deleted users should not match any activity filter (they're handled by status filter)
      if (u.isDeleted) {
        matchesActivity = false;
      } else {
        const lastLogin = u.lastLoginAt ? new Date(u.lastLoginAt) : null;
        const daysSinceLogin = lastLogin ? Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)) : Infinity;
        
        switch (activityFilter) {
          case 'active':
            matchesActivity = lastLogin !== null && daysSinceLogin < 7;
            break;
          case 'inactive':
            matchesActivity = lastLogin !== null && daysSinceLogin >= 7 && daysSinceLogin <= 30;
            break;
          case 'dormant':
            matchesActivity = lastLogin !== null && daysSinceLogin > 30;
            break;
          case 'never':
            matchesActivity = lastLogin === null;
            break;
        }
      }
    }
    
    // Status filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      switch (statusFilter) {
        case 'active':
          matchesStatus = !u.isDeleted && !u.bannedAt && (!u.suspendedUntil || new Date(u.suspendedUntil) <= now) && (u.isActive === true || u.isActive === undefined);
          break;
        case 'suspended':
          matchesStatus = !!(u.suspendedUntil && new Date(u.suspendedUntil) >= now);
          break;
        case 'banned':
          matchesStatus = u.bannedAt !== null && u.bannedAt !== undefined;
          break;
        case 'deleted':
          matchesStatus = u.isDeleted === true;
          break;
        case 'inactive':
          matchesStatus = !u.isActive && !u.isDeleted && !u.bannedAt;
          break;
      }
    }
    
    // Registration date filter
    let matchesRegistrationDate = true;
    if (registrationDateFilter !== 'all' && u.createdAt) {
      const created = new Date(u.createdAt);
      const daysSinceRegistration = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (registrationDateFilter) {
        case 'today':
          matchesRegistrationDate = daysSinceRegistration === 0;
          break;
        case 'thisWeek':
          matchesRegistrationDate = daysSinceRegistration <= 7;
          break;
        case 'thisMonth':
          matchesRegistrationDate = daysSinceRegistration <= 30;
          break;
      }
    }
    
    // Last login filter
    let matchesLastLogin = true;
    if (lastLoginFilter !== 'all') {
      if (lastLoginFilter === 'never') {
        // 'never' filter: only match users with no lastLoginAt
        matchesLastLogin = !u.lastLoginAt;
      } else if (u.lastLoginAt) {
        // For other filters, user must have a lastLoginAt
        const lastLogin = new Date(u.lastLoginAt);
        const daysSinceLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (lastLoginFilter) {
          case 'last24h':
            matchesLastLogin = daysSinceLogin === 0;
            break;
          case 'lastWeek':
            matchesLastLogin = daysSinceLogin <= 7;
            break;
          case 'lastMonth':
            matchesLastLogin = daysSinceLogin <= 30;
            break;
        }
      } else {
        // User has no lastLoginAt but filter is not 'never'
        matchesLastLogin = false;
      }
    }
    
    return matchesSearch && matchesRole && matchesActivity && matchesStatus && matchesRegistrationDate && matchesLastLogin;
  });

  const getRoleBadge = (role: UserRole) => {
    const colors = {
      ADMIN: 'bg-red-100 text-red-700',
      EXPERT: 'bg-purple-100 text-purple-700',
      USER: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role]}`}>
        {ROLE_LABELS[role]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-red-500" />
            Admin Panel
          </h1>
          <p className="text-gray-600 mt-1">Manage users, courses, and system settings</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/audit')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            <FileText className="w-5 h-5" />
            Audit Logs
          </button>
          <button
            onClick={() => navigate('/admin/experts')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
          >
            <Award className="w-5 h-5" />
            Expert Verification
          </button>
        </div>
      </div>

      {/* Error Message */}
      {fetchError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>{fetchError}</span>
          </div>
          <button
            onClick={() => {
              setFetchError(null);
              fetchData();
            }}
            className="text-red-700 hover:text-red-900 underline text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiStats.map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className={`${stat.changeColor} text-sm font-medium flex items-center gap-1`}>
                {stat.change.includes('↑') && <TrendingUp className="w-4 h-4" />}
                {stat.change.includes('↓') && <TrendingUp className="w-4 h-4 rotate-180" />}
                {stat.change}
              </span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
            <p className="text-gray-600 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Additional Statistics Row */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">New This Week</span>
              <span className="text-lg font-semibold text-gray-900">{stats.newUsersThisWeek || 0}</span>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Inactive (30d+)</span>
              <span className="text-lg font-semibold text-orange-600">{stats.inactiveUsers30d || 0}</span>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Suspended</span>
              <span className="text-lg font-semibold text-orange-600">{stats.suspendedUsers || 0}</span>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Banned</span>
              <span className="text-lg font-semibold text-red-600">{stats.bannedUsers || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'courses', label: 'Courses', icon: GraduationCap },
              { id: 'groups', label: 'Groups', icon: BookOpen },
              { id: 'quiz', label: 'Quiz Questions', icon: HelpCircle },
            ].map((tab) => (
              <button
                key={tab.id}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">System Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-medium text-gray-900 mb-4">User Distribution</h4>
                  <div className="space-y-3">
                    {(['USER', 'EXPERT', 'ADMIN'] as UserRole[]).map((role) => {
                      const count = users.filter(u => u.role === role).length;
                      const percentage = users.length > 0 ? (count / users.length) * 100 : 0;
                      return (
                        <div key={role}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{ROLE_LABELS[role]}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                role === 'ADMIN' ? 'bg-red-500' :
                                role === 'EXPERT' ? 'bg-purple-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Recent Activity</h4>
                  <div className="space-y-3">
                    {recentActivity.length === 0 ? (
                      <div className="text-sm text-gray-500 text-center py-4">
                        No recent activity
                      </div>
                    ) : (
                      recentActivity.map((activity, index) => {
                        const IconComponent = activity.icon === 'CheckCircle' ? CheckCircle :
                                            activity.icon === 'BookOpen' ? BookOpen :
                                            activity.icon === 'GraduationCap' ? GraduationCap : CheckCircle;
                        const colorClass = activity.color === 'green' ? 'text-green-500' :
                                         activity.color === 'blue' ? 'text-blue-500' :
                                         activity.color === 'purple' ? 'text-purple-500' : 'text-gray-500';
                        
                        // Parse message to extract the bold part
                        // Use indexOf to handle cases where the value contains ': '
                        const colonIndex = activity.message.indexOf(': ');
                        const label = colonIndex !== -1 ? activity.message.substring(0, colonIndex) : activity.message;
                        const value = colonIndex !== -1 ? activity.message.substring(colonIndex + 2) : '';
                        
                        return (
                          <div key={index} className="flex items-center gap-3 text-sm">
                            <IconComponent className={`w-5 h-5 ${colorClass}`} />
                            <span>
                              {label}: <strong>{value}</strong>
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search and Basic Filters */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input pl-10"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="input w-40"
                >
                  <option value="all">All Roles</option>
                  <option value="USER">Students</option>
                  <option value="EXPERT">Experts</option>
                  <option value="ADMIN">Admins</option>
                </select>
                <button
                  onClick={() => {
                    if (showDeleted) {
                      // Show all users
                      setShowDeleted(false);
                      setStatusFilter('all');
                    } else {
                      // Show only deleted users
                      setShowDeleted(true);
                      setStatusFilter('deleted');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showDeleted && statusFilter === 'deleted'
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {showDeleted && statusFilter === 'deleted' ? 'Show All Users' : 'Show Only Deleted'}
                </button>
              </div>

              {/* Advanced Filters */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Activity Status</label>
                    <select
                      value={activityFilter}
                      onChange={(e) => setActivityFilter(e.target.value)}
                      className="input text-sm w-full"
                    >
                      <option value="all">All Activity</option>
                      <option value="active">Active (7d)</option>
                      <option value="inactive">Inactive (7-30d)</option>
                      <option value="dormant">Dormant (30d+)</option>
                      <option value="never">Never Logged In</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Account Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="input text-sm w-full"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="banned">Banned</option>
                      <option value="deleted">Deleted</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Registration Date</label>
                    <select
                      value={registrationDateFilter}
                      onChange={(e) => setRegistrationDateFilter(e.target.value)}
                      className="input text-sm w-full"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="thisWeek">This Week</option>
                      <option value="thisMonth">This Month</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Last Login</label>
                    <select
                      value={lastLoginFilter}
                      onChange={(e) => setLastLoginFilter(e.target.value)}
                      className="input text-sm w-full"
                    >
                      <option value="all">All Time</option>
                      <option value="last24h">Last 24 Hours</option>
                      <option value="lastWeek">Last Week</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  Showing <strong>{filteredUsers.length}</strong> of <strong>{users.length}</strong> users
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Last Login</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Verified</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-gray-500">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const status = getUserStatus(u);
                        const isCurrentUser = currentUser?.id === u.id;
                        
                        return (
                        <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="avatar">
                                {u.fullName?.charAt(0) || u.username.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{u.fullName || u.username}</p>
                                <p className="text-sm text-gray-500">@{u.username}</p>
                              </div>
                            </div>
                          </td>
                            <td className="py-3 px-4 text-gray-600">
                              <div className="flex items-center gap-2">
                                {u.email}
                                {u.isEmailVerified && (
                                  <CheckCircle className="w-4 h-4 text-green-500" aria-label="Verified" />
                                )}
                              </div>
                            </td>
                          <td className="py-3 px-4">{getRoleBadge(u.role)}</td>
                          <td className="py-3 px-4">
                              <span className={`flex items-center gap-1 ${status.color}`}>
                                {status.icon} {status.label}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {formatRelativeTime(u.lastLoginAt)}
                            </td>
                            <td className="py-3 px-4">
                              {u.isEmailVerified ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-gray-400" />
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUser(u);
                                    setShowUserDetailModal(true);
                                  }}
                                  className="p-2 hover:bg-blue-100 rounded-lg cursor-pointer transition-colors" 
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4 text-blue-500" />
                                </button>
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openRoleModal(u);
                                }}
                                className="p-2 hover:bg-purple-100 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                                title="Change Role"
                                  disabled={isCurrentUser && u.role === 'ADMIN'}
                              >
                                <Award className="w-4 h-4 text-purple-500" />
                              </button>
                                
                                {/* Suspension actions */}
                                {u.suspendedUntil && new Date(u.suspendedUntil) > new Date() ? (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openUnsuspendModal(u);
                                    }}
                                    className="p-2 hover:bg-green-100 rounded-lg cursor-pointer transition-colors"
                                    title="Remove Suspension"
                                  >
                                    <Clock className="w-4 h-4 text-green-500" />
                                  </button>
                                ) : !u.bannedAt && !u.isDeleted ? (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openSuspendModal(u);
                                    }}
                                    className="p-2 hover:bg-orange-100 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Suspend"
                                    disabled={isCurrentUser}
                                  >
                                    <Clock className="w-4 h-4 text-orange-500" />
                                  </button>
                                ) : null}
                                
                                {/* Ban actions */}
                                {u.bannedAt ? (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openUnbanModal(u);
                                    }}
                                    className="p-2 hover:bg-green-100 rounded-lg cursor-pointer transition-colors"
                                    title="Unban"
                                  >
                                    <Ban className="w-4 h-4 text-green-500" />
                                  </button>
                                ) : !u.isDeleted ? (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openBanModal(u);
                                    }}
                                    className="p-2 hover:bg-red-100 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Ban"
                                    disabled={isCurrentUser}
                                  >
                                    <Ban className="w-4 h-4 text-red-500" />
                                  </button>
                                ) : null}
                                
                                {/* Login status toggle */}
                                {!u.isDeleted && (
                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleStatus(u.id, u.isActive);
                                }}
                                className={`p-2 rounded-lg cursor-pointer transition-colors ${u.isActive ? 'hover:bg-red-100' : 'hover:bg-green-100'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    title={u.isActive ? 'Disable Login' : 'Enable Login'}
                                    disabled={isCurrentUser}
                              >
                                {u.isActive ? (
                                  <UserX className="w-4 h-4 text-red-500" />
                                ) : (
                                  <UserCheck className="w-4 h-4 text-green-500" />
                                )}
                              </button>
                                )}
                                
                                {/* Delete/Restore actions */}
                                {u.isDeleted ? (
                                  <div className="flex gap-1">
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openRestoreModal(u);
                                      }}
                                      className="p-2 hover:bg-green-100 rounded-lg cursor-pointer transition-colors"
                                      title="Restore User"
                                    >
                                      <UserCheck className="w-4 h-4 text-green-500" />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openPermanentDeleteModal(u);
                                      }}
                                      className="p-2 hover:bg-red-100 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="Permanent Delete"
                                      disabled={isCurrentUser}
                                    >
                                      <Trash2 className="w-4 h-4 text-red-600" />
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDeleteModal(u);
                                    }}
                                    className="p-2 hover:bg-red-100 rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Delete"
                                    disabled={isCurrentUser}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    className="input pl-10"
                    value={courseSearchTerm}
                    onChange={(e) => setCourseSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                      className="rounded"
                    />
                    Show Archived
                  </label>
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      setNewCourse({ code: '', name: '', description: '', faculty: '', semester: '' });
                      setErrorMessage(null);
                      setShowAddCourseModal(true);
                    }}
                  >
                    Add Course
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.filter(course => 
                  courseSearchTerm === '' || 
                  course.name.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
                  course.code.toLowerCase().includes(courseSearchTerm.toLowerCase())
                ).length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No courses found
                  </div>
                ) : (
                  courses.filter(course => 
                    courseSearchTerm === '' || 
                    course.name.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
                    course.code.toLowerCase().includes(courseSearchTerm.toLowerCase())
                  ).map((course) => (
                    <div 
                      key={course.id} 
                      className={`bg-gray-50 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow ${course.isArchived ? 'opacity-60' : ''}`}
                      onClick={() => {
                        fetchCourseDetails(course.id);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">
                            {course.code}
                          </span>
                          {course.isArchived && (
                            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded">
                              Archived
                            </span>
                          )}
                        </div>
                        <button 
                          className="p-1 hover:bg-gray-200 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            fetchCourseDetails(course.id);
                          }}
                        >
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                      <h4 className="font-medium text-gray-900 mt-2">{course.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{course.faculty || 'General'}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {course.memberCount || 0} members
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {course.groupCount || 0} groups
                        </span>
                      </div>
                      {course.lastActivity && (
                        <p className="text-xs text-gray-400 mt-2">
                          Last activity: {formatRelativeTime(course.lastActivity)}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search groups..."
                  className="input pl-10"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Group</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Course</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Members</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-500">
                          No groups found
                        </td>
                      </tr>
                    ) : (
                      groups.map((group) => (
                        <tr key={group.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900">{group.name}</p>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{group.course?.name || 'N/A'}</td>
                          <td className="py-3 px-4 text-gray-600">
                            {(group.memberCount ?? group.members?.length ?? 0)} / {group.maxSize}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              group.visibility === 'open' ? 'bg-green-100 text-green-700' :
                              group.visibility === 'approval' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {group.visibility}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => fetchGroupDetails(group.id)}
                                className="p-2 hover:bg-gray-100 rounded-lg" 
                                title="View Details"
                              >
                                <Eye className="w-4 h-4 text-gray-500" />
                              </button>
                              <button 
                                onClick={() => {
                                  setSelectedGroup(group);
                                  setReason('');
                                  setErrorMessage(null);
                                  setShowDeleteGroupModal(true);
                                }}
                                className="p-2 hover:bg-red-100 rounded-lg" 
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <QuizManagement />
          )}
        </div>
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Change User Role</h2>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                <div className="avatar">
                  {selectedUser.fullName?.charAt(0) || selectedUser.username.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedUser.fullName || selectedUser.username}</p>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="USER">Student</option>
                  <option value="EXPERT">Expert</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for role change..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                />
              </div>
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Changing a user to Expert role will allow them to create sessions, answer questions, and be listed in the expert directory.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setReason('');
                  setErrorMessage(null);
                }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleChangeRole}
                disabled={actionLoading}
                className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend User Modal */}
      {showSuspendModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Suspend User</h2>
              <button onClick={() => {
                setShowSuspendModal(false);
                setReason('');
                setErrorMessage(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                <div className="avatar">
                  {selectedUser.fullName?.charAt(0) || selectedUser.username.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedUser.fullName || selectedUser.username}</p>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Suspension Duration</label>
                <select
                  value={suspendDays || ''}
                  onChange={(e) => setSuspendDays(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="">Indefinite</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for suspension..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              </div>
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setReason('');
                  setErrorMessage(null);
                }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={actionLoading}
                className="px-6 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Suspending...' : 'Suspend User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban User Modal */}
      {showBanModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Ban User</h2>
              <button onClick={() => {
                setShowBanModal(false);
                setReason('');
                setErrorMessage(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                <div className="avatar">
                  {selectedUser.fullName?.charAt(0) || selectedUser.username.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedUser.fullName || selectedUser.username}</p>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This will permanently ban the user from logging in. This action can be reversed by unbanning the user.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for ban..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
              </div>
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setReason('');
                  setErrorMessage(null);
                }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={actionLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Banning...' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Delete User</h2>
              <button onClick={() => {
                setShowDeleteModal(false);
                setReason('');
                setErrorMessage(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                <div className="avatar">
                  {selectedUser.fullName?.charAt(0) || selectedUser.username.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedUser.fullName || selectedUser.username}</p>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800">
                  <strong>Warning:</strong> This will soft delete the user. The user will be hidden from the system but data will be preserved. Permanent deletion can only be done after 30 days.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for deletion..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
              </div>
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setReason('');
                  setErrorMessage(null);
                }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSoftDelete}
                disabled={actionLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore User Modal */}
      {showRestoreModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Restore User</h2>
              <button onClick={() => {
                setShowRestoreModal(false);
                setReason('');
                setErrorMessage(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedUser.fullName || selectedUser.username}</p>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-800">
                  This will restore the user account. The user will be able to log in again and access their data.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for restoring user..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                />
              </div>
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  setReason('');
                  setErrorMessage(null);
                }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                disabled={actionLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Restoring...' : 'Restore User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Modal */}
      {showPermanentDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Permanent Delete User</h2>
              <button onClick={() => {
                setShowPermanentDeleteModal(false);
                setReason('');
                setErrorMessage(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedUser.fullName || selectedUser.username}</p>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-800 font-semibold mb-2">
                  ⚠️ WARNING: This action is IRREVERSIBLE
                </p>
                <p className="text-sm text-red-800">
                  This will <strong>permanently delete</strong> the user and all associated data from the database. This action cannot be undone. You can permanently delete immediately after soft deletion (30-day grace period can be bypassed by admin).
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for permanent deletion..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                  rows={3}
                />
              </div>
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPermanentDeleteModal(false);
                  setReason('');
                  setErrorMessage(null);
                }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handlePermanentDelete}
                disabled={actionLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedUser.isActive ? 'Disable Login' : 'Enable Login'}
              </h2>
              <button onClick={() => {
                setShowStatusModal(false);
                setReason('');
                setErrorMessage(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                <div className="avatar">
                  {selectedUser.fullName?.charAt(0) || selectedUser.username.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedUser.fullName || selectedUser.username}</p>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={`Enter reason for ${selectedUser.isActive ? 'disabling' : 'enabling'} login...`}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                />
              </div>
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setReason('');
                  setErrorMessage(null);
                }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                disabled={actionLoading}
                className={`px-6 py-2 rounded-xl transition-colors disabled:opacity-50 ${
                  selectedUser.isActive
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {actionLoading ? 'Updating...' : selectedUser.isActive ? 'Disable Login' : 'Enable Login'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsuspend User Modal */}
      {showUnsuspendModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Remove Suspension</h2>
              <button onClick={() => {
                setShowUnsuspendModal(false);
                setReason('');
                setErrorMessage(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                <div className="avatar">
                  {selectedUser.fullName?.charAt(0) || selectedUser.username.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedUser.fullName || selectedUser.username}</p>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-800">
                  <strong>Note:</strong> This will remove the suspension and allow the user to access their account again.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for removing suspension..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                />
              </div>
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUnsuspendModal(false);
                  setReason('');
                  setErrorMessage(null);
                }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleUnsuspend}
                disabled={actionLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Removing Suspension...' : 'Remove Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unban Modal */}
      {showUnbanModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Unban User</h2>
              <button onClick={() => {
                setShowUnbanModal(false);
                setReason('');
                setErrorMessage(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                <div className="avatar">
                  {selectedUser.fullName?.charAt(0) || selectedUser.username.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{selectedUser.fullName || selectedUser.username}</p>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm text-green-800">
                  <strong>Note:</strong> This will remove the ban and allow the user to access their account again.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for unbanning user..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={3}
                />
              </div>
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUnbanModal(false);
                  setReason('');
                  setErrorMessage(null);
                }}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleUnban}
                disabled={actionLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Unbanning...' : 'Unban User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail View Modal */}
      {showUserDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">User Details</h2>
              <button onClick={() => {
                setShowUserDetailModal(false);
                setSelectedUser(null);
              }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl">
                <div className="avatar text-2xl">
                  {selectedUser.fullName?.charAt(0) || selectedUser.username.charAt(0)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-lg">{selectedUser.fullName || selectedUser.username}</p>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>

              {/* Account Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500">Role</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">{getRoleBadge(selectedUser.role)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Status</label>
                  <p className="text-sm mt-1">
                    <span className={`flex items-center gap-1 ${getUserStatus(selectedUser).color}`}>
                      {getUserStatus(selectedUser).icon} {getUserStatus(selectedUser).label}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Registered</label>
                  <p className="text-sm text-gray-900 mt-1">{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Last Login</label>
                  <p className="text-sm text-gray-900 mt-1">{formatRelativeTime(selectedUser.lastLoginAt)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Email Verified</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedUser.isEmailVerified ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400">
                        <XCircle className="w-4 h-4" /> Not Verified
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Account Age</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedUser.createdAt 
                      ? `${Math.floor((new Date().getTime() - new Date(selectedUser.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days`
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Activity Summary */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-medium text-gray-900 mb-3">Activity Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-500">Groups Joined</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedUser.groupsCount || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-500">Courses Enrolled</label>
                    <p className="text-lg font-semibold text-gray-900">{selectedUser.coursesCount || 0}</p>
                  </div>
                </div>
              </div>

              {/* Suspension/Ban Info */}
              {(selectedUser.suspendedUntil || selectedUser.bannedAt) && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="font-medium text-gray-900 mb-3">Account Restrictions</h3>
                  {selectedUser.suspendedUntil && new Date(selectedUser.suspendedUntil) > new Date() && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-2">
                      <p className="text-sm font-medium text-orange-900">Suspended</p>
                      <p className="text-xs text-orange-700">Until: {formatDate(selectedUser.suspendedUntil)}</p>
                      {selectedUser.suspensionReason && (
                        <p className="text-xs text-orange-600 mt-1">Reason: {selectedUser.suspensionReason}</p>
                      )}
                    </div>
                  )}
                  {selectedUser.bannedAt && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-900">Banned</p>
                      <p className="text-xs text-red-700">Since: {formatDate(selectedUser.bannedAt)}</p>
                      {selectedUser.banReason && (
                        <p className="text-xs text-red-600 mt-1">Reason: {selectedUser.banReason}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => {
                  setShowUserDetailModal(false);
                  setSelectedUser(null);
                }}
                className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Add New Course</h2>
              <button 
                onClick={() => {
                  setShowAddCourseModal(false);
                  setNewCourse({ code: '', name: '', description: '', faculty: '', semester: '' });
                  setErrorMessage(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., CS101"
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCourse.name}
                  onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                  placeholder="e.g., Introduction to Computer Science"
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                  placeholder="Course description..."
                  className="input w-full"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Faculty
                  </label>
                  <input
                    type="text"
                    value={newCourse.faculty}
                    onChange={(e) => setNewCourse({ ...newCourse, faculty: e.target.value })}
                    placeholder="e.g., Computer Science"
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={newCourse.semester}
                    onChange={(e) => setNewCourse({ ...newCourse, semester: e.target.value })}
                    placeholder="e.g., Fall 2024"
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowAddCourseModal(false);
                    setNewCourse({ code: '', name: '', description: '', faculty: '', semester: '' });
                    setErrorMessage(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCourse}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Course'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Course Detail Modal */}
      {showCourseDetailModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedCourse.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedCourse.code} • {selectedCourse.faculty || 'General'}</p>
              </div>
              <button 
                onClick={() => {
                  setShowCourseDetailModal(false);
                  setSelectedCourse(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Course Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Course Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Created</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(selectedCourse.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Status</label>
                    <p className="text-sm mt-1">
                      {selectedCourse.isArchived ? (
                        <span className="text-orange-600 font-medium">Archived</span>
                      ) : (
                        <span className="text-green-600 font-medium">Active</span>
                      )}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500">Description</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedCourse.description || 'No description'}</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600">{selectedCourse.memberCount || 0}</p>
                  <p className="text-sm text-gray-600 mt-1">Enrolled Users</p>
                </div>
                <div className="bg-green-50 p-4 rounded-xl">
                  <p className="text-2xl font-bold text-green-600">{selectedCourse.groupCount || 0}</p>
                  <p className="text-sm text-gray-600 mt-1">Study Groups</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl">
                  <p className="text-sm font-bold text-purple-600">{selectedCourse.groupCount || 0}</p>
                  <p className="text-sm text-gray-600 mt-1">Total Groups</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setEditCourseData({ name: selectedCourse.name, description: selectedCourse.description || '' });
                    setReason('');
                    setErrorMessage(null);
                    setShowEditCourseModal(true);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors"
                >
                  Edit Course
                </button>
                {selectedCourse.isArchived ? (
                  <button
                    onClick={() => handleUnarchiveCourse(selectedCourse.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                  >
                    Unarchive
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setReason('');
                      setErrorMessage(null);
                      setShowArchiveCourseModal(true);
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors"
                  >
                    Archive
                  </button>
                )}
                <button
                  onClick={() => {
                    setReason('');
                    setErrorMessage(null);
                    setShowDeleteCourseModal(true);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>

              {/* Groups */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Study Groups ({selectedCourse.groups?.length || selectedCourse.groupCount || 0})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedCourse.groups && selectedCourse.groups.length > 0 ? (
                    selectedCourse.groups.map((group: StudyGroup) => (
                      <div key={group.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">{group.name}</p>
                          <p className="text-xs text-gray-500">{group.memberCount || 0} members • {group.visibility}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${group.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                          {group.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No groups found</p>
                  )}
                </div>
              </div>

              {/* Enrolled Users */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Enrolled Users ({selectedCourse.students?.length || selectedCourse.memberCount || 0})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">User</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Role</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Status</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Last Login</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedCourse.students && selectedCourse.students.length > 0 ? (
                        selectedCourse.students.map((student: User) => (
                          <tr key={student.id} className="border-b border-gray-100">
                            <td className="py-2 px-3">
                              <p className="font-medium text-gray-900 text-sm">{student.fullName || student.username}</p>
                              <p className="text-xs text-gray-500">{student.email}</p>
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-600">{student.role}</td>
                            <td className="py-2 px-3">
                              <span className={`text-xs px-2 py-1 rounded ${student.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {student.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-xs text-gray-600">
                              {formatRelativeTime(student.lastLoginAt)}
                            </td>
                            <td className="py-2 px-3">
                              <button
                                onClick={() => handleRemoveUserFromCourse(selectedCourse.id, student.id)}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-4 text-sm text-gray-500">No enrolled users</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditCourseModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Edit Course</h2>
              <button 
                onClick={() => {
                  setShowEditCourseModal(false);
                  setReason('');
                  setErrorMessage(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editCourseData.name}
                  onChange={(e) => setEditCourseData({ ...editCourseData, name: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editCourseData.description}
                  onChange={(e) => setEditCourseData({ ...editCourseData, description: e.target.value })}
                  className="input w-full"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Change <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for this change..."
                  className="input w-full"
                  rows={3}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowEditCourseModal(false);
                    setReason('');
                    setErrorMessage(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateCourse}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Course'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Course Modal */}
      {showArchiveCourseModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Archive Course</h2>
              <button 
                onClick={() => {
                  setShowArchiveCourseModal(false);
                  setReason('');
                  setErrorMessage(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to archive <strong>{selectedCourse.name}</strong>? 
                This will hide it from regular users but preserve all data.
              </p>
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for archiving..."
                  className="input w-full"
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowArchiveCourseModal(false);
                    setReason('');
                    setErrorMessage(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchiveCourse}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Archiving...
                    </>
                  ) : (
                    'Archive Course'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Course Modal */}
      {showDeleteCourseModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-red-600">Delete Course</h2>
              <button 
                onClick={() => {
                  setShowDeleteCourseModal(false);
                  setReason('');
                  setErrorMessage(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-2">⚠️ Warning: This action cannot be undone!</p>
                <p className="text-sm text-red-700">
                  Deleting <strong>{selectedCourse.name}</strong> will permanently remove it and all associated data.
                  Consider archiving instead if you want to preserve the data.
                </p>
              </div>
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for deletion..."
                  className="input w-full"
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteCourseModal(false);
                    setReason('');
                    setErrorMessage(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCourse}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Permanently'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Detail Modal */}
      {showGroupDetailModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedGroup.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedGroup.course?.name || 'No course'} • {selectedGroup.visibility}</p>
              </div>
              <button 
                onClick={() => {
                  setShowGroupDetailModal(false);
                  setSelectedGroup(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Group Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Group Information</h3>
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Created</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(selectedGroup.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Status</label>
                    <p className="text-sm mt-1">
                      {selectedGroup.isActive ? (
                        <span className="text-green-600 font-medium">Active</span>
                      ) : (
                        <span className="text-gray-600 font-medium">Inactive</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Max Size</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedGroup.maxSize}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Creator</label>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedGroup.creator?.fullName || selectedGroup.creator?.username || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-gray-500">Description</label>
                    <p className="text-sm text-gray-900 mt-1">{selectedGroup.description || 'No description'}</p>
                  </div>
                  {selectedGroup.topic && (
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500">Topic</label>
                      <p className="text-sm text-gray-900 mt-1">{selectedGroup.topic}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setReason('');
                    setErrorMessage(null);
                    setShowDeleteGroupModal(true);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                >
                  Delete Group
                </button>
              </div>

              {/* Members */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Members ({selectedGroup.members?.length || 0})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">User</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Role</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Status</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-gray-600">Last Login</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedGroup.members && selectedGroup.members.length > 0 ? (
                        selectedGroup.members.map((member: User) => (
                          <tr key={member.id} className="border-b border-gray-100">
                            <td className="py-2 px-3">
                              <p className="font-medium text-gray-900 text-sm">{member.fullName || member.username}</p>
                              <p className="text-xs text-gray-500">{member.email}</p>
                            </td>
                            <td className="py-2 px-3 text-sm text-gray-600">{member.role}</td>
                            <td className="py-2 px-3">
                              <span className={`text-xs px-2 py-1 rounded ${member.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {member.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-xs text-gray-600">
                              {formatRelativeTime(member.lastLoginAt)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-4 text-sm text-gray-500">No members</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Modal */}
      {showDeleteGroupModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-red-600">Delete Group</h2>
              <button 
                onClick={() => {
                  setShowDeleteGroupModal(false);
                  setReason('');
                  setErrorMessage(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-2">⚠️ Warning: This action cannot be undone!</p>
                <p className="text-sm text-red-700">
                  Deleting <strong>{selectedGroup.name}</strong> will permanently remove it and all associated data (messages, files, etc.).
                </p>
              </div>
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {errorMessage}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for deletion..."
                  className="input w-full"
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteGroupModal(false);
                    setReason('');
                    setErrorMessage(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteGroup}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Permanently'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
