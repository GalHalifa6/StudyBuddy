package com.studybuddy.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple in-memory broker for subscriptions
        // Clients subscribe to /topic/group/{groupId} to receive messages
        config.enableSimpleBroker("/topic");
        // Prefix for messages sent from client to server
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // WebSocket endpoint for clients to connect
        // Supports both web (SockJS) and mobile (native WebSocket) connections
        // Authorization header is extracted from STOMP connect headers in SessionWebSocketController
        // Token can also be passed via query param: /ws?token=... as fallback for mobile clients
        // setAllowedOriginPatterns("*") allows all origins including:
        //   - Web frontend (localhost:3000, localhost:5173, etc.)
        //   - Mobile apps (Expo Go, standalone builds)
        //   - Any other client connecting to the API
        
        // Native WebSocket endpoint for mobile clients
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*") // Allow all origins (web, mobile, Expo Go)
                .withSockJS(); // SockJS provides fallback for browsers that don't support WebSocket
        
        // Also register native WebSocket endpoint for React Native clients
        // This allows mobile apps to connect directly with native WebSocket without SockJS protocol
        registry.addEndpoint("/ws-native")
                .setAllowedOriginPatterns("*") // Allow all origins
                // No .withSockJS() - this is a native WebSocket endpoint
                ;
    }
}

