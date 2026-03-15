import { useEffect, useRef, useCallback, useState } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
// @ts-expect-error - SockJS types are not available
import SockJS from 'sockjs-client/dist/sockjs';
import { resolveSockJsUrl } from '@/config/env';

interface UseWebSocketOptions {
  groupId: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMessage: (message: any) => void;
}

export const useWebSocket = ({ groupId, onMessage }: UseWebSocketOptions) => {
  const clientRef = useRef<Client | null>(null);
  const token = localStorage.getItem('token');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

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
        console.log('STOMP Debug:', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('WebSocket connected!');
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionError(null);

        client.subscribe(`/topic/group/${groupId}`, (message: IMessage) => {
          try {
            const parsedMessage = JSON.parse(message.body);
            console.log('Received message:', parsedMessage);
            onMessageRef.current(parsedMessage);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        });
      },
      onDisconnect: () => {
        console.log('WebSocket disconnected');
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
  }, [groupId, token]);

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

  const sendMessage = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (destination: string, body: any) => {
      if (clientRef.current?.active) {
        clientRef.current.publish({
          destination,
          body: JSON.stringify(body),
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      }
    },
    [token]
  );

  useEffect(() => {
    if (groupId > 0) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, groupId]);

  return {
    isConnected,
    isConnecting,
    connectionError,
    sendMessage,
    reconnect,
  };
};

export default useWebSocket;
