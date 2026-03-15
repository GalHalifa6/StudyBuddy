import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { notificationService } from '../api/notifications';
import { studentExpertService } from '../api/experts';
import { groupService } from '../api/groups';
import { Notification } from '../types';
import { useToast } from '../context/ToastContext';
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
  const { showSuccess, showError } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [questionDetails, setQuestionDetails] = useState<any>(null);
  const [processingInvite, setProcessingInvite] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

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

  const handleGroupInviteAction = async (notif: Notification, accept: boolean) => {
    if (!notif.referenceId) return;
    setProcessingInvite(notif.id);
    try {
      // Find the invite request matching this group
      const invites = await groupService.getMyInvites();
      const invite = invites.find((inv) => inv.group?.id === notif.referenceId);
      if (!invite) {
        showError('Invitation not found — it may have already been handled.');
        return;
      }
      if (accept) {
        await groupService.acceptRequest(invite.id);
        showSuccess('You joined the group!');
      } else {
        await groupService.rejectRequest(invite.id);
        showSuccess('Invitation declined.');
      }
      // Update notification locally to reflect the action
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id
            ? { ...n, isRead: true, actionStatus: accept ? 'ACCEPTED' : 'REJECTED' }
            : n
        )
      );
      handleMarkAsRead(notif.id);
    } catch (error) {
      console.error('Failed to handle invite:', error);
      showError('Failed to process invitation. Please try again.');
    } finally {
      setProcessingInvite(null);
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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div
        ref={panelRef}
        className="flex h-full w-full max-w-md flex-col overflow-hidden bg-white shadow-2xl animate-slide-in-right dark:bg-gray-800"
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 p-4 text-white dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6" />
            <h2 className="text-lg font-bold">Notifications</h2>
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs text-white">
                {notifications.filter((n) => !n.isRead).length} new
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 transition-colors hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {notifications.some((n) => !n.isRead) && (
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-900">
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
            >
              <Check className="w-4 h-4" />
              Mark all as read
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-gray-500 dark:text-gray-400">
              <Bell className="mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium">No notifications</p>
              <p className="text-sm">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    !notif.isRead ? 'bg-purple-50/50 dark:bg-purple-900/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-medium text-gray-900 dark:text-white ${
                            !notif.isRead ? 'font-semibold' : ''
                          }`}>
                            {notif.title}
                          </p>
                          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                            {notif.message}
                          </p>
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                            {formatTime(notif.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notif.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="rounded-lg p-1.5 transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notif.id)}
                            className="rounded-lg p-1.5 transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>

                      {notif.type === 'QUESTION_ANSWERED' && notif.referenceType === 'QUESTION' && (
                        <div className="mt-2">
                          <button
                            onClick={() => handleExpandQuestion(notif)}
                            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400"
                          >
                            {expandedQuestion === notif.id ? 'Hide answer' : 'View answer'}
                            <ChevronRight
                              className={`w-4 h-4 transition-transform ${
                                expandedQuestion === notif.id ? 'rotate-90' : ''
                              }`}
                            />
                          </button>

                          {expandedQuestion === notif.id && questionDetails && (
                            <div className="mt-3 rounded-lg border border-green-100 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
                              <div className="mb-2 flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-green-600" />
                                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                  Expert's Answer
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">
                                {questionDetails.answer || 'Loading...'}
                              </p>
                              {questionDetails.answeredBy && (
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  Answered by {questionDetails.answeredBy.fullName}
                                </p>
                              )}
                              <Link
                                to="/questions"
                                onClick={onClose}
                                className="mt-2 inline-block text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400"
                              >
                                Open questions hub
                              </Link>
                            </div>
                          )}
                        </div>
                      )}

                      {notif.isActionable && notif.actionStatus === 'PENDING' && (
                        <div className="mt-3 flex gap-2">
                          {notif.type === 'SESSION_INVITATION' && notif.link && (
                            <Link
                              to={notif.link}
                              onClick={() => {
                                handleMarkAsRead(notif.id);
                                onClose();
                              }}
                              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs text-white hover:bg-purple-700"
                            >
                              View Session
                            </Link>
                          )}
                          {notif.type === 'SESSION_INVITATION' && !notif.link && (
                            <Link
                              to="/sessions"
                              onClick={onClose}
                              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs text-white hover:bg-purple-700"
                            >
                              Open sessions
                            </Link>
                          )}
                          {notif.type === 'GROUP_INVITE' && (
                            <>
                              <button
                                onClick={() => handleGroupInviteAction(notif, true)}
                                disabled={processingInvite === notif.id}
                                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                              >
                                {processingInvite === notif.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3 h-3" />
                                )}
                                Accept
                              </button>
                              <button
                                onClick={() => handleGroupInviteAction(notif, false)}
                                disabled={processingInvite === notif.id}
                                className="rounded-lg bg-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 disabled:opacity-50"
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {notif.isActionable && notif.actionStatus && notif.actionStatus !== 'PENDING' && (
                        <p className={`mt-2 text-xs font-medium ${
                          notif.actionStatus === 'ACCEPTED' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {notif.actionStatus === 'ACCEPTED' ? 'Accepted' : 'Declined'}
                        </p>
                      )}

                      {notif.type === 'SESSION_STARTED' && notif.link && (
                        <div className="mt-3">
                          <Link
                            to={notif.link}
                            onClick={() => {
                              handleMarkAsRead(notif.id);
                              onClose();
                            }}
                            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-green-500/25 animate-pulse hover:from-green-600 hover:to-emerald-700"
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

        <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Review updates here, then jump into the related screen from each notification.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;