import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types';
import { notificationService } from '../api/notifications';
import { messageService } from '../api/messages';
import NotificationPanel from './NotificationPanel';
import ThemeToggle from './ThemeToggle';
import type { LucideIcon } from 'lucide-react';
import {
  Award,
  Bell,
  BookMarked,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flag,
  GraduationCap,
  LifeBuoy,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  UserCheck,
  Users,
  X,
} from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  onToggle: () => void;
}

type NavItem = {
  to: string;
  icon: LucideIcon;
  label: string;
};

interface NavSection {
  title: string;
  items: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  isMobileOpen,
  onMobileClose,
  onToggle,
}) => {
  const { user, logout, isAdmin, isExpert } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageUnread, setMessageUnread] = useState(0);

  useEffect(() => {
    loadUnreadIndicators();
    const interval = setInterval(loadUnreadIndicators, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadUnreadIndicators = async () => {
    try {
      const [notificationTotal, messageSummary] = await Promise.all([
        notificationService.getUnreadCount(),
        messageService.getUnreadSummary().catch(() => ({ total: 0 })),
      ]);

      setUnreadCount(notificationTotal);
      if (typeof messageSummary?.total === 'number') {
        setMessageUnread(messageSummary.total);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleLogout = () => {
    void logout();
    onMobileClose();
    navigate('/login');
  };

  const navSections = useMemo<NavSection[]>(() => {
    const sections: NavSection[] = [
      {
        title: 'My StudyBuddy',
        items: [
          { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { to: '/my-groups', icon: Users, label: 'My Groups' },
          { to: '/my-courses', icon: BookMarked, label: 'My Courses' },
          { to: '/upcoming-events', icon: Calendar, label: 'Upcoming Events' },
        ],
      },
      {
        title: 'Explore',
        items: [
          { to: '/groups', icon: Users, label: 'Study Groups' },
          { to: '/courses', icon: BookOpen, label: 'Courses' },
          { to: '/experts', icon: UserCheck, label: 'Experts' },
        ],
      },
      {
        title: 'Support',
        items: [
          { to: '/settings', icon: Settings, label: 'Settings' },
          { to: '/help', icon: LifeBuoy, label: 'Help' },
          { to: '/send-report', icon: Flag, label: 'Send Report' },
        ],
      },
    ];

    if (isExpert) {
      sections[0].items.splice(1, 0, { to: '/expert-dashboard', icon: Award, label: 'Expert Hub' });
    }

    if (isAdmin) {
      sections.push({
        title: 'Administration',
        items: [{ to: '/admin', icon: Shield, label: 'Admin Panel' }],
      });
    }

    return sections;
  }, [isAdmin, isExpert]);

  const getRoleBadgeColor = () => {
    if (isAdmin) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
    if (isExpert) return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
    return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-full w-72 max-w-[calc(100vw-1.5rem)] flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 dark:border-gray-700 dark:bg-gray-800 lg:z-50 lg:max-w-none lg:shadow-none ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
    >
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-bg">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">StudyBuddy</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            type="button"
            onClick={onToggle}
            className="hidden rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 lg:inline-flex"
            aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && user && (
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-secondary-500 font-bold text-white">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-gray-900 dark:text-white">
                {user.fullName || user.username}
              </p>
              <span className={`rounded-full px-2 py-0.5 text-xs ${getRoleBadgeColor()}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              className="relative rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Notifications"
            >
              <Bell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-6 overflow-y-auto p-4">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-2">
            {!isCollapsed && (
              <p className="px-4 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {section.title}
              </p>
            )}
            <div className="space-y-2">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onMobileClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                      isActive
                        ? 'bg-primary-50 font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                    } ${isCollapsed ? 'justify-center' : ''}`
                  }
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className="relative">
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {item.label === 'Messages' && messageUnread > 0 && (
                      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-green-500" />
                    )}
                  </span>
                  {!isCollapsed && (
                    <span className="flex flex-1 items-center justify-between">
                      <span>{item.label}</span>
                      {item.label === 'Messages' && messageUnread > 0 && (
                        <span className="ml-3 inline-flex min-w-[1.75rem] items-center justify-center rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white">
                          {messageUnread > 99 ? '99+' : messageUnread}
                        </span>
                      )}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <div className={`flex items-center gap-2 ${isCollapsed ? 'flex-col' : ''}`}>
          <ThemeToggle variant="icon" className="flex-shrink-0" />
          <button
            type="button"
            onClick={handleLogout}
            className={`flex flex-1 items-center gap-3 rounded-xl px-4 py-3 text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 ${
              isCollapsed ? 'w-full justify-center' : ''
            }`}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </div>

      <NotificationPanel
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </aside>
  );
};

export default Sidebar;