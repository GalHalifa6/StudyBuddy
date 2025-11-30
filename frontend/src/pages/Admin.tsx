import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Course, StudyGroup, ROLE_LABELS, UserRole } from '../types';
import api from '../api/axios';
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
} from 'lucide-react';

const Admin: React.FC = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'courses' | 'groups'>('overview');
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Role change modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<string>('USER');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, coursesRes, groupsRes] = await Promise.all([
        api.get('/admin/users').catch(() => ({ data: [] })),
        api.get('/courses').catch(() => ({ data: [] })),
        api.get('/groups').catch(() => ({ data: [] })),
      ]);
      setUsers(usersRes.data || []);
      setCourses(coursesRes.data || []);
      setGroups(groupsRes.data || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;
    try {
      await api.put(`/admin/users/${selectedUser.id}/role`, { role: newRole });
      setShowRoleModal(false);
      setSelectedUser(null);
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { active: !currentStatus });
      fetchData();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const openRoleModal = (u: User) => {
    setSelectedUser(u);
    setNewRole(u.role);
    setShowRoleModal(true);
  };

  const stats = [
    {
      label: 'Total Users',
      value: users.length,
      icon: Users,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      label: 'Active Courses',
      value: courses.length,
      icon: GraduationCap,
      color: 'bg-green-500',
      change: '+8%',
    },
    {
      label: 'Study Groups',
      value: groups.length,
      icon: BookOpen,
      color: 'bg-purple-500',
      change: '+23%',
    },
    {
      label: 'Experts',
      value: users.filter(u => u.role === 'EXPERT').length,
      icon: Award,
      color: 'bg-orange-500',
      change: '+5%',
    },
  ];

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
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
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-green-500 text-sm font-medium flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {stat.change}
              </span>
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
            <p className="text-gray-600 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="flex gap-4 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'courses', label: 'Courses', icon: GraduationCap },
              { id: 'groups', label: 'Groups', icon: BookOpen },
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
                    <div className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>New user registered: <strong>john_doe</strong></span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      <span>Study group created: <strong>Calculus Study</strong></span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <GraduationCap className="w-5 h-5 text-purple-500" />
                      <span>Course added: <strong>CS101</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
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
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-gray-500">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
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
                          <td className="py-3 px-4 text-gray-600">{u.email}</td>
                          <td className="py-3 px-4">{getRoleBadge(u.role)}</td>
                          <td className="py-3 px-4">
                            {u.isActive ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="w-4 h-4" /> Active
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-600">
                                <XCircle className="w-4 h-4" /> Inactive
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => openRoleModal(u)}
                                className="p-2 hover:bg-purple-100 rounded-lg" 
                                title="Change Role"
                              >
                                <Award className="w-4 h-4 text-purple-500" />
                              </button>
                              <button 
                                onClick={() => handleToggleStatus(u.id, u.isActive)}
                                className={`p-2 rounded-lg ${u.isActive ? 'hover:bg-red-100' : 'hover:bg-green-100'}`}
                                title={u.isActive ? 'Deactivate' : 'Activate'}
                              >
                                {u.isActive ? (
                                  <UserX className="w-4 h-4 text-red-500" />
                                ) : (
                                  <UserCheck className="w-4 h-4 text-green-500" />
                                )}
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

          {activeTab === 'courses' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    className="input pl-10"
                  />
                </div>
                <button className="btn-primary">Add Course</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    No courses found
                  </div>
                ) : (
                  courses.map((course) => (
                    <div key={course.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded">
                            {course.code}
                          </span>
                        </div>
                        <button className="p-1 hover:bg-gray-200 rounded">
                          <MoreVertical className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                      <h4 className="font-medium text-gray-900 mt-2">{course.name}</h4>
                      <p className="text-sm text-gray-500 mt-1">{course.faculty || 'General'}</p>
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
                            {group.members?.length || 0} / {group.maxSize}
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
                              <button className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                                <Eye className="w-4 h-4 text-gray-500" />
                              </button>
                              <button className="p-2 hover:bg-red-100 rounded-lg" title="Delete">
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
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Changing a user to Expert role will allow them to create sessions, answer questions, and be listed in the expert directory.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeRole}
                className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
              >
                Update Role
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
