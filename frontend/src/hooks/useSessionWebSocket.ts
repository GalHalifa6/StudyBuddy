import { useEffect, useRef, useCallback, useState } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
// @ts-expect-error - SockJS types are not available
import SockJS from 'sockjs-client/dist/sockjs';
import { resolveSockJsUrl } from '@/config/env';

export interface SessionMessage {
  id: number;
  sessionId: number;
  senderId: number;
  senderName: string;
  content: string;
  type: 'text' | 'file' | 'code' | 'system' | 'whiteboard';
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  language?: string;
  drawData?: WhiteboardDrawData;
}

export interface WhiteboardDrawData {
  type: 'draw' | 'clear';
  points?: { x: number; y: number }[];
  color?: string;
  brushSize?: number;
  tool?: 'pen' | 'eraser';
}

interface UseSessionWebSocketOptions {
  sessionId: number;
  userId?: number;
  userName?: string;
  onMessage: (message: SessionMessage) => void;
  onWhiteboardUpdate?: (data: WhiteboardDrawData) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onParticipantJoin?: (participant: any) => void;
  onParticipantLeave?: (participantId: number) => void;
  onSessionStatusChange?: (status: string) => void;
}

export const useSessionWebSocket = ({
  sessionId,
  userId,
  userName,
  onMessage,
  onWhiteboardUpdate,
  onParticipantJoin,
  onParticipantLeave,
  onSessionStatusChange,
}: UseSessionWebSocketOptions) => {
  const clientRef = useRef<Client | null>(null);
  const token = localStorage.getItem('token');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const onMessageRef = useRef(onMessage);
  const onWhiteboardUpdateRef = useRef(onWhiteboardUpdate);
  const onParticipantJoinRef = useRef(onParticipantJoin);
  const onParticipantLeaveRef = useRef(onParticipantLeave);
  const onSessionStatusChangeRef = useRef(onSessionStatusChange);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onWhiteboardUpdateRef.current = onWhiteboardUpdate;
    onParticipantJoinRef.current = onParticipantJoin;
    onParticipantLeaveRef.current = onParticipantLeave;
    onSessionStatusChangeRef.current = onSessionStatusChange;
  }, [onMessage, onWhiteboardUpdate, onParticipantJoin, onParticipantLeave, onSessionStatusChange]);

  const connect = useCallback(() => {
    if (clientRef.current?.active) {
      return;
    }

    const sockJsUrl = resolveSockJsUrl('/ws');
    const sockJsUrlWithToken = token ? `${sockJsUrl}?token=${encodeURIComponent(token)}` : sockJsUrl;

    setIsConnecting(true);
    setConnectionError(null);

    const client = new Client({
      webSocketFactory: () => new SockJS(sockJsUrlWithToken),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      debug: (str) => {
        console.log('Session WebSocket Debug:', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log(`>>> Session WebSocket connected for session ${sessionId}!`);
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);

        client.subscribe(`/topic/session/${sessionId}/chat`, (message: IMessage) => {
          try {
            const parsedMessage = JSON.parse(message.body);
            console.log('>>> Received chat message via WebSocket:', parsedMessage);
            onMessageRef.current(parsedMessage);
          } catch (error) {
            console.error('Error parsing session message:', error);
          }
        });

        client.subscribe(`/topic/session/${sessionId}/whiteboard`, (message: IMessage) => {
          try {
            const data = JSON.parse(message.body);
            console.log('Received whiteboard update:', data);
            if (onWhiteboardUpdateRef.current) {
              onWhiteboardUpdateRef.current(data);
            }
          } catch (error) {
            console.error('Error parsing whiteboard data:', error);
          }
        });

        client.subscribe(`/topic/session/${sessionId}/participants`, (message: IMessage) => {
          try {
            const data = JSON.parse(message.body);
            if (data.type === 'join' && onParticipantJoinRef.current) {
              onParticipantJoinRef.current(data.participant);
            } else if (data.type === 'leave' && onParticipantLeaveRef.current) {
              onParticipantLeaveRef.current(data.participantId);
            }
          } catch (error) {
            console.error('Error parsing participant update:', error);
          }
        });

        client.subscribe(`/topic/session/${sessionId}/status`, (message: IMessage) => {
          try {
            const data = JSON.parse(message.body);
            if (onSessionStatusChangeRef.current) {
              onSessionStatusChangeRef.current(data.status);
            }
          } catch (error) {
            console.error('Error parsing status update:', error);
          }
        });
      },
      onDisconnect: () => {
        console.log('Session WebSocket disconnected');
        setIsConnected(false);
        setIsConnecting(false);
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        setConnectionError('Connection error occurred');
        setIsConnected(false);
        setIsConnecting(false);
      },
      onWebSocketError: (event) => {
        console.error('WebSocket error:', event);
        setConnectionError('WebSocket connection failed');
        setIsConnected(false);
        setIsConnecting(false);
      },
    });

    clientRef.current = client;
    client.activate();
  }, [sessionId, token]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      const client = clientRef.current;
      clientRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
      void client.deactivate();
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  const sendChatMessage = useCallback(
    (content: string, type: 'text' | 'file' | 'code' = 'text', extra?: { fileUrl?: string; fileName?: string; language?: string }) => {
      if (clientRef.current?.active) {
        const payload = {
          content,
          type,
          senderId: userId,
          senderName: userName,
          ...extra,
        };
        console.log('>>> Sending chat message to backend:', payload);
        clientRef.current.publish({
          destination: `/app/session/${sessionId}/chat`,
          body: JSON.stringify(payload),
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        console.log('>>> Chat message published');
      } else {
        console.error('>>> WebSocket not connected, cannot send message');
      }
    },
    [sessionId, token, userId, userName]
  );

  const sendWhiteboardUpdate = useCallback(
    (data: WhiteboardDrawData) => {
      if (clientRef.current?.active) {
        clientRef.current.publish({
          destination: `/app/session/${sessionId}/whiteboard`,
          body: JSON.stringify({
            ...data,
            senderId: userId,
          }),
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      }
    },
    [sessionId, token, userId]
  );

  const notifyJoin = useCallback(() => {
    if (clientRef.current?.active) {
      console.log('Notifying join for user:', userId, userName);
      clientRef.current.publish({
        destination: `/app/session/${sessionId}/join`,
        body: JSON.stringify({ userId, userName }),
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    }
  }, [sessionId, token, userId, userName]);

  const notifyLeave = useCallback(() => {
    if (clientRef.current) {
      try {
        clientRef.current.publish({
          destination: `/app/session/${sessionId}/leave`,
          body: JSON.stringify({ userId, userName }),
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        console.log('Leave notification sent for user:', userId, userName);
      } catch {
        console.log('Could not send leave notification (connection closing)');
      }
    }
  }, [sessionId, token, userId, userName]);

  useEffect(() => {
    if (sessionId > 0) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [sessionId, connect, disconnect]);

  return {
    isConnected,
    isConnecting,
    connectionError,
    sendChatMessage,
    sendWhiteboardUpdate,
    notifyJoin,
    notifyLeave,
    reconnect,
  };
};

export default useSessionWebSocket;
