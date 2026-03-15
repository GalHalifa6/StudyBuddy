package com.studybuddy.common.config;

import com.studybuddy.expert.model.ExpertSession;
import com.studybuddy.expert.repository.ExpertSessionRepository;
import com.studybuddy.expert.repository.SessionParticipantRepository;
import com.studybuddy.messaging.model.Conversation;
import com.studybuddy.messaging.repository.ConversationRepository;
import com.studybuddy.group.repository.StudyGroupRepository;
import com.studybuddy.security.JwtUtils;
import com.studybuddy.security.UserDetailsServiceImpl;
import com.studybuddy.user.model.User;
import com.studybuddy.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.security.Principal;
import java.util.Map;
import java.util.Objects;

@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(WebSocketAuthChannelInterceptor.class);

    private final JwtUtils jwtUtils;
    private final UserDetailsServiceImpl userDetailsService;
    private final UserRepository userRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final ExpertSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;
    private final ConversationRepository conversationRepository;

    public WebSocketAuthChannelInterceptor(
            JwtUtils jwtUtils,
            UserDetailsServiceImpl userDetailsService,
            UserRepository userRepository,
            StudyGroupRepository studyGroupRepository,
            ExpertSessionRepository sessionRepository,
            SessionParticipantRepository participantRepository,
            ConversationRepository conversationRepository) {
        this.jwtUtils = jwtUtils;
        this.userDetailsService = userDetailsService;
        this.userRepository = userRepository;
        this.studyGroupRepository = studyGroupRepository;
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
        this.conversationRepository = conversationRepository;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        StompCommand command = accessor.getCommand();
        if (command != StompCommand.CONNECT && command != StompCommand.SUBSCRIBE && command != StompCommand.SEND) {
            return message;
        }

        Authentication authentication = resolveAuthentication(accessor);
        if (authentication == null) {
            throw new AccessDeniedException("WebSocket authentication required");
        }

        accessor.setUser(authentication);

        if (command == StompCommand.SUBSCRIBE || command == StompCommand.SEND) {
            authorizeDestination(accessor.getDestination(), authentication);
        }

        return message;
    }

    private Authentication resolveAuthentication(StompHeaderAccessor accessor) {
        Principal currentUser = accessor.getUser();
        if (currentUser instanceof Authentication authentication && authentication.isAuthenticated()) {
            return authentication;
        }

        String token = extractToken(accessor);
        if (!StringUtils.hasText(token) || !jwtUtils.validateJwtToken(token)) {
            return null;
        }

        String username = jwtUtils.getUsernameFromJwtToken(token);
        if (!StringUtils.hasText(username)) {
            return null;
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        if (!jwtUtils.validateToken(token, userDetails)) {
            return null;
        }

        return new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
    }

    private String extractToken(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }

        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes == null) {
            return null;
        }

        Object token = sessionAttributes.get(WebSocketHandshakeInterceptor.TOKEN_ATTRIBUTE);
        if (token instanceof String tokenValue && StringUtils.hasText(tokenValue)) {
            return tokenValue;
        }

        return null;
    }

    private void authorizeDestination(String destination, Authentication authentication) {
        if (!StringUtils.hasText(destination)) {
            return;
        }

        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new AccessDeniedException("Unknown WebSocket user"));

        if (destination.startsWith("/topic/group/")) {
            Long groupId = extractId(destination, "/topic/group/");
            if (groupId == null || !studyGroupRepository.isUserMemberOfGroup(groupId, currentUser.getId())) {
                log.warn("Rejected WebSocket access to {} for user {}", destination, currentUser.getUsername());
                throw new AccessDeniedException("Not authorized for this group");
            }
            return;
        }

        if (destination.startsWith("/topic/session/") || destination.startsWith("/app/session/")) {
            String prefix = destination.startsWith("/topic/session/") ? "/topic/session/" : "/app/session/";
            Long sessionId = extractId(destination, prefix);
            if (sessionId == null || !hasSessionAccess(sessionId, currentUser)) {
                log.warn("Rejected WebSocket access to {} for user {}", destination, currentUser.getUsername());
                throw new AccessDeniedException("Not authorized for this session");
            }
            return;
        }

        if (destination.startsWith("/topic/dm/")) {
            Long conversationId = extractId(destination, "/topic/dm/");
            if (conversationId == null || !hasConversationAccess(conversationId, currentUser)) {
                log.warn("Rejected WebSocket access to {} for user {}", destination, currentUser.getUsername());
                throw new AccessDeniedException("Not authorized for this conversation");
            }
        }
    }

    private boolean hasSessionAccess(Long sessionId, User user) {
        ExpertSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null || user == null) {
            return false;
        }

        boolean isExpert = session.getExpert() != null && Objects.equals(session.getExpert().getId(), user.getId());
        return isExpert || participantRepository.existsBySessionIdAndUserId(sessionId, user.getId());
    }

    private boolean hasConversationAccess(Long conversationId, User user) {
        Conversation conversation = conversationRepository.findById(conversationId).orElse(null);
        return conversation != null && conversation.hasParticipant(user);
    }

    private Long extractId(String destination, String prefix) {
        if (!destination.startsWith(prefix)) {
            return null;
        }

        String remainder = destination.substring(prefix.length());
        String idPart = remainder.split("/")[0];
        if (!StringUtils.hasText(idPart)) {
            return null;
        }

        try {
            return Long.valueOf(idPart);
        } catch (NumberFormatException ex) {
            return null;
        }
    }
}
