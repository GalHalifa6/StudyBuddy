import { useEffect, useRef, useCallback, useState } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
// @ts-ignore
import SockJS from 'sockjs-client/dist/sockjs';

interface UseWebSocketOptions {
  groupId: number;
  onMessage: (message: any) => void;
}

export const useWebSocket = ({ groupId, onMessage }: UseWebSocketOptions) => {
  const clientRef = useRef<Client | null>(null);
  const token = localStorage.getItem('token');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connect = useCallback(() => {
    if (clientRef.current?.active) {
      return;
    }

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
        console.log('WebSocket connected!');
        setIsConnected(true);
        setConnectionError(null);

        // Subscribe to the group's message topic
        client.subscribe(`/topic/group/${groupId}`, (message: IMessage) => {
          try {
            const parsedMessage = JSON.parse(message.body);
            console.log('Received message:', parsedMessage);
            onMessage(parsedMessage);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        });
      },
      onDisconnect: () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        setConnectionError('Connection error occurred');
        setIsConnected(false);
      },
      onWebSocketError: (event) => {
        console.error('WebSocket error:', event);
        setConnectionError('WebSocket connection failed');
        setIsConnected(false);
      },
    });

    clientRef.current = client;
    client.activate();
  }, [groupId, token, onMessage]);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.deactivate();
      clientRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendMessage = useCallback(
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
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionError,
    sendMessage,
    reconnect: connect,
  };
};

export default useWebSocket;
