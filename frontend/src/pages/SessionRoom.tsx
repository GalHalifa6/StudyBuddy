import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { expertService, studentExpertService, ExpertSession } from '../api/experts';
import { sessionService } from '../api/sessions';
import { resolveApiUrl } from '@/config/env';
import { useSessionWebSocket, SessionMessage, WhiteboardDrawData } from '../hooks/useSessionWebSocket';
import { JitsiMeetEmbed } from '../components/JitsiMeetEmbed';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  MessageCircle,
  FileText,
  Clock,
  X,
  Send,
  Upload,
  Download,
  Code,
  Pencil,
  Eraser,
  Trash2,
  ExternalLink,
  PhoneOff,
  Maximize2,
  Minimize2,
  StickyNote,
  AlertCircle,
  Save,
  Play,
  StopCircle,
  Star,
  Award,
  Users,
  CheckCircle,
  PartyPopper,
  Copy,
  Check,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface ChatMessage {
  id: number;
  sender: string;
  senderId?: number;
  content: string;
  timestamp: Date;
  type: 'text' | 'file' | 'code' | 'system' | 'whiteboard';
  fileUrl?: string;
  fileName?: string;
  language?: string;
}

interface SessionFile {
  id: number;
  name: string;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
  size: string;
}

interface Participant {
  id: number;
  name: string;
  role: 'expert' | 'student';
  isOnline: boolean;
}

