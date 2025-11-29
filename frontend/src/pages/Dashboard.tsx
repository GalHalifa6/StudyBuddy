import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { groupService, courseService } from '../api';
import { StudyGroup, Course, ROLE_LABELS } from '../types';
import { 
  Users, 
  BookOpen, 
  MessageSquare, 
  TrendingUp, 
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  Plus,
  Shield,
  Award,
  GraduationCap
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user, isAdmin, isExpert } = useAuth();
  const [myGroups, setMyGroups] = useState<StudyGroup[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupsData, coursesData] = await Promise.all([
          groupService.getMyGroups(),
          courseService.getAllCourses(),
        ]);
        setMyGroups(groupsData);
        setCourses(coursesData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const stats = [
    { 
      label: 'My Groups', 
      value: myGroups.length, 
      icon: Users, 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    { 
      label: 'Courses', 
      value: courses.length, 
      icon: BookOpen, 
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    { 
      label: 'Messages', 
      value: 0, 
      icon: MessageSquare, 
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    { 
      label: 'Study Hours', 
      value: 0, 
      icon: Clock, 
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getRoleBadge = () => {
    if (!user?.role) return null;
    const colors = {
      ADMIN: 'bg-red-100 text-red-700 border-red-200',
      EXPERT: 'bg-purple-100 text-purple-700 border-purple-200',
      USER: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    const icons = {
      ADMIN: <Shield className="w-4 h-4" />,
      EXPERT: <Award className="w-4 h-4" />,
      USER: <GraduationCap className="w-4 h-4" />,
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${colors[user.role]}`}>
        {icons[user.role]}
        {ROLE_LABELS[user.role]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="card p-8 gradient-bg text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center gap-2 text-white/80">
              <Sparkles className="w-5 h-5" />
              <span className="text-sm font-medium">{getGreeting()}</span>
            </div>
            {getRoleBadge()}
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {user?.fullName || user?.username}! 👋
          </h1>
          <p className="text-white/80 max-w-lg">
            {isAdmin 
              ? "You have full administrative access. Manage users, courses, and system settings."
              : isExpert 
                ? "Share your expertise! Help students by providing guidance and creating specialized content."
                : "Ready to learn something new today? Check out your study groups or explore new courses."
            }
          </p>
          
          <div className="flex gap-4 mt-6">
            {isAdmin && (
              <Link to="/admin" className="btn-secondary !bg-white !text-primary-600 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin Panel
              </Link>
            )}
            <Link to="/groups" className={`btn-secondary ${isAdmin ? '!bg-white/20 !text-white !border-white/30' : '!bg-white !text-primary-600'} flex items-center gap-2`}>
              <Users className="w-4 h-4" />
              Browse Groups
            </Link>
            <Link to="/courses" className="btn-secondary !bg-white/20 !text-white !border-white/30 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              View Courses
            </Link>
          </div>
        </div>
      </div>

      {/* Admin/Expert Quick Access */}
      {(isAdmin || isExpert) && (
        <div className={`card p-6 ${isAdmin ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-200'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isAdmin ? 'bg-red-100' : 'bg-purple-100'}`}>
              {isAdmin ? <Shield className="w-6 h-6 text-red-600" /> : <Award className="w-6 h-6 text-purple-600" />}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold ${isAdmin ? 'text-red-900' : 'text-purple-900'}`}>
                {isAdmin ? 'Administrator Access' : 'Expert Access'}
              </h3>
              <p className={`text-sm ${isAdmin ? 'text-red-700' : 'text-purple-700'}`}>
                {isAdmin 
                  ? 'You can manage users, courses, and system settings from the Admin Panel.'
                  : 'You can provide expert guidance and create specialized content for students.'
                }
              </p>
            </div>
            {isAdmin && (
              <Link to="/admin" className="btn-primary !bg-red-600 hover:!bg-red-700 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Open Admin Panel
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
            <p className="text-gray-500 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* My Study Groups */}
        <div className="lg:col-span-2 card">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">My Study Groups</h2>
              <Link to="/groups" className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            {myGroups.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No groups yet</h3>
                <p className="text-gray-500 mb-6">Join a study group to start collaborating with others!</p>
                <Link to="/groups" className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Find Groups
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {myGroups.slice(0, 4).map((group) => (
                  <Link
                    key={group.id}
                    to={`/groups/${group.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center text-white font-bold">
                      {group.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{group.name}</h3>
                      <p className="text-sm text-gray-500 truncate">{group.topic || group.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{group.members?.length || 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/groups/create"
                className="flex items-center gap-3 p-3 rounded-xl bg-primary-50 text-primary-700 hover:bg-primary-100 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Create New Group</span>
              </Link>
              <Link
                to="/courses"
                className="flex items-center gap-3 p-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                <span className="font-medium">Browse Courses</span>
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-3 p-3 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Admin Panel</span>
                </Link>
              )}
              <Link
                to="/settings"
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Update Profile</span>
              </Link>
            </div>
          </div>

          {/* Available Courses */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Available Courses</h2>
            </div>
            <div className="p-4">
              {courses.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No courses available yet</p>
              ) : (
                <div className="space-y-2">
                  {courses.slice(0, 5).map((course) => (
                    <Link
                      key={course.id}
                      to={`/courses/${course.id}`}
                      className="block p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{course.name}</h3>
                          <p className="text-xs text-gray-500">{course.code}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
