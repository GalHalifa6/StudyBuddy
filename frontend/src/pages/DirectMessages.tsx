import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Inbox,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  Conversation,
  DirectMessage,
  SendDirectMessageRequest,
  directMessageService,
} from '../api/directMessages';

interface DirectMessagesProps {
  selectedConversationId?: number | null;
  onBack?: () => void;
  embedded?: boolean;
}

const DirectMessages: React.FC<DirectMessagesProps> = ({
  selectedConversationId: initialSelectedId,
  onBack,
  embedded = false,
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setConversationsError(null);

    try {
      const data = await directMessageService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversationsError('We could not load your direct conversations right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: number) => {
    setMessagesLoading(true);
    setMessagesError(null);

    try {
      const data = await directMessageService.getMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessagesError('This conversation could not be loaded.');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const handleSelectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMessages([]);
    setMessagesError(null);
    setSendError(null);
    setNewMessage('');
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!initialSelectedId || conversations.length === 0) {
      return;
    }

    const matchingConversation = conversations.find((conversation) => conversation.id === initialSelectedId);
    if (matchingConversation && matchingConversation.id !== selectedConversation?.id) {
      handleSelectConversation(matchingConversation);
    }
  }, [conversations, handleSelectConversation, initialSelectedId, selectedConversation?.id]);

  useEffect(() => {
    if (!selectedConversation) {
      return;
    }

    const conversationId = selectedConversation.id;

    void loadMessages(conversationId);
    void directMessageService.markAsRead(conversationId)
      .then(() => {
        setConversations((previous) =>
          previous.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, unreadCount: 0 }
              : conversation
          )
        );
      })
      .catch((error) => {
        console.error('Failed to mark conversation as read:', error);
      });
  }, [loadMessages, selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleBackToList = () => {
    setSelectedConversation(null);
    setMessages([]);
    setMessagesError(null);
    setSendError(null);
    onBack?.();
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || sending) {
      return;
    }

    setSending(true);
    setSendError(null);

    try {
      const payload: SendDirectMessageRequest = {
        content: newMessage.trim(),
        messageType: 'text',
      };
      const sentMessage = await directMessageService.sendMessage(selectedConversation.id, payload);
      setMessages((previous) => [...previous, sentMessage]);
      setNewMessage('');
      setConversations((previous) => {
        const existing = previous.find((conversation) => conversation.id === selectedConversation.id);
        if (!existing) {
          return previous;
        }

        const updatedConversation: Conversation = {
          ...existing,
          lastMessageAt: sentMessage.createdAt,
          lastMessagePreview: sentMessage.content,
          unreadCount: 0,
        };

        return [
          updatedConversation,
          ...previous.filter((conversation) => conversation.id !== selectedConversation.id),
        ];
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setSendError('Your message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return conversations;
    }

    return conversations.filter((conversation) => {
      const fullName = conversation.otherUser.fullName?.toLowerCase() || '';
      const username = conversation.otherUser.username.toLowerCase();
      return fullName.includes(query) || username.includes(query);
    });
  }, [conversations, searchQuery]);

  const conversationCountLabel = `${conversations.length} conversation${conversations.length === 1 ? '' : 's'}`;

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

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getConversationName = (conversation: Conversation) =>
    conversation.otherUser.fullName || conversation.otherUser.username;

  const renderConversationsList = () => {
    if (loading) {
      return (
        <div className="p-3 space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gray-200 dark:bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
                  <div className="h-3 w-40 rounded bg-gray-100 dark:bg-gray-800/70" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (conversationsError) {
      return (
        <div className="p-4">
          <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">Unable to load conversations</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{conversationsError}</p>
                <button
                  type="button"
                  onClick={() => void loadConversations()}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (filteredConversations.length === 0) {
      const isSearching = searchQuery.trim().length > 0;
      return (
        <div className="p-4 h-full">
          <div className="h-full rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/60 p-6 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-indigo-500 flex items-center justify-center mb-4 shadow-sm">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {isSearching ? 'No direct messages match that search' : 'No direct conversations yet'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
              {isSearching
                ? 'Try searching by full name or username.'
                : 'When you message a classmate or expert, the conversation will show up here.'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-3 space-y-2 overflow-y-auto">
        {filteredConversations.map((conversation) => {
          const isSelected = selectedConversation?.id === conversation.id;
          return (
            <button
              key={conversation.id}
              type="button"
              onClick={() => handleSelectConversation(conversation)}
              className={`w-full text-left rounded-2xl border p-4 transition-all ${
                isSelected
                  ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/30 shadow-sm'
                  : conversation.unreadCount > 0
                    ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-950/20 hover:border-emerald-300'
                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white font-semibold flex items-center justify-center shadow-md shadow-indigo-500/20">
                    {getConversationName(conversation).charAt(0).toUpperCase()}
                  </div>
                  {conversation.unreadCount > 0 && (
                    <div className="absolute -top-2 -right-2 min-w-[1.35rem] h-5 px-1 rounded-full bg-emerald-500 text-white text-[11px] font-semibold flex items-center justify-center">
                      {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {getConversationName(conversation)}
                    </h3>
                    {conversation.lastMessageAt && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                        {formatTime(conversation.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    @{conversation.otherUser.username}
                  </p>
                  <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    {conversation.lastMessagePreview || 'No messages yet'}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  const renderChatPanel = () => {
    if (!selectedConversation) {
      return (
        <div className="hidden lg:flex flex-1 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50 items-center justify-center p-8 text-center">
          <div className="max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-sm">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Select a conversation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose a direct message thread to read recent replies or send a quick follow-up.
            </p>
          </div>
        </div>
      );
    }

    const participantName = getConversationName(selectedConversation);

    return (
      <div className="flex flex-col flex-1 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden min-h-0 shadow-sm">
        <div className="border-b border-gray-200 dark:border-gray-800 p-4 sm:p-5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToList}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              aria-label="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white font-semibold flex items-center justify-center shadow-md shadow-indigo-500/20">
              {participantName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{participantName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{selectedConversation.otherUser.username}</p>
            </div>
          </div>
        </div>

        {messagesError && (
          <div className="px-4 sm:px-5 pt-4">
            <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{messagesError}</span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4 bg-gray-50/70 dark:bg-gray-950/20 min-h-0">
          {messagesLoading ? (
            <div className="space-y-3 animate-pulse">
              {[0, 1, 2].map((item) => (
                <div key={item} className={`flex ${item % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                  <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-gray-200 dark:bg-gray-800 h-14 w-56" />
                </div>
              ))}
            </div>
          ) : messages.length > 0 ? (
            messages.map((message) => {
              const isOwn = message.sender.id === user?.id;
              return (
                <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${isOwn ? 'order-2' : 'order-1'}`}>
                    {!isOwn && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 px-2">
                        {message.sender.fullName || message.sender.username}
                      </p>
                    )}
                    <div className={`px-4 py-3 rounded-2xl shadow-sm ${isOwn ? 'bg-indigo-600 text-white rounded-br-md' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-700'}`}>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      <p className={`text-xs mt-2 ${isOwn ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {formatTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No messages yet</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Start the conversation with a quick question, follow-up, or study check-in.
                </p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 p-4 sm:p-5 bg-white dark:bg-gray-900">
          {sendError && (
            <div className="mb-3 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{sendError}</span>
            </div>
          )}
          <div className="flex gap-2 sm:gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleSendMessage();
                }
              }}
              placeholder="Type a message"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={() => void handleSendMessage()}
              disabled={!newMessage.trim() || sending}
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 text-white px-5 py-3 hover:bg-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`${embedded ? 'flex-1 min-h-0' : 'h-[calc(100vh-120px)] flex flex-col gap-6 animate-fade-in'}`}>
      {!embedded && (
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Direct Messages</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Reach classmates and experts without leaving StudyBuddy.
          </p>
        </div>
      )}

      <div className={`${embedded ? 'h-full' : 'flex-1 min-h-0'} grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]`}>
        <div className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} min-h-0`}>
          <div className="flex flex-col flex-1 rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm min-h-0">
            <div className="border-b border-gray-200 dark:border-gray-800 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Direct messages</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    One-to-one conversations with peers and experts.
                  </p>
                </div>
                <span className="badge badge-primary whitespace-nowrap">{conversationCountLabel}</span>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or username"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="input pl-12"
                />
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">{renderConversationsList()}</div>
          </div>
        </div>

        <div className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} min-h-0`}>
          {renderChatPanel()}
        </div>
      </div>
    </div>
  );
};

export default DirectMessages;
