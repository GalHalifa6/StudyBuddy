import { useEffect, useRef, useCallback, useState } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import { API_BASE_URL } from '../api/env';
import { getStoredToken } from '../auth/tokenStorage';

export interface SessionMessage {
  id: number;
  sessionId: number;
  senderId: number;
  senderName: string;
  content: string;
  type: 'text' | 'file' | 'code' | 'system';
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  language?: string;
}

export interface ParticipantInfo {
  id: number;
  name: string;
  role?: 'expert' | 'student';
}

interface UseSessionWebSocketOptions {
  sessionId: number;
  userId?: number;
  userName?: string;
  onMessage: (message: SessionMessage) => void;
  onParticipantJoin?: (participant: ParticipantInfo) => void;
  onParticipantLeave?: (participantId: number) => void;
  onSessionStatusChange?: (status: string) => void;
  /** Set to true to enable WebSocket connection. Default is true. */
  enabled?: boolean;
}

/**
 * Resolve WebSocket URL from API base URL
 */
const resolveWsUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // Convert HTTP/HTTPS API URL to WS/WSS WebSocket URL
  if (API_BASE_URL) {
    // Replace http:// with ws:// and https:// with wss://
    const wsBase = API_BASE_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    // Remove /api suffix if present since WebSocket endpoint is at root
    const baseWithoutApi = wsBase.replace(/\/api\/?$/, '');
    return `${baseWithoutApi}${normalizedPath}`;
  }
  
  // Fallback: assume same origin (development)
  return `ws://localhost:8080${normalizedPath}`;
};

/**
 * WebSocket hook for session real-time communication
 * Uses STOMP over native WebSocket for React Native compatibility
 */
export const useSessionWebSocket = ({
  sessionId,
  userId,
  userName,
  onMessage,
  onParticipantJoin,
  onParticipantLeave,
  onSessionStatusChange,
  enabled = false, // Disabled - use REST API for now (STOMP/SockJS requires protocol negotiation)
}: UseSessionWebSocketOptions) => {
  const clientRef = useRef<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const onMessageRef = useRef(onMessage);
  const onParticipantJoinRef = useRef(onParticipantJoin);
  const onParticipantLeaveRef = useRef(onParticipantLeave);
  const onSessionStatusChangeRef = useRef(onSessionStatusChange);

  // Keep refs updated
  useEffect(() => {
    onMessageRef.current = onMessage;
    onParticipantJoinRef.current = onParticipantJoin;
    onParticipantLeaveRef.current = onParticipantLeave;
    onSessionStatusChangeRef.current = onSessionStatusChange;
  }, [onMessage, onParticipantJoin, onParticipantLeave, onSessionStatusChange]);

  const connect = useCallback(() => {
    if (!enabled || sessionId <= 0) {
      return;
    }
    
    if (clientRef.current?.active) {
      console.log('[SessionWS] Already connected');
      return;
    }

    const token = getStoredToken();
    
    // Build WebSocket URL - use SockJS endpoint (works with native WebSocket too via SockJS protocol)
    // Note: For React Native, we'll use REST API fallback since STOMP/SockJS requires specific protocol
    const wsUrl = resolveWsUrl('/ws');
    const wsUrlWithToken = token ? `${wsUrl}?token=${encodeURIComponent(token)}` : wsUrl;
    
    console.log('[SessionWS] Connecting to:', wsUrlWithToken);
    
    const client = new Client({
      // Use native WebSocket for React Native
      webSocketFactory: () => {
        return new WebSocket(wsUrlWithToken);
      },
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      debug: (str) => {
        console.log('[SessionWS] STOMP:', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log(`[SessionWS] Connected for session ${sessionId}`);
        setIsConnected(true);
        setConnectionError(null);

        // Subscribe to session chat messages
        console.log(`[SessionWS] Subscribing to /topic/session/${sessionId}/chat`);
        client.subscribe(`/topic/session/${sessionId}/chat`, (message: IMessage) => {
          try {
            const parsedMessage = JSON.parse(message.body);
            console.log('[SessionWS] Received chat message:', parsedMessage);
            onMessageRef.current(parsedMessage);
          } catch (error) {
            console.error('[SessionWS] Error parsing message:', error);
          }
        });

        // Subscribe to participant updates
        client.subscribe(`/topic/session/${sessionId}/participants`, (message: IMessage) => {
          try {
            const data = JSON.parse(message.body);
            if (data.type === 'join' && onParticipantJoinRef.current) {
              onParticipantJoinRef.current(data.participant);
            } else if (data.type === 'leave' && onParticipantLeaveRef.current) {
              onParticipantLeaveRef.current(data.participantId);
            }
          } catch (error) {
            console.error('[SessionWS] Error parsing participant update:', error);
          }
        });

        // Subscribe to session status changes
        client.subscribe(`/topic/session/${sessionId}/status`, (message: IMessage) => {
          try {
            const data = JSON.parse(message.body);
            if (onSessionStatusChangeRef.current) {
              onSessionStatusChangeRef.current(data.status);
            }
          } catch (error) {
            console.error('[SessionWS] Error parsing status update:', error);
          }
        });
      },
      onDisconnect: () => {
        console.log('[SessionWS] Disconnected');
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error('[SessionWS] STOMP error:', frame);
        setConnectionError('Connection error occurred');
        setIsConnected(false);
      },
      onWebSocketError: (event) => {
        console.error('[SessionWS] WebSocket error:', event);
        setConnectionError('WebSocket connection failed');
        setIsConnected(false);
      },
    });

    clientRef.current = client;
    client.activate();
  }, [sessionId, enabled]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendChatMessage = useCallback(
    (
      content: string,
      type: 'text' | 'file' | 'code' = 'text',
      extra?: { fileUrl?: string; fileName?: string; language?: string }
    ) => {
      if (clientRef.current?.active) {
        const payload = {
          content,
          type,
          senderId: userId,
          senderName: userName,
          ...extra,
        };
        console.log('[SessionWS] Sending message:', payload);
        const token = getStoredToken();
        clientRef.current.publish({
          destination: `/app/session/${sessionId}/chat`,
          body: JSON.stringify(payload),
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        return true;
      } else {
        console.error('[SessionWS] Not connected, cannot send message');
        return false;
      }
    },
    [sessionId, userId, userName]
  );

  const notifyJoin = useCallback(() => {
    if (clientRef.current?.active) {
      console.log('[SessionWS] Notifying join for user:', userId, userName);
      const token = getStoredToken();
      clientRef.current.publish({
        destination: `/app/session/${sessionId}/join`,
        body: JSON.stringify({ userId, userName }),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    }
  }, [sessionId, userId, userName]);

  const notifyLeave = useCallback(() => {
    if (clientRef.current) {
      try {
        const token = getStoredToken();
        clientRef.current.publish({
          destination: `/app/session/${sessionId}/leave`,
          body: JSON.stringify({ userId, userName }),
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        console.log('[SessionWS] Leave notification sent for user:', userId, userName);
      } catch (e) {
        console.log('[SessionWS] Could not send leave notification (connection closing)');
      }
    }
  }, [sessionId, userId, userName]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [connect, disconnect]);

  useEffect(() => {
    if (enabled && sessionId > 0) {
      connect();
      return () => {
        disconnect();
      };
    }
  }, [sessionId, enabled, connect, disconnect]);

  return {
    isConnected,
    connectionError,
    sendChatMessage,
    notifyJoin,
    notifyLeave,
    reconnect,
  };
};

export default useSessionWebSocket;
