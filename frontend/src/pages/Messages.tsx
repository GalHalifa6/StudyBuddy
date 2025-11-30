import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { groupService } from '../api';
import { StudyGroup } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  MessageSquare, 
  Search, 
  Users,
  ChevronRight,
  CheckCheck
} from 'lucide-react';

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

const Messages: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [filteredChats, setFilteredChats] = useState<ChatPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    filterChats();
  }, [searchQuery, activeTab, chats]);

  const loadChats = async () => {
    setIsLoading(true);
    try {
      // Get all groups user is a member of
      const myGroups = await groupService.getMyGroups();
      
      // For each group, get last message and unread count
      const chatPreviews: ChatPreview[] = await Promise.all(
        myGroups.map(async (group) => {
          try {
            // Fetch chat preview for this group
            const response = await fetch(`/api/groups/${group.id}/chat-preview`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            
            if (response.ok) {
              const preview = await response.json();
              return {
                group,
                lastMessage: preview.lastMessage ? {
                  content: preview.lastMessage.content,
                  senderName: preview.lastMessage.sender?.fullName || preview.lastMessage.sender?.username || 'Unknown',
                  timestamp: preview.lastMessage.createdAt,
                  isOwn: preview.lastMessage.sender?.id === user?.id
                } : undefined,
                unreadCount: preview.unreadCount || 0
              };
            }
            
            return { group, unreadCount: 0 };
          } catch {
            // If preview endpoint doesn't exist, return basic info
            return { group, unreadCount: 0 };
          }
        })
      );

      // Sort by last message timestamp (most recent first)
      chatPreviews.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
      });

      setChats(chatPreviews);
      setFilteredChats(chatPreviews);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterChats = () => {
    let filtered = [...chats];
    
    // Filter by search
    if (searchQuery.trim()) {
      filtered = filtered.filter(chat => 
        chat.group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.group.course?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by tab
    if (activeTab === 'unread') {
      filtered = filtered.filter(chat => chat.unreadCount > 0);
    }
    
    setFilteredChats(filtered);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const truncateMessage = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Messages</h1>
          {totalUnread > 0 && (
            <span className="px-3 py-1 bg-primary-500 text-white text-sm font-bold rounded-full">
              {totalUnread} unread
            </span>
          )}
        </div>
        <p className="text-gray-500 dark:text-gray-400">Your group conversations</p>
      </div>

      {/* Search & Tabs */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-12"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All Chats
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'unread'
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Unread
            {totalUnread > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === 'unread' ? 'bg-white/20' : 'bg-primary-500 text-white'
              }`}>
                {totalUnread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Chat List */}
      {filteredChats.length === 0 ? (
        <div className="card p-12 text-center flex-1 flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {searchQuery ? 'No chats found' : activeTab === 'unread' ? 'No unread messages' : 'No conversations yet'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchQuery 
              ? 'Try a different search term'
              : activeTab === 'unread' 
                ? 'You\'re all caught up!'
                : 'Join a study group to start messaging'}
          </p>
          {!searchQuery && activeTab === 'all' && (
            <Link to="/groups" className="btn-primary inline-flex items-center gap-2">
              <Users className="w-4 h-4" />
              Browse Groups
            </Link>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1">
          {filteredChats.map(chat => (
            <div
              key={chat.group.id}
              onClick={() => navigate(`/groups/${chat.group.id}`)}
              className={`card-hover p-4 cursor-pointer flex items-center gap-4 ${
                chat.unreadCount > 0 ? 'bg-primary-50 dark:bg-primary-900/20' : ''
              }`}
            >
              {/* Group Avatar */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                  {chat.group.name.charAt(0)}
                </div>
                {chat.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-semibold truncate ${
                    chat.unreadCount > 0 
                      ? 'text-gray-900 dark:text-white' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {chat.group.name}
                  </h3>
                  {chat.lastMessage && (
                    <span className={`text-xs shrink-0 ml-2 ${
                      chat.unreadCount > 0 
                        ? 'text-primary-600 dark:text-primary-400 font-semibold' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {formatTime(chat.lastMessage.timestamp)}
                    </span>
                  )}
                </div>
                
                {chat.lastMessage ? (
                  <div className="flex items-center gap-2">
                    {chat.lastMessage.isOwn && (
                      <CheckCheck className={`w-4 h-4 shrink-0 ${
                        chat.unreadCount > 0 ? 'text-gray-400' : 'text-blue-500'
                      }`} />
                    )}
                    <p className={`text-sm truncate ${
                      chat.unreadCount > 0 
                        ? 'text-gray-800 dark:text-gray-200 font-medium' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {!chat.lastMessage.isOwn && (
                        <span className="font-medium">{chat.lastMessage.senderName}: </span>
                      )}
                      {truncateMessage(chat.lastMessage.content)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 italic">No messages yet</p>
                )}
                
                {/* Course Badge */}
                {chat.group.course && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                      {chat.group.course.code}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {chat.group.members?.length || chat.group.memberCount || 0} members
                    </span>
                  </div>
                )}
              </div>
              
              <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;
