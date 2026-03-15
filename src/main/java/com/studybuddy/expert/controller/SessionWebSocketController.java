package com.studybuddy.expert.controller;

import com.studybuddy.expert.model.ExpertSession;
import com.studybuddy.expert.model.SessionMessage;
import com.studybuddy.expert.repository.ExpertSessionRepository;
import com.studybuddy.expert.repository.SessionMessageRepository;
import com.studybuddy.expert.repository.SessionParticipantRepository;
import com.studybuddy.security.JwtUtils;
import com.studybuddy.user.model.User;
import com.studybuddy.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

/**
 * WebSocket Controller for real-time session features
 * Handles chat, whiteboard sync, and participant updates
 */
@Controller
public class SessionWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(SessionWebSocketController.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExpertSessionRepository sessionRepository;

    @Autowired
    private SessionParticipantRepository participantRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private SessionMessageRepository sessionMessageRepository;

    /**
     * Extract user from authenticated WebSocket session or JWT token in headers.
     */
    private User getUserFromHeaders(SimpMessageHeaderAccessor headerAccessor) {
        try {
            if (headerAccessor.getUser() != null && headerAccessor.getUser().getName() != null) {
                return userRepository.findByUsername(headerAccessor.getUser().getName()).orElse(null);
            }

            String authHeader = headerAccessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                String username = jwtUtils.extractUsername(token);
                if (username != null) {
                    return userRepository.findByUsername(username).orElse(null);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to extract WebSocket user", e);
        }
        return null;
    }

    private boolean hasSessionAccess(ExpertSession session, User user) {
        if (session == null || user == null) {
            return false;
        }

        boolean isExpert = session.getExpert() != null && Objects.equals(session.getExpert().getId(), user.getId());
        return isExpert || participantRepository.existsBySessionIdAndUserId(session.getId(), user.getId());
    }

    /**
     * Handle real-time chat messages in a session.
     */
    @MessageMapping("/session/{sessionId}/chat")
    public void handleSessionChat(
            @DestinationVariable Long sessionId,
            @Payload Map<String, Object> payload,
            SimpMessageHeaderAccessor headerAccessor) {

        User sender = getUserFromHeaders(headerAccessor);
        if (sender == null) {
            log.warn("Rejected session chat for session {} because the sender could not be identified", sessionId);
            return;
        }

        ExpertSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) {
            log.warn("Rejected session chat because session {} does not exist", sessionId);
            return;
        }

        if (!hasSessionAccess(session, sender)) {
            log.warn("Rejected session chat for session {} from unauthorized user {}", sessionId, sender.getUsername());
            return;
        }

        Map<String, Object> message = new HashMap<>();
        message.put("id", System.currentTimeMillis());
        message.put("sessionId", sessionId);
        message.put("senderId", sender.getId());
        message.put("senderName", sender.getFullName() != null ? sender.getFullName() : sender.getUsername());
        message.put("content", payload.get("content"));
        message.put("type", payload.getOrDefault("type", "text"));
        message.put("timestamp", LocalDateTime.now().toString());

        if (payload.containsKey("fileUrl")) {
            message.put("fileUrl", payload.get("fileUrl"));
        }
        if (payload.containsKey("fileName")) {
            message.put("fileName", payload.get("fileName"));
        }
        if (payload.containsKey("language")) {
            message.put("language", payload.get("language"));
        }

        SessionMessage sessionMessage = SessionMessage.builder()
            .session(session)
            .sender(sender)
            .content((String) payload.get("content"))
            .messageType((String) payload.getOrDefault("type", "text"))
            .fileUrl(payload.containsKey("fileUrl") ? (String) payload.get("fileUrl") : null)
            .fileName(payload.containsKey("fileName") ? (String) payload.get("fileName") : null)
            .language(payload.containsKey("language") ? (String) payload.get("language") : null)
            .build();
        SessionMessage savedMessage = sessionMessageRepository.save(sessionMessage);

        message.put("id", savedMessage.getId());
        log.debug("Broadcasting session chat message {} to session {}", savedMessage.getId(), sessionId);
        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/chat", message);
    }

    /**
     * Handle real-time whiteboard updates.
     */
    @MessageMapping("/session/{sessionId}/whiteboard")
    public void handleWhiteboardUpdate(
            @DestinationVariable Long sessionId,
            @Payload Map<String, Object> payload,
            SimpMessageHeaderAccessor headerAccessor) {

        User sender = getUserFromHeaders(headerAccessor);
        ExpertSession session = sessionRepository.findById(sessionId).orElse(null);
        if (sender == null || !hasSessionAccess(session, sender)) {
            log.warn("Rejected whiteboard update for session {} from unauthorized user", sessionId);
            return;
        }

        Map<String, Object> update = new HashMap<>(payload);
        update.put("senderId", sender.getId());
        update.put("senderName", sender.getFullName() != null ? sender.getFullName() : sender.getUsername());
        update.put("timestamp", LocalDateTime.now().toString());

        log.debug("Broadcasting whiteboard update for session {}", sessionId);
        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/whiteboard", update);
    }

    /**
     * Handle participant join notification.
     */
    @MessageMapping("/session/{sessionId}/join")
    public void handleParticipantJoin(
            @DestinationVariable Long sessionId,
            @Payload Map<String, Object> payload,
            SimpMessageHeaderAccessor headerAccessor) {

        User user = getUserFromHeaders(headerAccessor);
        ExpertSession session = sessionRepository.findById(sessionId).orElse(null);
        if (user == null || !hasSessionAccess(session, user)) {
            log.warn("Rejected join notification for session {} from unauthorized user", sessionId);
            return;
        }

        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "join");
        notification.put("participant", Map.of(
            "id", user.getId(),
            "name", user.getFullName() != null ? user.getFullName() : user.getUsername(),
            "role", user.getRole().name().toLowerCase().contains("expert") ? "expert" : "student"
        ));
        notification.put("timestamp", LocalDateTime.now().toString());

        log.debug("Broadcasting join notification for user {} in session {}", user.getUsername(), sessionId);
        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/participants", notification);
    }

    /**
     * Handle participant leave notification.
     */
    @MessageMapping("/session/{sessionId}/leave")
    public void handleParticipantLeave(
            @DestinationVariable Long sessionId,
            @Payload Map<String, Object> payload,
            SimpMessageHeaderAccessor headerAccessor) {

        User user = getUserFromHeaders(headerAccessor);
        ExpertSession session = sessionRepository.findById(sessionId).orElse(null);
        if (user == null || !hasSessionAccess(session, user)) {
            log.warn("Rejected leave notification for session {} from unauthorized user", sessionId);
            return;
        }

        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "leave");
        notification.put("participantId", user.getId());
        notification.put("participantName", user.getFullName() != null ? user.getFullName() : user.getUsername());
        notification.put("timestamp", LocalDateTime.now().toString());

        log.debug("Broadcasting leave notification for user {} in session {}", user.getUsername(), sessionId);
        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/participants", notification);
    }

    /**
     * Broadcast session status change to all participants.
     * Called by ExpertController when session starts/ends.
     */
    public void broadcastSessionStatus(Long sessionId, String status) {
        Map<String, Object> statusUpdate = new HashMap<>();
        statusUpdate.put("status", status);
        statusUpdate.put("timestamp", LocalDateTime.now().toString());

        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/status", statusUpdate);
    }
}