const SessionRoom: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Session state
  const [session, setSession] = useState<ExpertSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionStatus, setSessionStatus] = useState<'waiting' | 'active' | 'ended'>('waiting');
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // UI state
  const [activePanel, setActivePanel] = useState<'chat' | 'files' | 'whiteboard' | 'code' | 'notes'>('chat');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showSessionEndedScreen, setShowSessionEndedScreen] = useState(false);
  const [endSessionSummary, setEndSessionSummary] = useState('');
  const [studentRating, setStudentRating] = useState(0);
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Media state for Jitsi
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Files state
  const [files, setFiles] = useState<SessionFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Whiteboard state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#8B5CF6');
  const [brushSize, setBrushSize] = useState(3);
  const [drawTool, setDrawTool] = useState<'pen' | 'eraser'>('pen');
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  
  // Code editor state
  const [code, setCode] = useState('// Collaborative code editor\n// Changes are shared in real-time\n\nfunction example() {\n  console.log("Hello, World!");\n}');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  
  // Notes state
  const [sessionNotes, setSessionNotes] = useState('');
  
  // Participants
  const [participants, setParticipants] = useState<Participant[]>([]);
  const attemptedAutoJoin = useRef(false);
  
  // Confetti state
  const [showConfetti, setShowConfetti] = useState(false);
  

  // Check if current user is the session creator (expert)
  const isSessionExpert = session?.expert?.id === user?.id;

  // Track message IDs we've seen to prevent duplicates
  const seenMessageIds = useRef<Set<number>>(new Set());

  // WebSocket message handler - receives messages from ALL participants including self
  // This is the ONLY place messages are added to state - ensures perfect sync
  const handleWebSocketMessage = useCallback((message: SessionMessage) => {
    console.log('>>> WebSocket received message:', message);
    
    const msgId = message.id || Date.now();
    
    // Skip if we've already processed this message
    if (seenMessageIds.current.has(msgId)) {
      console.log('>>> Already processed this message, skipping');
      return;
    }
    seenMessageIds.current.add(msgId);
    
    const newMsg: ChatMessage = {
      id: msgId,
      sender: message.senderName,
      senderId: message.senderId,
      content: message.content,
      timestamp: new Date(message.timestamp),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: message.type as any,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      language: message.language,
    };
    
    console.log('>>> Adding message to chat from:', newMsg.sender);
    setMessages(prev => [...prev, newMsg]);

    // If it's a file message, also add to files panel
    if (message.type === 'file' && message.fileName && message.fileUrl) {
      setFiles(prev => {
        if (prev.some(f => f.name === message.fileName && f.uploadedBy === message.senderName)) {
          return prev;
        }
        return [...prev, {
          id: message.id || Date.now(),
          name: message.fileName!,
          url: message.fileUrl!,
          uploadedBy: message.senderName,
          uploadedAt: new Date(message.timestamp),
          size: 'Shared',
        }];
      });
    }
  }, []);

  // Whiteboard update handler
  const handleWhiteboardUpdate = useCallback((data: WhiteboardDrawData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (data.type === 'clear') {
      ctx.fillStyle = '#1F2937';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (data.type === 'draw' && data.points && data.points.length >= 2) {
      ctx.strokeStyle = data.tool === 'eraser' ? '#1F2937' : (data.color || '#8B5CF6');
      ctx.lineWidth = data.tool === 'eraser' ? (data.brushSize || 3) * 3 : (data.brushSize || 3);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(data.points[0].x, data.points[0].y);
      for (let i = 1; i < data.points.length; i++) {
        ctx.lineTo(data.points[i].x, data.points[i].y);
      }
      ctx.stroke();
    }
  }, []);

  // Participant handlers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleParticipantJoin = useCallback((participant: any) => {
    console.log('Participant joined:', participant);
    setParticipants(prev => {
      // Check if already exists
      if (prev.some(p => p.id === participant.id)) {
        // Update online status
        return prev.map(p => p.id === participant.id ? { ...p, isOnline: true } : p);
      }
      return [...prev, { ...participant, isOnline: true }];
    });
    // Add system message for join
    setMessages(prev => {
      // Avoid duplicate join messages
      const recentJoinMsg = prev.find(m => 
        m.type === 'system' && 
        m.content.includes(participant.name) && 
        m.content.includes('joined') &&
        Date.now() - m.timestamp.getTime() < 5000
      );
      if (recentJoinMsg) return prev;
      return [...prev, {
        id: Date.now(),
        sender: 'System',
        content: `${participant.name} joined the session`,
        timestamp: new Date(),
        type: 'system',
      }];
    });
  }, []);

  const handleParticipantLeave = useCallback((participantId: number) => {
    setParticipants(prev => {
      const leaving = prev.find(p => p.id === participantId);
      if (leaving) {
        setMessages(msgs => [...msgs, {
          id: Date.now(),
          sender: 'System',
          content: `${leaving.name} left the session`,
          timestamp: new Date(),
          type: 'system',
        }]);
      }
      return prev.filter(p => p.id !== participantId);
    });
  }, []);

  const handleSessionStatusChange = useCallback((status: string) => {
    if (status === 'In Progress' || status === 'ACTIVE') {
      setSessionStatus('active');
    } else if (status === 'Completed' || status === 'Cancelled' || status === 'ENDED') {
      setSessionStatus('ended');
      setShowConfetti(true);
      setTimeout(() => {
        setShowSessionEndedScreen(true);
        setShowConfetti(false);
      }, 2000);
    }
  }, []);

  // Connect to WebSocket
  const {
    isConnected,
    sendChatMessage,
    sendWhiteboardUpdate,
    notifyJoin,
    notifyLeave,
  } = useSessionWebSocket({
    sessionId: parseInt(sessionId || '0'),
    userId: user?.id,
    userName: user?.fullName || user?.username || 'Anonymous',
    onMessage: handleWebSocketMessage,
    onWhiteboardUpdate: handleWhiteboardUpdate,
    onParticipantJoin: handleParticipantJoin,
    onParticipantLeave: handleParticipantLeave,
    onSessionStatusChange: handleSessionStatusChange,
  });

  // Track if we've joined to prevent duplicate join notifications
  const hasJoined = useRef(false);

  // Notify join when connected
  useEffect(() => {
    if (isConnected && session && user && !hasJoined.current) {
      hasJoined.current = true;
      // Add self to participants first
      setParticipants(prev => {
        const selfExists = prev.some(p => p.id === user.id);
        if (selfExists) return prev;
        return [...prev, {
          id: user.id!,
          name: user.fullName || user.username || 'You',
          role: (user.role === 'EXPERT' || user.role === 'ADMIN') ? 'expert' : 'student',
          isOnline: true,
        }];
      });
      // Notify others that we joined
      notifyJoin();
    }
  }, [isConnected, session, user, notifyJoin]);

  // Handle leave notification when component unmounts or user navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasJoined.current && user?.id) {
        // Use sendBeacon for reliable delivery during page unload
        const leaveData = JSON.stringify({ userId: user.id, userName: user.fullName || user.username });
        navigator.sendBeacon(resolveApiUrl(`/api/sessions/${sessionId}/leave`), leaveData);
        notifyLeave();
      }
    };

    const handleVisibilityChange = () => {
      // If page becomes hidden (user switches tabs/closes), send leave
      if (document.visibilityState === 'hidden' && hasJoined.current) {
        notifyLeave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (hasJoined.current) {
        hasJoined.current = false;
        notifyLeave();
      }
    };
  }, [notifyLeave, sessionId, user]);

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (sessionStatus === 'active') {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStatus]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && activePanel === 'whiteboard') {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#1F2937';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [activePanel]);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const sessionData = await studentExpertService.getSession(parseInt(sessionId));
      setSession(sessionData);
      
      if (sessionData.status === 'In Progress') {
        setSessionStatus('active');
        if (sessionData.actualStartTime) {
          const startTime = new Date(sessionData.actualStartTime).getTime();
          setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
        }
      } else if (sessionData.status === 'Completed' || sessionData.status === 'Cancelled') {
        setSessionStatus('ended');
        setShowSessionEndedScreen(true);
      }
      
      // Initialize participants with expert from session data
      const participantList: Participant[] = [];
      if (sessionData.expert) {
        participantList.push({
          id: sessionData.expert.id,
          name: sessionData.expert.fullName || 'Expert',
          role: 'expert',
          isOnline: true,
        });
      }
      
      // Always try to load participants from the database
      try {
        const participantsData = await sessionService.getSessionParticipants(parseInt(sessionId));
        console.log('Loaded participants:', participantsData);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const registeredParticipants: Participant[] = participantsData.map((p: any) => ({
          id: p.userId,
          name: p.fullName || p.username,
          role: 'student' as const,
          isOnline: true,
        }));
        // Combine expert with registered participants
        const allParticipants = [...participantList];
        registeredParticipants.forEach(rp => {
          if (!allParticipants.some(p => p.id === rp.id)) {
            allParticipants.push(rp);
          }
        });
        setParticipants(allParticipants);
      } catch (err) {
        console.error('Failed to load participants:', err);
        // Fallback to just the expert
        setParticipants(participantList);
      }
      
      // Add welcome message
      setMessages([{
        id: 1,
        sender: 'System',
        content: `Welcome to "${sessionData.title}"! 🎓`,
        timestamp: new Date(),
        type: 'system',
      }]);
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Load session when sessionId changes
  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!session || !user || attemptedAutoJoin.current) {
      return;
    }

    const isAssignedStudent = session.student?.id === user.id;
    if (isSessionExpert || !isAssignedStudent) {
      return;
    }

    attemptedAutoJoin.current = true;

    (async () => {
      try {
        await sessionService.joinSession(session.id);
        setParticipants(prev => {
          const alreadyPresent = prev.some(p => p.id === user.id);
          if (alreadyPresent) {
            return prev.map(p => p.id === user.id ? { ...p, isOnline: true } : p);
          }
          return [...prev, {
            id: user.id!,
            name: user.fullName || user.username || 'You',
            role: 'student',
            isOnline: true,
          }];
        });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        if (error?.response?.status === 409) {
          console.debug('Already registered for session');
        } else {
          console.error('Failed to auto-join session:', error);
        }
      }
    })();
  }, [session, user, isSessionExpert]);

  const handleStartSession = async () => {
    if (!sessionId) return;
    try {
      await expertService.startSession(parseInt(sessionId));
      setSessionStatus('active');
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'System',
        content: '🚀 Session has started! Good luck!',
        timestamp: new Date(),
        type: 'system',
      }]);
      loadSession();
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    try {
      await expertService.completeSession(parseInt(sessionId), endSessionSummary);
      setSessionStatus('ended');
      setShowEndModal(false);
      setShowConfetti(true);
      setTimeout(() => {
        setShowSessionEndedScreen(true);
        setShowConfetti(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately
    
    // ONLY send via WebSocket - the broadcast will add the message for everyone including us
    // This ensures perfect sync between all participants
    if (isConnected) {
      console.log('>>> Sending message via WebSocket:', messageContent);
      sendChatMessage(messageContent, 'text');
    } else {
      console.error('>>> WebSocket not connected! Cannot send message');
      // Show error to user - message won't be sent
      alert('Not connected to chat. Please refresh the page.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create local file entry for Files panel
    const fileUrl = URL.createObjectURL(file);
    const newFile: SessionFile = {
      id: Date.now(),
      name: file.name,
      url: fileUrl,
      uploadedBy: user?.fullName || 'You',
      uploadedAt: new Date(),
      size: formatFileSize(file.size),
    };
    setFiles(prev => [...prev, newFile]);
    
    // Send file message via WebSocket - broadcast will add to chat for everyone
    if (isConnected) {
      sendChatMessage(`📎 Shared: ${file.name}`, 'file', { fileUrl, fileName: file.name });
    }
  };

  const handleShareCode = () => {
    // Send via WebSocket - broadcast will add to chat for everyone
    if (isConnected) {
      sendChatMessage(code, 'code', { language: codeLanguage });
      setActivePanel('chat');
    }
  };

  const handleCopyCode = async (codeContent: string) => {
    await navigator.clipboard.writeText(codeContent);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Memoize video component to prevent remounting when messages change
  const videoComponent = useMemo(() => {
    if (sessionStatus !== 'active' || !session?.id) return null;
    
    // Generate meeting link if missing - use stable link based on session ID
    const meetingLink = session?.meetingLink || `https://meet.jit.si/studybuddy-${session.id}`;
    
    return (
      <div 
        className="bg-black rounded-xl overflow-hidden shadow-2xl" 
        style={{ 
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          right: '1rem',
          bottom: '1rem',
          width: 'calc(100% - 2rem)',
          height: 'calc(100% - 2rem)',
          minHeight: 0,
          maxHeight: '100%',
          flexShrink: 0,
          flexGrow: 0,
        }}
      >
        <JitsiMeetEmbed
          key={`jitsi-${session.id}`} // Stable key based on session ID only
          roomName={meetingLink}
          displayName={user?.fullName || user?.username || 'Participant'}
          config={{
            startWithAudioMuted: false, // Auto-join with audio enabled
            startWithVideoMuted: false, // Auto-join with video enabled
            enableWelcomePage: false,
            enableClosePage: false,
          }}
          className="w-full h-full"
        />
      </div>
    );
  }, [sessionStatus, session?.id, session?.meetingLink, user?.fullName, user?.username]);

  // Real-time whiteboard drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLastPoint({ x, y });
    
    // Draw a dot for single click
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = drawTool === 'eraser' ? '#1F2937' : brushColor;
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPoint) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Draw locally
    ctx.strokeStyle = drawTool === 'eraser' ? '#1F2937' : brushColor;
    ctx.lineWidth = drawTool === 'eraser' ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    // Send via WebSocket for real-time sync
    if (isConnected) {
      sendWhiteboardUpdate({
        type: 'draw',
        points: [lastPoint, { x, y }],
        color: brushColor,
        brushSize,
        tool: drawTool,
      });
    }
    
    setLastPoint({ x, y });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPoint(null);
  };

  const clearWhiteboard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Broadcast clear to all participants
    if (isConnected) {
      sendWhiteboardUpdate({ type: 'clear' });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpert = user?.role === 'EXPERT' || user?.role === 'ADMIN';
  // For session-specific actions, use isSessionExpert instead of isExpert

  // Confetti Component
  const Confetti = () => (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            backgroundColor: ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'][Math.floor(Math.random() * 5)],
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 10 + 5}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-500/30 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
          </div>
          <p className="mt-6 text-gray-400 text-lg">Joining session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Session Not Found</h2>
          <p className="text-gray-400 mb-6">This session may have been cancelled or doesn't exist.</p>
          <button
            onClick={() => navigate('/sessions')}
            className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all"
          >
            Browse Sessions
          </button>
        </div>
      </div>
    );
  }

  // Session Ended Screen
  if (showSessionEndedScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-gray-800/80 backdrop-blur-lg rounded-3xl p-8 border border-gray-700 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">Session Complete! 🎉</h2>
          <p className="text-gray-400 mb-8">Great session with {session.expert?.fullName}</p>
          
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-700/50 rounded-xl p-4">
              <Clock className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{formatTime(elapsedTime)}</p>
              <p className="text-xs text-gray-400">Duration</p>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-4">
              <MessageCircle className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{messages.filter(m => m.type === 'text').length}</p>
              <p className="text-xs text-gray-400">Messages</p>
            </div>
            <div className="bg-gray-700/50 rounded-xl p-4">
              <Users className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">{participants.length}</p>
              <p className="text-xs text-gray-400">Participants</p>
            </div>
          </div>
          
          {!isExpert && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-white mb-4">Rate your experience</h3>
              <div className="flex justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setStudentRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= studentRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/sessions')}
              className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600"
            >
              Browse Sessions
            </button>
            <button
              onClick={() => navigate(isExpert ? '/expert-dashboard' : '/dashboard')}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700"
            >
              {isExpert ? 'Dashboard' : 'Home'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : ''}`} style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>
      {showConfetti && <Confetti />}
      
      {/* End Session Modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <StopCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">End Session?</h3>
                <p className="text-sm text-gray-400">All participants will be notified</p>
              </div>
            </div>
            
            <textarea
              value={endSessionSummary}
              onChange={(e) => setEndSessionSummary(e.target.value)}
              placeholder="Session summary (optional)..."
              className="w-full bg-gray-700/50 text-white rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-6"
              rows={4}
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleEndSession}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 flex items-center justify-center gap-2"
              >
                <PartyPopper className="w-5 h-5" />
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-lg border-b border-gray-700/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-700/50 rounded-xl">
              <X className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                {session.title}
                {sessionStatus === 'active' && (
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    LIVE
                  </span>
                )}
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {participants.length}
                </span>
                {sessionStatus === 'active' && (
                  <span className="flex items-center gap-1 text-purple-400">
                    <Clock className="w-4 h-4" />
                    {formatTime(elapsedTime)}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {session.meetingLink && session.meetingPlatform !== 'JITSI' && (
              <a
                href={session.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
              >
                <Video className="w-4 h-4" />
                Join {session.meetingPlatform || 'Video'}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            
            {isSessionExpert && sessionStatus === 'waiting' && (
              <button
                onClick={handleStartSession}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25"
              >
                <Play className="w-4 h-4" />
                Start Session
              </button>
            )}
            {isSessionExpert && sessionStatus === 'active' && (
              <button
                onClick={() => setShowEndModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 shadow-lg shadow-red-500/25"
              >
                <StopCircle className="w-4 h-4" />
                End
              </button>
            )}
            
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2.5 hover:bg-gray-700/50 rounded-xl">
              {isFullscreen ? <Minimize2 className="w-5 h-5 text-gray-400" /> : <Maximize2 className="w-5 h-5 text-gray-400" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0, height: '100%' }}>
        {/* Left Panel - Video Area */}
        <div className="flex-1 flex flex-col min-w-0" style={{ minHeight: 0, maxHeight: '100%', overflow: 'hidden' }}>
          <div className="flex-1 bg-gray-900/50 relative p-4" style={{ minHeight: 0, maxHeight: '100%', overflow: 'hidden', flexShrink: 0 }}>
            {/* Show Jitsi embed when session is active - memoized to prevent remounting */}
            {videoComponent}
            {sessionStatus === 'active' && (!session?.meetingLink || session?.meetingPlatform !== 'JITSI') && (() => {
              // Debug: Log IDs to understand the "amit amit" issue
              console.log('Video panel debug:', {
                userId: user?.id,
                sessionExpertId: session?.expert?.id,
                isSessionExpert,
                participants: participants.map(p => ({ id: p.id, name: p.name })),
              });
              
              // Determine who to show in each panel
              const otherParticipants = participants.filter(p => p.id !== user?.id);
              const firstOther = otherParticipants[0];
              
              console.log('otherParticipants:', otherParticipants, 'firstOther:', firstOther);
              
              // If I'm the expert: Left=Me(Expert), Right=First student or empty
              // If I'm a student: Left=Expert, Right=Me
              const leftPerson = isSessionExpert 
                ? { name: user?.fullName || 'You', initial: (user?.fullName || 'Y').charAt(0), isExpert: true, isMe: true }
                : { name: session.expert?.fullName || 'Expert', initial: (session.expert?.fullName || 'E').charAt(0), isExpert: true, isMe: false };
              
              const rightPerson = isSessionExpert && firstOther
                ? { name: firstOther.name, initial: firstOther.name.charAt(0), isExpert: false, isMe: false }
                : isSessionExpert
                ? null // No other participant yet
                : { name: user?.fullName || 'You', initial: (user?.fullName || 'Y').charAt(0), isExpert: false, isMe: true };
              
              return (
                <div className="grid grid-cols-2 gap-4 h-full">
                  {/* Left Panel */}
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden relative border border-gray-700/50">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`w-28 h-28 bg-gradient-to-br ${leftPerson.isExpert ? 'from-purple-500 to-indigo-600' : 'from-blue-500 to-cyan-600'} rounded-full flex items-center justify-center text-5xl font-bold text-white shadow-2xl`}>
                        {leftPerson.initial}
                      </div>
                    </div>
                    <div className="absolute top-4 right-4">
                      {leftPerson.isExpert && (
                        <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          Expert
                        </span>
                      )}
                      {leftPerson.isMe && (
                        <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full ml-1">You</span>
                      )}
                    </div>
                    <div className="absolute bottom-4 left-4">
                      <span className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm flex items-center gap-2">
                        {leftPerson.name}
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Right Panel */}
                  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl overflow-hidden relative border border-gray-700/50">
                    {rightPerson ? (
                      <>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`w-28 h-28 bg-gradient-to-br ${rightPerson.isMe ? 'from-blue-500 to-cyan-600' : 'from-green-500 to-teal-600'} rounded-full flex items-center justify-center text-5xl font-bold text-white shadow-2xl`}>
                            {rightPerson.initial}
                          </div>
                        </div>
                        <div className="absolute top-4 right-4">
                          {rightPerson.isMe && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">You</span>}
                          {!rightPerson.isMe && <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">Participant</span>}
                        </div>
                        <div className="absolute bottom-4 left-4">
                          <span className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full text-white text-sm flex items-center gap-2">
                            {rightPerson.name}
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                          </span>
                        </div>
                        {rightPerson.isMe && isMuted && (
                          <div className="absolute top-4 left-4">
                            <span className="bg-red-500/80 p-1.5 rounded-full"><MicOff className="w-3 h-3 text-white" /></span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Users className="w-16 h-16 text-gray-600 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">Waiting for participants...</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            
            {sessionStatus === 'waiting' && (
              <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                  {isSessionExpert ? (
                    <>
                      <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <Play className="w-10 h-10 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Ready to Start?</h3>
                      <p className="text-gray-400 mb-6">
                        {participants.length > 1 
                          ? `${participants.length - 1} participant(s) are waiting for you!` 
                          : 'No participants have joined yet.'}
                      </p>
                      <button
                        onClick={handleStartSession}
                        className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25 font-semibold flex items-center gap-2 mx-auto"
                      >
                        <Play className="w-5 h-5" />
                        Start Session Now
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="w-20 h-20 border-4 border-yellow-500/30 rounded-full"></div>
                        <div className="w-20 h-20 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin absolute top-0"></div>
                        <Clock className="w-8 h-8 text-yellow-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">Waiting for Expert</h3>
                      <p className="text-gray-400 mb-4">
                        <span className="text-white font-semibold">{session?.expert?.fullName}</span> will start the session soon.
                      </p>
                      <p className="text-sm text-gray-500 mb-6">
                        You'll be notified when the session begins. Feel free to explore the chat while waiting!
                      </p>
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                        <Users className="w-4 h-4" />
                        <span>{participants.length} participant(s) in waiting room</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Media Controls */}
          <div className="bg-gray-800/50 backdrop-blur-lg border-t border-gray-700/50 p-4">
            <div className="flex items-center justify-center gap-3">
              {/* Note: Audio/Video controls are now handled by Jitsi itself when video is embedded */}
              {/* These controls affect initial mute state only */}
              {session?.meetingPlatform === 'JITSI' && sessionStatus === 'active' && (
                <>
                  <div className="text-xs text-gray-400 px-2">
                    Video & Audio controls are in the Jitsi interface above
                  </div>
                </>
              )}
              <div className="w-px h-10 bg-gray-600 mx-2" />
              {/* Leave Session Button - for students / End for expert */}
              {sessionStatus === 'active' && (
                isSessionExpert ? (
                  <button
                    onClick={() => setShowEndModal(true)}
                    className="p-4 rounded-2xl bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30"
                    title="End Session"
                  >
                    <PhoneOff className="w-6 h-6 text-white" />
                  </button>
                ) : (
                  <button
                    onClick={() => navigate(-1)}
                    className="p-4 rounded-2xl bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30"
                    title="Leave Session"
                  >
                    <PhoneOff className="w-6 h-6 text-white" />
                  </button>
                )
              )}
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">
              {session?.meetingPlatform === 'JITSI' && sessionStatus === 'active' 
                ? 'Video call is active • Chat & whiteboard are real-time' 
                : 'Chat & whiteboard are real-time'}
            </p>
          </div>
        </div>

        {/* Right Panel - Tools */}
        <div className="w-96 bg-gray-800/30 backdrop-blur-lg border-l border-gray-700/50 flex flex-col flex-shrink-0" style={{ minWidth: '24rem' }}>
          {/* Panel Tabs */}
          <div className="flex border-b border-gray-700/50">
            {[
              { id: 'chat', icon: MessageCircle, label: 'Chat' },
              { id: 'files', icon: FileText, label: 'Files' },
              { id: 'whiteboard', icon: Pencil, label: 'Board' },
              { id: 'code', icon: Code, label: 'Code' },
              { id: 'notes', icon: StickyNote, label: 'Notes' },
            ].map((tab) => (
              <button
                key={tab.id}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => setActivePanel(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${
                  activePanel === tab.id ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden flex flex-col" style={{ minHeight: 0, maxHeight: '100%' }}>
            {/* Chat Panel */}
            {activePanel === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0, maxHeight: '100%' }}>
                  {messages.map((msg) => (
                    <div key={msg.id} className={msg.type === 'system' ? 'text-center' : ''}>
                      {msg.type === 'system' ? (
                        <span className="text-xs text-gray-500 bg-gray-700/50 px-4 py-1.5 rounded-full">{msg.content}</span>
                      ) : msg.type === 'code' ? (
                        <div className="bg-gray-900/80 rounded-xl overflow-hidden border border-gray-700/50">
                          <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50">
                            <span className="text-xs text-gray-400">{msg.sender}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded">{msg.language}</span>
                              <button onClick={() => handleCopyCode(msg.content)} className="p-1 hover:bg-gray-700 rounded">
                                {copiedCode ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                              </button>
                            </div>
                          </div>
                          <pre className="p-4 text-sm text-green-400 overflow-x-auto font-mono"><code>{msg.content}</code></pre>
                        </div>
                      ) : msg.type === 'file' ? (
                        <div className="bg-gray-700/30 rounded-xl p-3 border border-gray-700/50">
                          <p className="text-xs text-gray-400 mb-2">{msg.sender}</p>
                          <a href={msg.fileUrl} download={msg.fileName} className="flex items-center gap-3 text-purple-400 hover:text-purple-300 bg-gray-800/50 rounded-lg p-3">
                            <FileText className="w-5 h-5" />
                            <span className="flex-1 truncate">{msg.fileName}</span>
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ) : (
                        <div className={msg.senderId === user?.id ? 'ml-8' : 'mr-8'}>
                          <p className="text-xs text-gray-400 mb-1">{msg.sender}</p>
                          <p className={`text-gray-200 rounded-2xl px-4 py-2.5 ${msg.senderId === user?.id ? 'bg-purple-600/80 rounded-br-sm' : 'bg-gray-700/50 rounded-bl-sm'}`}>
                            {msg.content}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-4 border-t border-gray-700/50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-gray-700/50 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-600/50"
                    />
                    <button onClick={handleSendMessage} disabled={!newMessage.trim()} className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50">
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Files Panel */}
            {activePanel === 'files' && (
              <div className="flex-1 overflow-y-auto p-4">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-purple-500 hover:bg-purple-500/5 transition-all mb-4 group">
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3 group-hover:text-purple-400" />
                  <p className="text-gray-400 text-sm group-hover:text-gray-300">Click to upload files</p>
                </button>
                <div className="space-y-2">
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between bg-gray-700/30 rounded-xl p-4 border border-gray-700/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium truncate max-w-[180px]">{file.name}</p>
                          <p className="text-xs text-gray-400">{file.size} • {file.uploadedBy}</p>
                        </div>
                      </div>
                      <a href={file.url} download={file.name} className="p-2 hover:bg-gray-600 rounded-lg">
                        <Download className="w-5 h-5 text-gray-400" />
                      </a>
                    </div>
                  ))}
                  {files.length === 0 && (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500">No files shared yet</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Whiteboard Panel - Real-time */}
            {activePanel === 'whiteboard' && (
              <>
                <div className="p-3 border-b border-gray-700/50 flex items-center gap-2 flex-wrap">
                  <button onClick={() => setDrawTool('pen')} className={`p-2.5 rounded-lg ${drawTool === 'pen' ? 'bg-purple-600 text-white' : 'hover:bg-gray-700 text-gray-400'}`}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDrawTool('eraser')} className={`p-2.5 rounded-lg ${drawTool === 'eraser' ? 'bg-purple-600 text-white' : 'hover:bg-gray-700 text-gray-400'}`}>
                    <Eraser className="w-4 h-4" />
                  </button>
                  <div className="w-px h-6 bg-gray-600" />
                  <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="w-8 h-8 rounded-lg cursor-pointer bg-transparent" />
                  <input type="range" min="1" max="20" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-20 accent-purple-500" />
                  <div className="flex-1" />
                  <button onClick={clearWhiteboard} className="p-2.5 hover:bg-red-500/20 rounded-lg group">
                    <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-400" />
                  </button>
                </div>
                <div className="flex-1 p-3 overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={350}
                    height={400}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="bg-gray-900 rounded-xl cursor-crosshair w-full border border-gray-700/50"
                    style={{ touchAction: 'none' }}
                  />
                  <p className="text-xs text-gray-500 text-center mt-2">
                    {isConnected ? '✓ Real-time sync enabled' : '⚠ Offline mode'}
                  </p>
                </div>
              </>
            )}

            {/* Code Panel */}
            {activePanel === 'code' && (
              <>
                <div className="p-3 border-b border-gray-700/50 flex items-center gap-2">
                  <select value={codeLanguage} onChange={(e) => setCodeLanguage(e.target.value)} className="bg-gray-700/50 text-white px-3 py-2 rounded-lg text-sm focus:outline-none border border-gray-600/50">
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="sql">SQL</option>
                  </select>
                  <div className="flex-1" />
                  <button onClick={handleShareCode} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700">
                    <Send className="w-4 h-4" />
                    Share
                  </button>
                </div>
                <div className="flex-1 p-3">
                  <textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full h-full bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none border border-gray-700/50"
                    spellCheck={false}
                  />
                </div>
              </>
            )}

            {/* Notes Panel */}
            {activePanel === 'notes' && (
              <>
                <div className="p-3 border-b border-gray-700/50 flex items-center justify-between">
                  <span className="text-sm text-gray-400 flex items-center gap-2">
                    <StickyNote className="w-4 h-4" />
                    Session Notes
                  </span>
                  {isExpert && (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 text-xs rounded-lg">
                      <Save className="w-3 h-3" />
                      Auto-saved
                    </span>
                  )}
                </div>
                <div className="flex-1 p-3">
                  <textarea
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder={isExpert ? "Take session notes here..." : "Expert notes will appear here"}
                    className="w-full h-full bg-gray-900/50 text-gray-200 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none border border-gray-700/50"
                    disabled={!isExpert}
                  />
                </div>
              </>
            )}
          </div>

          {/* Participants */}
          <div className="border-t border-gray-700/50 p-4">
            <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
              <Users className="w-4 h-4" />
              Participants ({participants.length})
            </h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/30">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium ${p.role === 'expert' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'}`}>
                    {p.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate flex items-center gap-1.5">
                      {p.name}
                      {p.role === 'expert' && <Award className="w-3 h-3 text-yellow-400" />}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{p.role}</p>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full ${p.isOnline ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionRoom;
