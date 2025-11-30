import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { notificationService } from '../api/notifications';
import { studentExpertService } from '../api/experts';
import { Notification } from '../types';
import {
  Bell,
  X,
  Check,
  MessageCircle,
  Calendar,
  Star,
  HelpCircle,
  Users,
  ChevronRight,
  Loader2,
  Trash2,
  Play,
  Video,
} from 'lucide-react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [questionDetails, setQuestionDetails] = useState<any>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationService.getAll();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleExpandQuestion = async (notif: Notification) => {
    if (notif.referenceType !== 'QUESTION' || !notif.referenceId) return;
    
    if (expandedQuestion === notif.id) {
      setExpandedQuestion(null);
      setQuestionDetails(null);
      return;
    }

    setExpandedQuestion(notif.id);
    try {
      const question = await studentExpertService.getQuestion(notif.referenceId);
      setQuestionDetails(question);
    } catch (error) {
      console.error('Failed to load question details:', error);
      setQuestionDetails(null);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'NEW_QUESTION':
      case 'QUESTION_ANSWERED':
        return <HelpCircle className="w-5 h-5 text-blue-500" />;
      case 'SESSION_INVITATION':
      case 'SESSION_REMINDER':
        return <Calendar className="w-5 h-5 text-green-500" />;
      case 'SESSION_STARTED':
        return <Play className="w-5 h-5 text-green-500" />;
      case 'NEW_REVIEW':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'GROUP_INVITE':
        return <Users className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex justify-end">
      <div
        ref={panelRef}
        className="w-full max-w-md bg-white dark:bg-gray-800 h-full shadow-2xl animate-slide-in-right overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6" />
            <h2 className="text-lg font-bold">Notifications</h2>
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                {notifications.filter((n) => !n.isRead).length} new
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        {notifications.some((n) => !n.isRead) && (
          <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <Bell className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    !notif.isRead ? 'bg-purple-50/50 dark:bg-purple-900/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-medium text-gray-900 dark:text-white text-sm ${
                            !notif.isRead ? 'font-semibold' : ''
                          }`}>
                            {notif.title}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                            {notif.message}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {formatTime(notif.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notif.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notif.id)}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>

                      {/* Expandable section for Q&A answers */}
                      {notif.type === 'QUESTION_ANSWERED' && notif.referenceType === 'QUESTION' && (
                        <div className="mt-2">
                          <button
                            onClick={() => handleExpandQuestion(notif)}
                            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 flex items-center gap-1"
                          >
                            {expandedQuestion === notif.id ? 'Hide answer' : 'View answer'}
                            <ChevronRight
                              className={`w-4 h-4 transition-transform ${
                                expandedQuestion === notif.id ? 'rotate-90' : ''
                              }`}
                            />
                          </button>
                          
                          {expandedQuestion === notif.id && questionDetails && (
                            <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageCircle className="w-4 h-4 text-green-600" />
                                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                  Expert's Answer
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {questionDetails.answer || 'Loading...'}
                              </p>
                              {questionDetails.answeredBy && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  Answered by {questionDetails.answeredBy.fullName}
                                </p>
                              )}
                              <Link
                                to={`/questions/${notif.referenceId}`}
                                className="inline-block mt-2 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700"
                              >
                                View full question →
                              </Link>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons for actionable notifications */}
                      {notif.isActionable && notif.actionStatus === 'PENDING' && (
                        <div className="mt-3 flex gap-2">
                          {notif.type === 'SESSION_INVITATION' && (
                            <Link
                              to="/sessions/browse"
                              className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700"
                            >
                              View Session
                            </Link>
                          )}
                          {notif.type === 'GROUP_INVITE' && (
                            <>
                              <button className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700">
                                Accept
                              </button>
                              <button className="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs rounded-lg hover:bg-gray-300">
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Session started - show Join Now button */}
                      {notif.type === 'SESSION_STARTED' && notif.link && (
                        <div className="mt-3">
                          <Link
                            to={notif.link}
                            onClick={() => {
                              handleMarkAsRead(notif.id);
                              onClose();
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25 animate-pulse"
                          >
                            <Video className="w-4 h-4" />
                            Join Session Now
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <Link
            to="/notifications"
            className="block w-full text-center text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 font-medium"
            onClick={onClose}
          >
            View all notifications
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
