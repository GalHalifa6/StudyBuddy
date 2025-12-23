import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { groupService, messageService, fileService, calendarService } from '../api';
import { StudyGroup, Message, FileUpload, Event, EventType, CreateEventRequest, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { Client, IMessage } from '@stomp/stompjs';
// @ts-expect-error - SockJS types are not available
import SockJS from 'sockjs-client/dist/sockjs';
import {
  Search,
  Users,
  CheckCheck,
  Loader2,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Phone,
  Video,
  Check,
  File as FileIcon,
  Calendar,
  Download,
  UserPlus,
  Crown,
  Shield,
  MessageSquare,
  FolderOpen,
  CalendarDays,
  Wifi,
  WifiOff,
  X,
  Plus,
  MapPin,
  Clock,
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

const MyGroups: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'files' | 'schedule'>('chat');
  const [groupFiles, setGroupFiles] = useState<FileUpload[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  
  // Calendar state
  const [events, setEvents] = useState<Event[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CreateEventRequest>>({
    title: '',
    description: '',
    eventType: 'STUDY_SESSION' as EventType,
    startDateTime: '',
    endDateTime: '',
    location: '',
    meetingLink: '',
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const wsClientRef = useRef<Client | null>(null);
  const subscribedGroupsRef = useRef<Set<number>>(new Set());
  const subscriptionsRef = useRef<Map<number, any>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  // WebSocket handler for real-time messages - use ref to avoid recreating subscriptions
  const handleNewMessageRef = useRef((message: Message) => {
    // Only update messages list if it's for the currently selected group
    const currentSelectedId = selectedGroupId;
    if (message.group?.id === currentSelectedId) {
      setMessages((prevMessages) => {
        // Check if message already exists to avoid duplicates
        const exists = prevMessages.some((m) => m.id === message.id);
        if (exists) {
          return prevMessages;
        }
        return [...prevMessages, message];
      });
    }

    // Always update chat preview for any group message
    setChats((prevChats) => {
      return prevChats.map((chat) => {
        if (chat.group.id === message.group?.id) {
          return {
            ...chat,
            lastMessage: {
              content: message.content,
              senderName: message.sender?.fullName || message.sender?.username || 'Unknown',
              timestamp: message.createdAt,
              isOwn: message.sender?.id === user?.id
            }
          };
        }
        return chat;
      }).sort((a, b) => {
        // Re-sort chats by last message time after update
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
      });
    });
  });

  // Keep the ref updated with current selectedGroupId and user
  useEffect(() => {
    handleNewMessageRef.current = (message: Message) => {
      const isForCurrentGroup = message.group?.id === selectedGroupId;
      const isOwnMessage = message.sender?.id === user?.id;
      
      // Update messages list if it's for the currently selected group
      if (isForCurrentGroup) {
        setMessages((prevMessages) => {
          const exists = prevMessages.some((m) => m.id === message.id);
          if (exists) return prevMessages;
          return [...prevMessages, message];
        });
      }

      // Update chat preview for any group message
      setChats((prevChats) => {
        return prevChats.map((chat) => {
          if (chat.group.id === message.group?.id) {
            return {
              ...chat,
              lastMessage: {
                content: message.content,
                senderName: message.sender?.fullName || message.sender?.username || 'Unknown',
                timestamp: message.createdAt,
                isOwn: isOwnMessage
              },
              // Increment unread count if not viewing this chat and not own message
              unreadCount: (!isForCurrentGroup && !isOwnMessage) 
                ? chat.unreadCount + 1 
                : chat.unreadCount
            };
          }
          return chat;
        }).sort((a, b) => {
          if (!a.lastMessage && !b.lastMessage) return 0;
          if (!a.lastMessage) return 1;
          if (!b.lastMessage) return -1;
          return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
        });
      });
    };
  }, [selectedGroupId, user?.id]);

  // Initialize WebSocket connection once on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      debug: (str) => {
        console.log('STOMP Debug:', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('WebSocket connected for My Groups!');
        setIsConnected(true);
      },
      onDisconnect: () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        setIsConnected(false);
      },
      onWebSocketError: (event) => {
        console.error('WebSocket error:', event);
        setIsConnected(false);
      },
    });

    wsClientRef.current = client;
    client.activate();

    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.deactivate();
        wsClientRef.current = null;
        setIsConnected(false);
      }
      subscribedGroupsRef.current.clear();
      subscriptionsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Subscribe to new groups as chats are loaded or updated
  useEffect(() => {
    if (!wsClientRef.current || !isConnected) return;

    const currentGroupIds = new Set(chats.map(chat => chat.group.id));
    
    // Subscribe to new groups
    chats.forEach((chat) => {
      if (!subscribedGroupsRef.current.has(chat.group.id)) {
        const subscription = wsClientRef.current!.subscribe(
          `/topic/group/${chat.group.id}`,
          (message: IMessage) => {
            try {
              const parsedMessage = JSON.parse(message.body);
              handleNewMessageRef.current(parsedMessage);
            } catch (error) {
              console.error('Error parsing message:', error);
            }
          }
        );
        subscribedGroupsRef.current.add(chat.group.id);
        subscriptionsRef.current.set(chat.group.id, subscription);
        console.log('Subscribed to group', chat.group.id);
      }
    });

    // Unsubscribe from groups user is no longer in
    subscribedGroupsRef.current.forEach((groupId) => {
      if (!currentGroupIds.has(groupId)) {
        const subscription = subscriptionsRef.current.get(groupId);
        if (subscription) {
          subscription.unsubscribe();
          subscriptionsRef.current.delete(groupId);
        }
        subscribedGroupsRef.current.delete(groupId);
        console.log('Unsubscribed from group', groupId);
      }
    });
  }, [chats, isConnected]); // Re-run when connection state or chats change

  // Load all user's groups
  const loadChats = useCallback(async () => {
    setIsLoading(true);
    try {
      const myGroups = await groupService.getMyGroups();
      
      const chatPreviews: ChatPreview[] = await Promise.all(
        myGroups.map(async (group) => {
          try {
            const messages = await messageService.getGroupMessages(group.id);
            const lastMsg = messages[messages.length - 1];
            
            return {
              group,
              lastMessage: lastMsg ? {
                content: lastMsg.content,
                senderName: lastMsg.sender?.fullName || lastMsg.sender?.username || 'Unknown',
                timestamp: lastMsg.createdAt,
                isOwn: lastMsg.sender?.id === user?.id
              } : undefined,
              unreadCount: 0 // TODO: Implement unread tracking
            };
          } catch {
            return { group, unreadCount: 0 };
          }
        })
      );

      chatPreviews.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
      });

      setChats(chatPreviews);

      // Auto-select first group or from URL (only on initial load)
      if (!selectedGroupId) {
        const groupIdFromUrl = searchParams.get('group');
        if (groupIdFromUrl) {
          setSelectedGroupId(parseInt(groupIdFromUrl));
        } else if (chatPreviews.length > 0) {
          setSelectedGroupId(chatPreviews[0].group.id);
        }
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load messages for selected group
  const loadMessages = useCallback(async (groupId: number) => {
    try {
      const msgs = await messageService.getGroupMessages(groupId);
      setMessages(msgs);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (selectedGroupId) {
      loadMessages(selectedGroupId);
      setSearchParams({ group: selectedGroupId.toString() }, { replace: true });
      
      // Clear unread count for selected group
      setChats((prevChats) => 
        prevChats.map((chat) => 
          chat.group.id === selectedGroupId 
            ? { ...chat, unreadCount: 0 }
            : chat
        )
      );
    }
  }, [selectedGroupId, loadMessages, setSearchParams]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load files when tab changes to files or when group changes
  useEffect(() => {
    if (activeTab === 'files' && selectedGroupId) {
      loadGroupFiles(selectedGroupId);
    }
  }, [activeTab, selectedGroupId]);

  useEffect(() => {
    if (activeTab === 'schedule' && selectedGroupId) {
      loadGroupEvents(selectedGroupId);
    }
  }, [activeTab, selectedGroupId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadGroupFiles = async (groupId: number) => {
    setIsLoadingFiles(true);
    try {
      const files = await fileService.getGroupFiles(groupId);
      setGroupFiles(files);
    } catch (error) {
      console.error('Error loading group files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const loadGroupEvents = async (groupId: number) => {
    try {
      const eventsData = await calendarService.getGroupEvents(groupId);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error loading group events:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !selectedGroupId) return;
    
    const file = e.target.files[0];
    try {
      await fileService.uploadFile(selectedGroupId, file);
      await loadGroupFiles(selectedGroupId);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    }
  };

  const handleFileDownload = async (fileId: number, filename: string) => {
    try {
      const blob = await fileService.downloadFile(fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
    }
    if ((!newMessage.trim() && !attachedFile) || !selectedGroupId || isSending) return;

    setIsSending(true);
    try {
      let fileId: number | undefined;
      
      // Upload file first if attached
      if (attachedFile) {
        const uploadedFile = await fileService.uploadFile(selectedGroupId, attachedFile);
        fileId = uploadedFile.id;
      }
      
      // Send message with optional file attachment
      const sentMessage = await messageService.sendMessage(selectedGroupId, {
        content: newMessage.trim() || (attachedFile ? `Sent ${attachedFile.name}` : ''),
        messageType: attachedFile ? 'FILE' : 'TEXT',
        fileId
      });
      
      // Clear input and file attachment
      setNewMessage('');
      setAttachedFile(null);
      setFilePreviewUrl(null);
      
      // WebSocket will handle adding the message, but in case of delay or WebSocket issue,
      // add it locally (handleNewMessageRef will prevent duplicates)
      if (sentMessage) {
        handleNewMessageRef.current(sentMessage);
      }
      
      messageInputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviewUrl(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setFilePreviewUrl(null);
      }
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
    setFilePreviewUrl(null);
    if (chatFileInputRef.current) {
      chatFileInputRef.current.value = '';
    }
  };

  const handleDownloadFile = async (fileId: number, filename: string) => {
    try {
      const blob = await fileService.downloadFile(fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  };

  const getAuthenticatedImageUrl = (fileId: number): string => {
    const token = localStorage.getItem('token');
    return `http://localhost:8080/api/files/${fileId}/download?token=${token}`;
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString(undefined, { weekday: 'short' });
    } else {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  const getEventTypeColor = (eventType: EventType) => {
    switch (eventType) {
      case 'STUDY_SESSION':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300';
      case 'MEETING':
        return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300';
      case 'EXAM':
        return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300';
      case 'ASSIGNMENT_DUE':
        return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300';
      case 'PROJECT_DEADLINE':
        return 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300';
      case 'PRESENTATION':
        return 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300';
      case 'REVIEW_SESSION':
        return 'bg-teal-100 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300';
      case 'OTHER':
        return 'bg-gray-100 dark:bg-gray-700/30 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700/30 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300';
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedChat = chats.find(chat => chat.group.id === selectedGroupId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-600 rounded-3xl text-white p-8 shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 bg-noise" />
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-100 mb-2">
                <MessageSquare className="h-5 w-5" />
                <span className="text-sm uppercase tracking-[0.2em]">Collaborate</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-semibold mb-3">
                My Group Chats
              </h1>
              <p className="text-indigo-100 max-w-2xl leading-relaxed">
                Stay connected with your study groups. Send messages, share files, and collaborate in real-time with your peers.
              </p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl">
              <div className="flex items-center gap-3 mb-3">
                <Users className="h-8 w-8 text-indigo-100" />
                <div>
                  <p className="text-xs uppercase tracking-wide text-indigo-100/80">Active</p>
                  <p className="text-lg font-semibold">Your Groups</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-indigo-100/90">
                <div>
                  <p className="text-2xl font-semibold leading-none">{chats.length}</p>
                  <p className="mt-1">Total groups</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold leading-none">{chats.filter(c => c.unreadCount > 0).length}</p>
                  <p className="mt-1">Unread chats</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-32 w-96 h-96 bg-gradient-to-br from-indigo-400/40 to-purple-400/40 blur-3xl rounded-full" />
      </div>

      {/* Chat Interface */}
      <div className="flex h-[calc(100vh-20rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Groups Sidebar */}
        <div className="w-96 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900 flex-shrink-0">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Conversations</h2>
            <button className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Groups List */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery ? 'No groups found' : 'You are not in any groups yet'}
              </p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <button
                key={chat.group.id}
                onClick={() => setSelectedGroupId(chat.group.id)}
                className={`w-full p-4 flex items-start gap-3 transition-colors ${
                  selectedGroupId === chat.group.id 
                    ? 'bg-gray-200 dark:bg-gray-700' 
                    : chat.unreadCount > 0
                      ? 'bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 dark:hover:bg-indigo-950/30'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {chat.group.name.substring(0, 2).toUpperCase()}
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{chat.unreadCount > 9 ? '9+' : chat.unreadCount}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`truncate ${
                      chat.unreadCount > 0 
                        ? 'font-bold text-gray-900 dark:text-white' 
                        : 'font-semibold text-gray-900 dark:text-white'
                    }`}>
                      {chat.group.name}
                    </h3>
                    {chat.lastMessage && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                        {formatTime(chat.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${
                      chat.unreadCount > 0 
                        ? 'font-semibold text-gray-900 dark:text-white' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {chat.lastMessage ? (
                        <>
                          {chat.lastMessage.isOwn && (
                            <CheckCheck className="w-4 h-4 inline mr-1 text-blue-500" />
                          )}
                          {chat.lastMessage.isOwn ? 'You: ' : `${chat.lastMessage.senderName}: `}
                          {chat.lastMessage.content}
                        </>
                      ) : (
                        <span className="text-gray-400 italic">No messages yet</span>
                      )}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="flex-shrink-0 ml-2 bg-indigo-600 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedGroupId && selectedChat ? (
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900">
          {/* Chat Header */}
          <div className="h-18 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-semibold shadow-lg">
                {selectedChat.group.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  {selectedChat.group.name}
                  {isConnected ? (
                    <span className="flex items-center gap-1 text-xs font-normal text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full" title="Connected">
                      <Wifi className="w-3 h-3" />
                      Live
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-normal text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full" title="Disconnected">
                      <WifiOff className="w-3 h-3" />
                      Offline
                    </span>
                  )}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {selectedChat.group.members?.length || 0} members
                  {selectedChat.group.course && (
                    <>
                      <span className="mx-1">•</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-medium">{selectedChat.group.course.code}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Video call">
                <Video className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Voice call">
                <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex px-6">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'chat'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'members'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <Users className="w-4 h-4" />
                Members ({selectedChat.group.members?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'files'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <FolderOpen className="w-4 h-4" />
                Files
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
                  activeTab === 'schedule'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                Schedule
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'chat' && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white dark:bg-gray-900">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Users className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No messages yet. Start the conversation!
                    </p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwn = message.sender?.id === user?.id;
                    const showAvatar = index === 0 || messages[index - 1].sender?.id !== message.sender?.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {!isOwn && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                            {showAvatar ? (message.sender?.fullName || message.sender?.username || '?').substring(0, 2).toUpperCase() : ''}
                          </div>
                        )}
                        <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                          {!isOwn && showAvatar && (
                            <span className="text-xs text-gray-600 dark:text-gray-400 px-3">
                              {message.sender?.fullName || message.sender?.username}
                            </span>
                          )}
                          <div
                            className={`rounded-2xl ${
                              isOwn
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                            } ${message.attachedFile ? 'p-2' : 'px-4 py-2'}`}
                          >
                            {/* File/Image Attachment */}
                            {message.attachedFile && (
                              <div className="mb-2">
                                {message.attachedFile.fileType?.startsWith('image/') ? (
                                  <img
                                    src={getAuthenticatedImageUrl(message.attachedFile.id)}
                                    alt={message.attachedFile.filename}
                                    className="max-w-sm rounded-lg cursor-pointer hover:opacity-90 transition"
                                    onClick={() => handleDownloadFile(message.attachedFile!.id, message.attachedFile!.filename)}
                                  />
                                ) : (
                                  <button
                                    onClick={() => handleDownloadFile(message.attachedFile!.id, message.attachedFile!.filename)}
                                    className={`flex items-center gap-3 p-3 rounded-lg w-full text-left ${
                                      isOwn 
                                        ? 'bg-indigo-500 hover:bg-indigo-400' 
                                        : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500'
                                    } transition`}
                                  >
                                    <div className={`p-2 rounded ${isOwn ? 'bg-indigo-400' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                      <FileIcon className={`w-6 h-6 ${isOwn ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{message.attachedFile.filename}</p>
                                      <p className={`text-xs ${isOwn ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {(message.attachedFile.fileSize / 1024).toFixed(1)} KB
                                      </p>
                                    </div>
                                    <Download className={`w-4 h-4 ${isOwn ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
                                  </button>
                                )}
                              </div>
                            )}
                            
                            {/* Message Text */}
                            {message.content && (
                              message.messageType === 'event' && message.event ? (
                                <button
                                  onClick={() => {
                                    setSelectedEvent(message.event!);
                                    setShowEventModal(true);
                                  }}
                                  className={`break-words ${message.attachedFile ? 'px-2' : ''} w-full text-left hover:underline flex items-center gap-2`}
                                >
                                  <Calendar className="w-4 h-4 flex-shrink-0" />
                                  {message.content}
                                </button>
                              ) : (
                                <p className={`break-words ${message.attachedFile ? 'px-2' : ''}`}>{message.content}</p>
                              )
                            )}
                            
                            <span className={`text-xs opacity-70 mt-1 block ${message.attachedFile ? 'px-2 pb-1' : ''}`}>
                              {formatMessageTime(message.createdAt)}
                              {isOwn && <Check className="w-3 h-3 inline ml-1" />}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 px-3 invisible">
                            {formatMessageTime(message.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-100 dark:bg-gray-800">
                {/* File Preview */}
                {attachedFile && (
                  <div className="mb-3 p-3 bg-white dark:bg-gray-900 rounded-lg flex items-center gap-3 border border-gray-200 dark:border-gray-700">
                    {filePreviewUrl ? (
                      <img 
                        src={filePreviewUrl} 
                        alt="Preview" 
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                        <FileIcon className="w-8 h-8 text-gray-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {attachedFile.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(attachedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <Smile className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                  <input
                    ref={chatFileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    className="hidden"
                    accept="image/*,application/pdf,.doc,.docx,.txt"
                  />
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                  >
                    <Paperclip className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </button>
                  <div className="flex-1 relative">
                    <textarea
                      ref={messageInputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder="Type a message..."
                      rows={1}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-gray-900 dark:text-white"
                      style={{ maxHeight: '120px' }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={(!newMessage.trim() && !attachedFile) || isSending}
                    className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-full transition-colors disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </form>
              </div>
            </>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Group Members
                  </h3>
                  <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                    <UserPlus className="w-4 h-4" />
                    Add Member
                  </button>
                </div>

                <div className="space-y-2">
                  {selectedChat.group.members?.map((member: User, index: number) => (
                    <div
                      key={member.id || index}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 transition"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                          {(member.fullName || member.username || 'U').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {member.fullName || member.username}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {member.email || `@${member.username}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.role === 'ADMIN' && (
                          <span className="flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-medium">
                            <Crown className="w-3 h-3" />
                            Admin
                          </span>
                        )}
                        {member.role === 'MODERATOR' && (
                          <span className="flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-medium">
                            <Shield className="w-3 h-3" />
                            Moderator
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-gray-900">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Shared Files
                  </h3>
                  <div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      <Paperclip className="w-4 h-4" />
                      Upload File
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {isLoadingFiles ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  </div>
                ) : groupFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <FolderOpen className="w-16 h-16 text-gray-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No files shared yet</p>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      Upload first file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {groupFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-750 transition group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                            <FileIcon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {file.originalFilename}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {fileService.formatFileSize(file.fileSize)} • {new Date(file.uploadedAt).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Uploaded by {file.uploader.fullName || file.uploader.username}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleFileDownload(file.id, file.originalFilename)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition opacity-0 group-hover:opacity-100"
                        >
                          <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 flex flex-col">
              {/* Header with Create Event button */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Group Events</h3>
                <button
                  onClick={() => {
                    setSelectedEvent(null);
                    setNewEvent({
                      title: '',
                      description: '',
                      eventType: 'STUDY_SESSION',
                      startDateTime: '',
                      endDateTime: '',
                      location: '',
                      meetingLink: '',
                    });
                    setShowEventModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Event
                </button>
              </div>

              {/* Events List */}
              <div className="flex-1 overflow-y-auto p-6">
                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                      <Calendar className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No events yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Create an event to get started!</p>
                    <button
                      onClick={() => {
                        setSelectedEvent(null);
                        setNewEvent({
                          title: '',
                          description: '',
                          eventType: 'STUDY_SESSION',
                          startDateTime: '',
                          endDateTime: '',
                          location: '',
                          meetingLink: '',
                        });
                        setShowEventModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                      <Plus className="w-4 h-4" />
                      Create First Event
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events
                      .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
                      .map((event) => {
                        const startDate = new Date(event.startDateTime);
                        const endDate = event.endDateTime ? new Date(event.endDateTime) : null;
                        const isPast = startDate < new Date();
                        
                        return (
                          <div
                            key={event.id}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                              isPast
                                ? 'opacity-60 ' + getEventTypeColor(event.eventType)
                                : getEventTypeColor(event.eventType)
                            }`}
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowEventModal(true);
                            }}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold">{event.title}</h4>
                                <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full font-medium ${getEventTypeColor(event.eventType)}`}>
                                  {event.eventType.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mt-3">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {startDate.toLocaleDateString()} at {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {endDate && ` - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                </span>
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                              {event.meetingLink && (
                                <div className="flex items-center gap-2">
                                  <Video className="w-4 h-4" />
                                  <a
                                    href={event.meetingLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Join Meeting
                                  </a>
                                </div>
                              )}
                            </div>
                            
                            {event.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">{event.description}</p>
                            )}
                            
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                              Created by {event.creatorName}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center px-6">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Select a Conversation
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md">
              Choose a group from the sidebar to view messages, share files, and collaborate with your study partners.
            </p>
          </div>
        </div>
      )}
      </div>

      {/* Event Modal */}
      {showEventModal && selectedGroupId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {selectedEvent ? 'Event Details' : 'Create Event'}
              </h2>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setSelectedEvent(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {selectedEvent ? (
              /* View Event */
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedEvent.title}</h3>
                  <span className="inline-block px-3 py-1 text-sm rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400">
                    {selectedEvent.eventType.replace(/_/g, ' ')}
                  </span>
                </div>

                {selectedEvent.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <p className="text-gray-600 dark:text-gray-400">{selectedEvent.description}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date & Time</label>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Clock className="w-5 h-5" />
                    <span>
                      {new Date(selectedEvent.startDateTime).toLocaleDateString()} at{' '}
                      {new Date(selectedEvent.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {selectedEvent.endDateTime && (
                        <> - {new Date(selectedEvent.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                      )}
                    </span>
                  </div>
                </div>

                {selectedEvent.location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="w-5 h-5" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  </div>
                )}

                {selectedEvent.meetingLink && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meeting Link</label>
                    <div className="flex items-center gap-2">
                      <Video className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <a
                        href={selectedEvent.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {selectedEvent.meetingLink}
                      </a>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Created by {selectedEvent.creatorName} on{' '}
                    {new Date(selectedEvent.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {selectedEvent.creatorId === user?.id && (
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this event?')) {
                          try {
                            await calendarService.deleteEvent(selectedEvent.id);
                            setEvents((prev) => prev.filter((e) => e.id !== selectedEvent.id));
                            setShowEventModal(false);
                            setSelectedEvent(null);
                          } catch (error) {
                            console.error('Error deleting event:', error);
                            alert('Failed to delete event');
                          }
                        }
                      }}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                    >
                      Delete Event
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Create Event Form */
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newEvent.title || !newEvent.startDateTime || !selectedGroupId) return;

                  setIsCreatingEvent(true);
                  try {
                    const eventData: CreateEventRequest = {
                      title: newEvent.title,
                      description: newEvent.description || undefined,
                      eventType: newEvent.eventType as EventType,
                      startDateTime: newEvent.startDateTime,
                      endDateTime: newEvent.endDateTime || undefined,
                      location: newEvent.location || undefined,
                      meetingLink: newEvent.meetingLink || undefined,
                      groupId: selectedGroupId,
                    };

                    const createdEvent = await calendarService.createEvent(eventData);
                    setEvents((prev) => [...prev, createdEvent]);
                    setShowEventModal(false);
                    setNewEvent({
                      title: '',
                      description: '',
                      eventType: 'STUDY_SESSION',
                      startDateTime: '',
                      endDateTime: '',
                      location: '',
                      meetingLink: '',
                    });
                  } catch (error: unknown) {
                    console.error('Error creating event:', error);
                    let errorMsg = 'Failed to create event';
                    if (error && typeof error === 'object' && 'response' in error) {
                      const axiosError = error as { response?: { data?: unknown } };
                      if (axiosError.response?.data) {
                        if (typeof axiosError.response.data === 'string') {
                          errorMsg = axiosError.response.data;
                        } else if (typeof axiosError.response.data === 'object' && axiosError.response.data !== null && 'message' in axiosError.response.data) {
                          errorMsg = String((axiosError.response.data as { message: unknown }).message);
                        } else {
                          errorMsg = JSON.stringify(axiosError.response.data);
                        }
                      }
                    }
                    alert('Error creating event: ' + errorMsg);
                  } finally {
                    setIsCreatingEvent(false);
                  }
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Title *</label>
                  <input
                    type="text"
                    value={newEvent.title || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., Midterm Study Session"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Type *</label>
                  <select
                    value={newEvent.eventType || 'STUDY_SESSION'}
                    onChange={(e) => setNewEvent({ ...newEvent, eventType: e.target.value as EventType })}
                    className="input w-full"
                    required
                  >
                    <option value="STUDY_SESSION">Study Session</option>
                    <option value="MEETING">Meeting</option>
                    <option value="EXAM">Exam</option>
                    <option value="ASSIGNMENT_DUE">Assignment Due</option>
                    <option value="PROJECT_DEADLINE">Project Deadline</option>
                    <option value="PRESENTATION">Presentation</option>
                    <option value="REVIEW_SESSION">Review Session</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={newEvent.startDateTime || ''}
                      onChange={(e) => setNewEvent({ ...newEvent, startDateTime: e.target.value })}
                      className="input w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={newEvent.endDateTime || ''}
                      onChange={(e) => setNewEvent({ ...newEvent, endDateTime: e.target.value })}
                      className="input w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    value={newEvent.description || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="input w-full min-h-[100px] resize-none"
                    placeholder="What's this event about?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                  <input
                    type="text"
                    value={newEvent.location || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., Library Room 203"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meeting Link (optional)</label>
                  <input
                    type="text"
                    value={newEvent.meetingLink || ''}
                    onChange={(e) => setNewEvent({ ...newEvent, meetingLink: e.target.value })}
                    className="input w-full"
                    placeholder="e.g., https://zoom.us/j/..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEventModal(false);
                      setNewEvent({
                        title: '',
                        description: '',
                        eventType: 'STUDY_SESSION',
                        startDateTime: '',
                        endDateTime: '',
                        location: '',
                        meetingLink: '',
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingEvent || !newEvent.title || !newEvent.startDateTime}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingEvent ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Calendar className="w-5 h-5" />
                        Create Event
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MyGroups;
