package com.studybuddy.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketAuthChannelInterceptor webSocketAuthChannelInterceptor;
    private final WebSocketHandshakeInterceptor webSocketHandshakeInterceptor;

    public WebSocketConfig(
            WebSocketAuthChannelInterceptor webSocketAuthChannelInterceptor,
            WebSocketHandshakeInterceptor webSocketHandshakeInterceptor) {
        this.webSocketAuthChannelInterceptor = webSocketAuthChannelInterceptor;
        this.webSocketHandshakeInterceptor = webSocketHandshakeInterceptor;
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple in-memory broker for subscriptions.
        config.enableSimpleBroker("/topic");
        // Prefix for messages sent from client to server.
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(webSocketAuthChannelInterceptor);
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .addInterceptors(webSocketHandshakeInterceptor)
                .setAllowedOriginPatterns("*")
                .withSockJS();

        registry.addEndpoint("/ws-native")
                .addInterceptors(webSocketHandshakeInterceptor)
                .setAllowedOriginPatterns("*");
    }
}
