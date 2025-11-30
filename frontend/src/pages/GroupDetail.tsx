import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { groupService, messageService, fileService } from '../api';
import { StudyGroup, Message, FileUpload, GroupMemberStatus, GroupMemberRequest } from '../types';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  ArrowLeft,
  Users,
  Send,
  Loader2,
  MessageSquare,
  LogOut,
  Wifi,
  WifiOff,
  FolderOpen,
  Upload,
  Download,
  Trash2,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  File,
  Eye,
  X,
  Pin,
  Paperclip,
  MoreVertical,
  Lock,
  UserPlus,
  Search,
  Check,
  XCircle,
  Clock,
  Shield,
} from 'lucide-react';

const GroupDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  
  const [group, setGroup] = useState<StudyGroup | null>(null);
  const [memberStatus, setMemberStatus] = useState<GroupMemberStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'members' | 'files' | 'requests'>('chat');
  
  // File management state
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<FileUpload | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const newMessageRef = useRef<string>('');
  
  // Message context menu state
  const [contextMenu, setContextMenu] = useState<{ messageId: number; x: number; y: number } | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: number; fullName: string; email: string; username: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<GroupMemberRequest[]>([]);

  // WebSocket handler for real-time messages
  const handleNewMessage = useCallback((message: Message) => {
    setMessages((prevMessages) => {
      // Check if message already exists to avoid duplicates
      const exists = prevMessages.some((m) => m.id === message.id);
      if (exists) {
        return prevMessages;
      }
      return [...prevMessages, message];
    });
  }, []);

  // Connect to WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    groupId: parseInt(id || '0'),
    onMessage: handleNewMessage,
  });

  useEffect(() => {
    if (id) {
      fetchGroupData();
    }
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToMessage = (messageId: number) => {
    // Clear any existing timeout first, regardless of whether element exists
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }
    
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message briefly
      setHighlightedMessageId(messageId);
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedMessageId(null);
        highlightTimeoutRef.current = null;
      }, 2000);
    } else {
      // Element doesn't exist - clear any existing highlight state
      setHighlightedMessageId(null);
    }
  };

  const fetchGroupData = async () => {
    try {
      // First get group info and membership status
      const [groupData, status] = await Promise.all([
        groupService.getGroupById(parseInt(id!)),
        groupService.getMyStatus(parseInt(id!)),
      ]);
      setGroup(groupData);
      setMemberStatus(status);

      // Only fetch content if user is a member
      if (status.isMember) {
        const [messagesData, filesData] = await Promise.all([
          messageService.getGroupMessages(parseInt(id!)),
          fileService.getGroupFiles(parseInt(id!)),
        ]);
        setMessages(messagesData);
        setFiles(filesData);

        // If creator, also fetch pending requests
        if (status.isCreator) {
          try {
            const requests = await groupService.getPendingRequests(parseInt(id!));
            setPendingRequests(requests);
          } catch (e) {
            // Ignore if fails
          }
        }
      }
    } catch (error) {
      console.error('Error fetching group data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploaded = await fileService.uploadFile(parseInt(id!), file);
      setFiles((prev) => [uploaded, ...prev]);
      setUploadProgress(100);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (file: FileUpload) => {
    try {
      const blob = await fileService.downloadFile(file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalFilename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;

    try {
      await fileService.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setSelectedFile(null);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType?.includes('pdf') || fileType?.includes('document') || fileType?.includes('word')) {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    if (fileType?.includes('image')) {
      return <FileImage className="w-8 h-8 text-green-500" />;
    }
    if (fileType?.includes('sheet') || fileType?.includes('excel')) {
      return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    }
    if (fileType?.includes('zip') || fileType?.includes('rar') || fileType?.includes('7z')) {
      return <FileArchive className="w-8 h-8 text-yellow-500" />;
    }
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle pin/unpin message
  const handleTogglePin = async (messageId: number) => {
    try {
      const updatedMessage = await messageService.togglePin(messageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isPinned: updatedMessage.isPinned } : m))
      );
      // Update pinned messages list
      if (updatedMessage.isPinned) {
        setPinnedMessages((prev) => [...prev, updatedMessage]);
      } else {
        setPinnedMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
      setContextMenu(null);
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  // Fetch pinned messages
  const fetchPinnedMessages = async () => {
    try {
      const pinned = await messageService.getPinnedMessages(parseInt(id!));
      setPinnedMessages(pinned);
    } catch (error) {
      console.error('Error fetching pinned messages:', error);
    }
  };

  // Upload file and send as chat message
  const handleChatFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // First upload the file
      const uploaded = await fileService.uploadFile(parseInt(id!), file);
      setFiles((prev) => [uploaded, ...prev]);

      // Then send a message with the file attached
      await messageService.sendMessage(parseInt(id!), {
        content: `Shared a file: ${uploaded.originalFilename}`,
        messageType: 'file',
        fileId: uploaded.id,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
      if (chatFileInputRef.current) {
        chatFileInputRef.current.value = '';
      }
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Fetch pinned messages on load
  useEffect(() => {
    if (id) {
      fetchPinnedMessages();
    }
  }, [id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Keep ref in sync with newMessage state to avoid stale closures
  useEffect(() => {
    newMessageRef.current = newMessage;
  }, [newMessage]);

  // Auto-focus message input when chat tab is active
  useEffect(() => {
    if (activeTab === 'chat') {
      // Use requestAnimationFrame for better timing
      requestAnimationFrame(() => {
        setTimeout(() => {
          messageInputRef.current?.focus();
        }, 50);
      });
    }
  }, [activeTab]);

  // Global keyboard listener for Enter key in chat section
  useEffect(() => {
    if (activeTab !== 'chat') return;

    const handleKeyPress = async (e: KeyboardEvent) => {
      // Only handle Enter key (not Shift+Enter)
      if (e.key === 'Enter' && !e.shiftKey) {
        const target = e.target as HTMLElement;
        const isInputOrTextarea = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
        
        // If user is typing in the message input, let the input's onKeyDown handle it
        if (isInputOrTextarea && target === messageInputRef.current) {
          return; // Let the input's handler take care of it
        }
        
        // If user is in another input/textarea (like search), don't interfere
        if (isInputOrTextarea && target !== messageInputRef.current) {
          return;
        }
        
        // If Enter is pressed elsewhere in chat section, focus input and send if there's content
        if (!isInputOrTextarea) {
          e.preventDefault();
          messageInputRef.current?.focus();
          // Use ref to get current value, avoiding stale closures
          const currentMessage = newMessageRef.current;
          if (currentMessage.trim() && !isSending && id) {
            setIsSending(true);
            try {
              await messageService.sendMessage(parseInt(id!), {
                content: currentMessage,
              });
              setNewMessage('');
              // Refocus input after sending
              setTimeout(() => {
                messageInputRef.current?.focus();
              }, 0);
            } catch (error) {
              console.error('Error sending message:', error);
            } finally {
              setIsSending(false);
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [activeTab, isSending, id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      // Send message to the server - WebSocket will broadcast it back to all subscribers
      await messageService.sendMessage(parseInt(id!), {
        content: newMessage,
      });
      // Don't add message here - it will come through WebSocket
      setNewMessage('');
      // Refocus input after sending message
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 0);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm('Are you sure you want to leave this group?')) return;
    
    try {
      await groupService.leaveGroup(parseInt(id!));
      navigate('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  const isUserMember = () => {
    return group?.members?.some((member) => member.id === user?.id);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading group...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Group not found</h2>
        <Link to="/groups" className="btn-primary">
          Back to Groups
        </Link>
      </div>
    );
  }

  const getVisibilityBadge = () => {
    switch (group.visibility) {
      case 'open':
        return <span className="badge-success text-xs">Open</span>;
      case 'approval':
        return <span className="badge-warning text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> Approval</span>;
      case 'private':
        return <span className="badge-secondary text-xs flex items-center gap-1"><Lock className="w-3 h-3" /> Private</span>;
      default:
        return null;
    }
  };

  const handleJoinGroup = async () => {
    if (!group) return;
    try {
      if (group.visibility === 'open') {
        await groupService.joinGroup(group.id);
        fetchGroupData(); // Refresh to get full access
      } else if (group.visibility === 'approval') {
        await groupService.requestJoin(group.id);
        setMemberStatus((prev) => prev ? { ...prev, hasPendingRequest: true } : null);
      }
    } catch (error) {
      console.error('Error joining group:', error);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await groupService.acceptRequest(requestId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      fetchGroupData(); // Refresh member list
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await groupService.rejectRequest(requestId);
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  const handleSearchUsers = async (query: string) => {
    setInviteSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await groupService.searchUsersToInvite(group.id, query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInviteUser = async (userId: number) => {
    try {
      await groupService.inviteUser(group.id, userId);
      setSearchResults((prev) => prev.filter((u) => u.id !== userId));
      alert('Invitation sent!');
    } catch (error) {
      console.error('Error inviting user:', error);
    }
  };

  // Non-member view
  if (memberStatus && !memberStatus.isMember) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto">
        {/* Header */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link
              to="/groups"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="w-16 h-16 gradient-bg rounded-xl flex items-center justify-center text-white text-2xl font-bold">
              {group.name.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
                {getVisibilityBadge()}
              </div>
              <p className="text-gray-500">
                {group.memberCount || group.members?.length || 0} members • {group.topic || 'General'}
              </p>
            </div>
          </div>

          {group.description && (
            <p className="text-gray-600 mb-6">{group.description}</p>
          )}

          {/* Join/Request Section */}
          <div className="border-t pt-6">
            {group.visibility === 'private' ? (
              <div className="text-center py-8">
                <Lock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Private Group</h3>
                <p className="text-gray-500">This group is invite-only. Only the creator can invite members.</p>
              </div>
            ) : memberStatus.hasPendingRequest ? (
              <div className="text-center py-8">
                <Clock className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Request Pending</h3>
                <p className="text-gray-500">Your request to join is waiting for approval from the group creator.</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-16 h-16 text-primary-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {group.visibility === 'open' ? 'Join this Group' : 'Request to Join'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {group.visibility === 'open' 
                    ? 'Join to access chat and files shared in this group.'
                    : 'Send a request to the group creator to join this group.'
                  }
                </p>
                <button onClick={handleJoinGroup} className="btn-primary">
                  {group.visibility === 'open' ? 'Join Group' : 'Request to Join'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/groups"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center text-white text-lg font-bold">
              {group.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
                {getVisibilityBadge()}
              </div>
              <p className="text-sm text-gray-500">
                {group.members?.length || 0} members • {group.topic || 'General'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* WebSocket Connection Status */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
              isConnected 
                ? 'bg-green-100 text-green-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span>Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>Connecting...</span>
                </>
              )}
            </div>
            {/* Invite button for creator of private groups */}
            {memberStatus?.isCreator && group.visibility === 'private' && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="btn-ghost text-primary-600 hover:bg-primary-50 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Invite
              </button>
            )}
            {isUserMember() && (
              <button
                onClick={handleLeaveGroup}
                className="btn-ghost text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Leave
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => {
            setActiveTab('chat');
            // Focus input immediately when switching to chat tab
            setTimeout(() => {
              messageInputRef.current?.focus();
            }, 50);
          }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'chat'
              ? 'bg-primary-100 text-primary-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <MessageSquare className="w-4 h-4 inline-block mr-2" />
          Chat
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'members'
              ? 'bg-primary-100 text-primary-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4 inline-block mr-2" />
          Members ({group.members?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'files'
              ? 'bg-primary-100 text-primary-700'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FolderOpen className="w-4 h-4 inline-block mr-2" />
          Files ({files.length})
        </button>
        {/* Requests tab for creator of approval-based groups */}
        {memberStatus?.isCreator && group.visibility === 'approval' && (
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'requests'
                ? 'bg-primary-100 text-primary-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Shield className="w-4 h-4 inline-block mr-2" />
            Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 card overflow-hidden flex flex-col">
        {activeTab === 'chat' && (
          <>
            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-4"
              onClick={(e) => {
                // Only focus input if clicking on empty space (not on interactive elements)
                const target = e.target as HTMLElement;
                const selection = window.getSelection();
                const hasTextSelected = selection && selection.toString().length > 0;
                
                // Don't focus if text is being selected
                if (hasTextSelected) {
                  return;
                }
                
                // Check if clicking on interactive elements or message content
                const isInteractive = 
                  target.tagName === 'BUTTON' ||
                  target.tagName === 'A' ||
                  target.closest('button') !== null ||
                  target.closest('a') !== null ||
                  target.closest('.cursor-pointer') !== null || // Elements with cursor-pointer class (like file downloads)
                  target.closest('.message-bubble') !== null; // Don't focus when clicking on message content
                
                // Focus input if clicking on empty space (not on interactive elements or message content)
                if (!isInteractive) {
                  messageInputRef.current?.focus();
                }
              }}
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No messages yet</h3>
                  <p className="text-gray-500">Be the first to start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender.id === user?.id;
                  const showDate =
                    index === 0 ||
                    formatDate(message.createdAt) !==
                      formatDate(messages[index - 1].createdAt);

                  return (
                    <React.Fragment key={message.id}>
                      {showDate && (
                        <div className="flex items-center gap-4 my-4">
                          <div className="flex-1 h-px bg-gray-200"></div>
                          <span className="text-xs text-gray-500 font-medium">
                            {formatDate(message.createdAt)}
                          </span>
                          <div className="flex-1 h-px bg-gray-200"></div>
                        </div>
                      )}
                      <div
                        ref={(el) => {
                          if (el) {
                            messageRefs.current.set(message.id, el);
                          } else {
                            messageRefs.current.delete(message.id);
                          }
                        }}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group transition-all duration-500 p-2 ${
                          highlightedMessageId === message.id ? 'bg-purple-100 rounded-lg ring-2 ring-purple-300' : ''
                        }`}
                      >
                        <div
                          className={`flex items-end gap-2 max-w-[70%] ${
                            isOwn ? 'flex-row-reverse' : ''
                          }`}
                        >
                          {!isOwn && (
                            <div className="avatar avatar-sm flex-shrink-0">
                              {message.sender.fullName?.charAt(0) ||
                                message.sender.username.charAt(0)}
                            </div>
                          )}
                          <div className="relative">
                            {!isOwn && (
                              <span className="text-xs text-gray-500 ml-1 mb-1 block">
                                {message.sender.fullName || message.sender.username}
                              </span>
                            )}
                            {/* Pin indicator */}
                            {message.isPinned && (
                              <div className="absolute -top-2 -right-2 bg-purple-400 rounded-full p-1">
                                <Pin className="w-3 h-3 text-white" />
                              </div>
                            )}
                            {/* Message content */}
                            <div
                              className={`message-bubble ${isOwn ? 'sent' : 'received'} ${
                                message.messageType === 'file' ? 'p-2' : ''
                              }`}
                            >
                              {message.messageType === 'file' && message.attachedFile ? (
                                <div
                                  className="flex items-center gap-3 p-2 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors"
                                  onClick={() => handleDownload(message.attachedFile!)}
                                >
                                  {getFileIcon(message.attachedFile.fileType)}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate text-sm">
                                      {message.attachedFile.originalFilename}
                                    </p>
                                    <p className="text-xs opacity-75">
                                      {formatFileSize(message.attachedFile.fileSize)}
                                    </p>
                                  </div>
                                  <Download className="w-5 h-5 flex-shrink-0" />
                                </div>
                              ) : (
                                message.content
                              )}
                            </div>
                            {/* Message actions */}
                            <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              <span className={`text-xs text-gray-400 ${isOwn ? 'mr-1' : 'ml-1'}`}>
                                {formatTime(message.createdAt)}
                              </span>
                              {/* Action buttons - visible on hover */}
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePin(message.id);
                                  }}
                                  className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                                    message.isPinned ? 'text-purple-500' : 'text-gray-400'
                                  }`}
                                  title={message.isPinned ? 'Unpin message' : 'Pin message'}
                                >
                                  <Pin className="w-3 h-3" />
                                </button>
                                {isOwn && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setContextMenu({ messageId: message.id, x: e.clientX, y: e.clientY });
                                    }}
                                    className="p-1 rounded hover:bg-gray-200 transition-colors text-gray-400"
                                  >
                                    <MoreVertical className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Pinned Messages Banner */}
            {pinnedMessages.length > 0 && (
              <div 
                className="px-4 py-2 bg-purple-50 border-b border-purple-100 cursor-pointer hover:bg-purple-100 transition-colors"
                onClick={() => setShowPinnedMessages(!showPinnedMessages)}
              >
                <div className="flex items-center gap-2">
                  <Pin className="w-4 h-4 text-purple-600" />
                  <span className="text-sm text-purple-800 font-medium">
                    {pinnedMessages.length} pinned message{pinnedMessages.length > 1 ? 's' : ''}
                  </span>
                </div>
                {showPinnedMessages && (
                  <div className="mt-2 space-y-2">
                    {pinnedMessages.map((pm) => (
                      <div 
                        key={pm.id} 
                        className="text-sm text-purple-700 bg-purple-100 p-2 rounded cursor-pointer hover:bg-purple-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToMessage(pm.id);
                          setShowPinnedMessages(false);
                        }}
                      >
                        <span className="font-medium">{pm.sender.fullName || pm.sender.username}:</span>{' '}
                        {pm.content.length > 100 ? pm.content.substring(0, 100) + '...' : pm.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message Input */}
            {isUserMember() ? (
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100">
                <div className="flex gap-3">
                  {/* File attachment button */}
                  <input
                    type="file"
                    ref={chatFileInputRef}
                    onChange={handleChatFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.zip,.rar,.7z"
                  />
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-3 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Attach file"
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Paperclip className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      // Send message on Enter key press (only when chat tab is active)
                      if (e.key === 'Enter' && !e.shiftKey && activeTab === 'chat') {
                        e.preventDefault();
                        if (newMessage.trim() && !isSending) {
                          handleSendMessage(e as any);
                        }
                      }
                    }}
                    placeholder="Type your message..."
                    className="input flex-1"
                    disabled={isSending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || isSending}
                    className="btn-primary px-6 flex items-center gap-2"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 border-t border-gray-100 bg-gray-50 text-center">
                <p className="text-gray-500 text-sm">Join this group to send messages</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'members' && (
          /* Members Tab */
          <div className="p-4 overflow-y-auto">
            <div className="space-y-3">
              {group.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="avatar">
                    {member.fullName?.charAt(0) || member.username.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {member.fullName || member.username}
                      {member.id === group.creator?.id && (
                        <span className="ml-2 badge-primary text-xs">Creator</span>
                      )}
                      {member.id === user?.id && (
                        <span className="ml-2 text-xs text-gray-500">(You)</span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          /* Files Tab */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Upload Section */}
            {isUserMember() && (
              <div className="p-4 border-b border-gray-100">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.zip,.rar,.7z"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Uploading... {uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      <span>Upload File</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Supported: PDF, DOC, DOCX, TXT, PPT, XLS, Images, ZIP (Max 50MB)
                </p>
              </div>
            )}

            {/* Files List */}
            <div className="flex-1 overflow-y-auto p-4">
              {files.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <FolderOpen className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No files yet</h3>
                  <p className="text-gray-500">Upload files to share with your group</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {getFileIcon(file.fileType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {file.originalFilename}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.fileSize)} • Uploaded by {file.uploader?.fullName || file.uploader?.username}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {file.fileType?.includes('image') && (
                          <button
                            onClick={() => setSelectedFile(file)}
                            className="p-2 text-gray-600 hover:bg-white rounded-lg transition-colors"
                            title="Preview"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-2 text-primary-600 hover:bg-white rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                        {(file.uploader?.id === user?.id || user?.role === 'ADMIN') && (
                          <button
                            onClick={() => handleDeleteFile(file.id)}
                            className="p-2 text-red-600 hover:bg-white rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Requests Tab for approval-based groups */}
        {activeTab === 'requests' && memberStatus?.isCreator && (
          <div className="p-4 overflow-y-auto">
            {pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Shield className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No pending requests</h3>
                <p className="text-gray-500">When users request to join, they'll appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="avatar">
                      {request.user?.fullName?.charAt(0) || request.user?.username?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {request.user?.fullName || request.user?.username}
                      </p>
                      <p className="text-sm text-gray-500">{request.user?.email}</p>
                      {request.message && (
                        <p className="text-sm text-gray-600 mt-1 italic">"{request.message}"</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Requested {new Date(request.createdAt || '').toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        className="btn-ghost text-red-600 hover:bg-red-50 px-3 py-1.5 text-sm flex items-center gap-1"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal for private groups */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-scale-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Invite Members</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={inviteSearchQuery}
                onChange={(e) => handleSearchUsers(e.target.value)}
                placeholder="Search by name or email..."
                className="input pl-10 w-full"
              />
            </div>

            <div className="max-h-64 overflow-y-auto">
              {isSearching ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-500" />
                  <p className="text-gray-500 text-sm mt-2">Searching...</p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {inviteSearchQuery.length < 2 
                    ? 'Type at least 2 characters to search'
                    : 'No users found'
                  }
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="avatar avatar-sm">
                        {u.fullName?.charAt(0) || u.username.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{u.fullName || u.username}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                      <button
                        onClick={() => handleInviteUser(u.id)}
                        className="btn-primary px-3 py-1.5 text-sm"
                      >
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedFile && selectedFile.fileType?.includes('image') && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setSelectedFile(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={fileService.getViewUrl(selectedFile.id)}
              alt={selectedFile.originalFilename}
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />
            <p className="text-white text-center mt-4">{selectedFile.originalFilename}</p>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const msg = messages.find((m) => m.id === contextMenu.messageId);
              if (msg) handleTogglePin(msg.id);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <Pin className="w-4 h-4" />
            {messages.find((m) => m.id === contextMenu.messageId)?.isPinned ? 'Unpin' : 'Pin'} Message
          </button>
          <button
            onClick={async () => {
              try {
                await messageService.deleteMessage(contextMenu.messageId);
                setMessages((prev) => prev.filter((m) => m.id !== contextMenu.messageId));
                setContextMenu(null);
              } catch (error) {
                console.error('Error deleting message:', error);
              }
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Message
          </button>
        </div>
      )}
    </div>
  );
};

export default GroupDetail;
