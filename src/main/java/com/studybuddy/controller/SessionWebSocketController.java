package com.studybuddy.controller;

import com.studybuddy.model.*;
import com.studybuddy.repository.*;
import com.studybuddy.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * WebSocket Controller for real-time session features
 * Handles chat, whiteboard sync, and participant updates
 */
@Controller
public class SessionWebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExpertSessionRepository sessionRepository;

    @Autowired
    private JwtUtils jwtUtils;

    /**
     * Extract user from JWT token in headers
     */
    private User getUserFromHeaders(SimpMessageHeaderAccessor headerAccessor) {
        try {
            // Try to get token from native headers
            String authHeader = headerAccessor.getFirstNativeHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtUtils.validateJwtToken(token)) {
                    String username = jwtUtils.getUsernameFromJwtToken(token);
                    return userRepository.findByUsername(username).orElse(null);
                }
            }
        } catch (Exception e) {
            System.err.println("Error extracting user from WebSocket headers: " + e.getMessage());
        }
        return null;
    }

    /**
     * Handle real-time chat messages in a session
     */
    @MessageMapping("/session/{sessionId}/chat")
    public void handleSessionChat(
            @DestinationVariable Long sessionId,
            @Payload Map<String, Object> payload,
            SimpMessageHeaderAccessor headerAccessor) {
        
        User sender = getUserFromHeaders(headerAccessor);
        
        // Fallback: try to get user from payload if headers don't work
        if (sender == null && payload.containsKey("senderId")) {
            Long senderId = Long.valueOf(payload.get("senderId").toString());
            sender = userRepository.findById(senderId).orElse(null);
        }
        
        if (sender == null) {
            System.err.println("Could not identify sender for session chat");
            return;
        }

        // Verify session exists
        ExpertSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) return;

        // Build message response
        Map<String, Object> message = new HashMap<>();
        message.put("id", System.currentTimeMillis());
        message.put("sessionId", sessionId);
        message.put("senderId", sender.getId());
        message.put("senderName", sender.getFullName() != null ? sender.getFullName() : sender.getUsername());
        message.put("content", payload.get("content"));
        message.put("type", payload.getOrDefault("type", "text"));
        message.put("timestamp", LocalDateTime.now().toString());
        
        // Include optional fields
        if (payload.containsKey("fileUrl")) {
            message.put("fileUrl", payload.get("fileUrl"));
        }
        if (payload.containsKey("fileName")) {
            message.put("fileName", payload.get("fileName"));
        }
        if (payload.containsKey("language")) {
            message.put("language", payload.get("language"));
        }

        System.out.println("Broadcasting chat message to /topic/session/" + sessionId + "/chat: " + message);
        
        // Broadcast to all session participants
        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/chat", message);
    }

    /**
     * Handle real-time whiteboard updates
     */
    @MessageMapping("/session/{sessionId}/whiteboard")
    public void handleWhiteboardUpdate(
            @DestinationVariable Long sessionId,
            @Payload Map<String, Object> payload,
            SimpMessageHeaderAccessor headerAccessor) {
        
        System.out.println("Broadcasting whiteboard update to /topic/session/" + sessionId + "/whiteboard");
        
        // Broadcast whiteboard data to all session participants
        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/whiteboard", payload);
    }

    /**
     * Handle participant join notification
     */
    @MessageMapping("/session/{sessionId}/join")
    public void handleParticipantJoin(
            @DestinationVariable Long sessionId,
            @Payload Map<String, Object> payload,
            SimpMessageHeaderAccessor headerAccessor) {
        
        User user = getUserFromHeaders(headerAccessor);
        
        // Fallback: try to get user from payload
        if (user == null && payload != null && payload.containsKey("userId")) {
            Long userId = Long.valueOf(payload.get("userId").toString());
            user = userRepository.findById(userId).orElse(null);
        }
        
        if (user == null) {
            System.err.println("Could not identify user for join notification");
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

        System.out.println("Broadcasting join notification for " + user.getFullName() + " to /topic/session/" + sessionId + "/participants");
        
        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/participants", notification);
    }

    /**
     * Handle participant leave notification
     */
    @MessageMapping("/session/{sessionId}/leave")
    public void handleParticipantLeave(
            @DestinationVariable Long sessionId,
            @Payload Map<String, Object> payload,
            SimpMessageHeaderAccessor headerAccessor) {
        
        User user = getUserFromHeaders(headerAccessor);
        
        // Fallback: try to get user from payload
        if (user == null && payload != null && payload.containsKey("userId")) {
            Long userId = Long.valueOf(payload.get("userId").toString());
            user = userRepository.findById(userId).orElse(null);
        }
        
        if (user == null) {
            System.err.println("Could not identify user for leave notification");
            return;
        }

        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "leave");
        notification.put("participantId", user.getId());
        notification.put("participantName", user.getFullName() != null ? user.getFullName() : user.getUsername());
        notification.put("timestamp", LocalDateTime.now().toString());

        System.out.println("Broadcasting leave notification for " + user.getFullName());
        
        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/participants", notification);
    }

    /**
     * Broadcast session status change to all participants
     * Called by ExpertController when session starts/ends
     */
    public void broadcastSessionStatus(Long sessionId, String status) {
        Map<String, Object> statusUpdate = new HashMap<>();
        statusUpdate.put("status", status);
        statusUpdate.put("timestamp", LocalDateTime.now().toString());
        
        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/status", statusUpdate);
    }
}
