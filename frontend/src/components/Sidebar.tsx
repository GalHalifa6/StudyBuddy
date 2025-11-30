import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types';
import { notificationService } from '../api/notifications';
import NotificationPanel from './NotificationPanel';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Shield,
  Award,
  UserCheck,
  Calendar,
  Bell,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, logout, isAdmin, isExpert } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      // Silent fail
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/courses', icon: BookOpen, label: 'Courses' },
    { to: '/groups', icon: Users, label: 'Study Groups' },
    { to: '/sessions', icon: Calendar, label: 'Browse Sessions' },
    { to: '/experts', icon: UserCheck, label: 'Browse Experts' },
    { to: '/qa', icon: MessageCircle, label: 'Public Q&A' },
    { to: '/my-questions', icon: HelpCircle, label: 'My Questions' },
    { to: '/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  // Add expert dashboard for experts
  if (isExpert) {
    navItems.splice(4, 0, { to: '/expert-dashboard', icon: Award, label: 'Expert Dashboard' });
  }

  // Add admin panel for admins
  if (isAdmin) {
    navItems.push({ to: '/admin', icon: Shield, label: 'Admin Panel' });
  }

  const getRoleBadgeColor = () => {
    if (isAdmin) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    if (isExpert) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 z-50 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">StudyBuddy</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* User Info */}
      {!isCollapsed && user && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-white font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {user.fullName || user.username}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor()}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            {/* Notification Bell */}
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`
            }
            title={isCollapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </aside>
  );
};

export default Sidebar;
