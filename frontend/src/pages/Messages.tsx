import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCheck,
  ChevronRight,
  Clock3,
  Inbox,
  MessageSquare,
  RefreshCw,
  Search,
  User,
  Users,
} from 'lucide-react';
import { groupService } from '../api';
import { useAuth } from '../context/AuthContext';
import { StudyGroup } from '../types';
import DirectMessages from './DirectMessages';

interface ChatPreview {
  group: StudyGroup;
  lastMessage?: {
    content: string;
    senderName: string;
    timestamp: string;
    isOwn: boolean;
  };
  unreadCount: number;
}

type ChatFilter = 'all' | 'unread';
type MessageType = 'group' | 'direct';

const Messages: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ChatFilter>('all');
  const [messageType, setMessageType] = useState<MessageType>('group');

  const loadChats = useCallback(async () => {
    const currentUserId = user?.id;

    setIsLoading(true);
    setLoadError(null);

    try {
      const myGroups = await groupService.getMyGroups();
      const previews = await Promise.all(
        myGroups.map(async (group) => {
          try {
            const preview = await groupService.getChatPreview(group.id);

            return {
              group,
              lastMessage: preview.lastMessage
                ? {
                    content: preview.lastMessage.content,
                    senderName:
                      preview.lastMessage.sender?.fullName ||
                      preview.lastMessage.sender?.username ||
                      'Unknown',
                    timestamp: preview.lastMessage.createdAt,
                    isOwn: preview.lastMessage.sender?.id === currentUserId,
                  }
                : undefined,
              unreadCount: preview.unreadCount || 0,
            };
          } catch {
            return {
              group,
              unreadCount: 0,
            };
          }
        })
      );

      previews.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
      });

      setChats(previews);
    } catch (error) {
      console.error('Error loading chats:', error);
      setLoadError('We could not load your group conversations right now.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadChats();
  }, [loadChats]);

  const totalUnread = useMemo(
    () => chats.reduce((sum, chat) => sum + chat.unreadCount, 0),
    [chats]
  );

  const chatsWithActivity = useMemo(
    () => chats.filter((chat) => Boolean(chat.lastMessage)).length,
    [chats]
  );

  const filteredChats = useMemo(() => {
    let filtered = [...chats];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (chat) =>
          chat.group.name.toLowerCase().includes(query) ||
          chat.group.course?.name?.toLowerCase().includes(query) ||
          chat.group.course?.code?.toLowerCase().includes(query)
      );
    }

    if (activeTab === 'unread') {
      filtered = filtered.filter((chat) => chat.unreadCount > 0);
    }

    return filtered;
  }, [activeTab, chats, searchQuery]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    if (diffDays === 1) {
      return 'Yesterday';
    }

    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const truncateMessage = (content: string, maxLength = 72) => {
    if (content.length <= maxLength) return content;
    return `${content.slice(0, maxLength)}...`;
  };

  const renderGroupContent = () => {
    if (isLoading) {
      return (
        <div className="flex-1 overflow-hidden p-4 sm:p-5">
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 animate-pulse"
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gray-200 dark:bg-gray-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-800" />
                    <div className="h-3 w-56 rounded bg-gray-100 dark:bg-gray-800/70" />
                    <div className="h-3 w-28 rounded bg-gray-100 dark:bg-gray-800/70" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (loadError) {
      return (
        <div className="flex-1 p-4 sm:p-6">
          <div className="h-full rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 p-8 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300 flex items-center justify-center mb-4">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Inbox unavailable
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-5">
              {loadError} Please try again to refresh your study group inbox.
            </p>
            <button onClick={() => void loadChats()} className="btn-primary inline-flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (filteredChats.length === 0) {
      const isSearching = searchQuery.trim().length > 0;
      const title = isSearching
        ? 'No chats match that search'
        : activeTab === 'unread'
          ? 'No unread group messages'
          : 'No group conversations yet';
      const description = isSearching
        ? 'Try a course code, group name, or a simpler keyword.'
        : activeTab === 'unread'
          ? 'You are fully caught up across your study groups.'
          : 'Join or create a study group to start collaborating here.';

      return (
        <div className="flex-1 p-4 sm:p-6">
          <div className="h-full rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60 p-8 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-indigo-500 flex items-center justify-center mb-4 shadow-sm">
              <Inbox className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mb-6">{description}</p>
            {!isSearching && activeTab === 'all' && (
              <Link to="/groups" className="btn-primary inline-flex items-center gap-2">
                <Users className="w-4 h-4" />
                Browse study groups
              </Link>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {filteredChats.map((chat) => (
          <button
            key={chat.group.id}
            type="button"
            onClick={() => navigate(`/groups/${chat.group.id}`)}
            className={`w-full text-left rounded-2xl border p-4 transition-all ${
              chat.unreadCount > 0
                ? 'border-indigo-200 bg-indigo-50/70 dark:border-indigo-900/60 dark:bg-indigo-950/20 hover:border-indigo-300'
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center text-lg font-semibold shadow-md shadow-indigo-500/20">
                  {chat.group.name.charAt(0).toUpperCase()}
                </div>
                {chat.unreadCount > 0 && (
                  <div className="absolute -top-2 -right-2 min-w-[1.5rem] h-6 px-1 rounded-full bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center shadow-sm">
                    {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {chat.group.name}
                      </h3>
                      {chat.group.course?.code && (
                        <span className="badge badge-primary">{chat.group.course.code}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {chat.group.members?.length || chat.group.memberCount || 0} members
                    </p>
                  </div>
                  {chat.lastMessage && (
                    <span className={`text-xs font-medium shrink-0 ${chat.unreadCount > 0 ? 'text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}>
                      {formatTime(chat.lastMessage.timestamp)}
                    </span>
                  )}
                </div>

                {chat.lastMessage ? (
                  <div className="flex items-start gap-2 text-sm">
                    {chat.lastMessage.isOwn && (
                      <CheckCheck className="w-4 h-4 mt-0.5 shrink-0 text-sky-500" />
                    )}
                    <p className={`min-w-0 ${chat.unreadCount > 0 ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                      {!chat.lastMessage.isOwn && (
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {chat.lastMessage.senderName}:{' '}
                        </span>
                      )}
                      <span>{truncateMessage(chat.lastMessage.content)}</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    No messages yet. Open the group to start the conversation.
                  </p>
                )}

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="w-3.5 h-3.5" />
                    {chat.lastMessage ? 'Recent activity' : 'Waiting for first post'}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-indigo-600 dark:text-indigo-300">
                    Open group
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-6 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 text-white p-6 md:p-8 shadow-lg">
        <div className="absolute inset-0 opacity-20 bg-noise" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-100 mb-2">Communication hub</p>
            <h1 className="text-3xl md:text-4xl font-semibold mb-3">Messages</h1>
            <p className="text-indigo-100 leading-relaxed max-w-xl">
              Keep group coordination, peer check-ins, and one-to-one follow-ups in one place. Your unread activity stays visible so nothing important slips past.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[22rem]">
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4">
              <p className="text-xs uppercase tracking-wide text-indigo-100/80">Group chats</p>
              <p className="mt-2 text-2xl font-semibold">{chats.length}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4">
              <p className="text-xs uppercase tracking-wide text-indigo-100/80">Unread</p>
              <p className="mt-2 text-2xl font-semibold">{totalUnread}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm p-4 col-span-2 sm:col-span-1">
              <p className="text-xs uppercase tracking-wide text-indigo-100/80">Active threads</p>
              <p className="mt-2 text-2xl font-semibold">{chatsWithActivity}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-3 sm:p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Choose your inbox</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Switch between study group coordination and direct conversations.
            </p>
          </div>
          <div className="inline-flex gap-2 rounded-2xl bg-gray-100 dark:bg-gray-900/70 p-1.5 self-start">
            <button
              type="button"
              onClick={() => setMessageType('group')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                messageType === 'group'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
              }`}
            >
              <Users className="w-4 h-4" />
              Group chats
            </button>
            <button
              type="button"
              onClick={() => setMessageType('direct')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                messageType === 'direct'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
              }`}
            >
              <User className="w-4 h-4" />
              Direct messages
            </button>
          </div>
        </div>
      </div>

      {messageType === 'direct' ? (
        <DirectMessages embedded />
      ) : (
        <div className="card flex-1 min-h-0 overflow-hidden">
          <div className="border-b border-gray-200 dark:border-gray-800 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Study group inbox</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Review the latest group activity, jump into active threads, or catch up on unread posts.
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                {filteredChats.length} visible conversation{filteredChats.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by group name or course code"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="input pl-12"
                />
              </div>

              <div className="inline-flex gap-2 rounded-2xl bg-gray-100 dark:bg-gray-900/70 p-1.5 self-start">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    activeTab === 'all'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
                  }`}
                >
                  All chats
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('unread')}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                    activeTab === 'unread'
                      ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800'
                  }`}
                >
                  Unread
                  {totalUnread > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs ${activeTab === 'unread' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200' : 'bg-indigo-600 text-white'}`}>
                      {totalUnread}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {renderGroupContent()}
        </div>
      )}
    </div>
  );
};

export default Messages;
