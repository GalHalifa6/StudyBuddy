package com.studybuddy.controller;

import com.studybuddy.dto.ExpertDto;
import com.studybuddy.dto.SessionActionResponse;
import com.studybuddy.dto.SessionDto;
import com.studybuddy.model.*;
import com.studybuddy.repository.*;
import com.studybuddy.service.NotificationService;
import com.studybuddy.service.SessionService;
import com.studybuddy.service.MeetingService;
import com.studybuddy.service.JitsiJwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Session Controller - Handles public session browsing and joining
 */
@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExpertSessionRepository sessionRepository;

    @Autowired
    private SessionParticipantRepository participantRepository;

    @Autowired
    private CourseRepository courseRepository;
    
    @Autowired
    private ExpertProfileRepository expertProfileRepository;
    
    @Autowired
    private NotificationService notificationService;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private UserTopicRepository userTopicRepository;

    @Autowired
    private SessionTopicRepository sessionTopicRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private com.studybuddy.repository.SessionMessageRepository sessionMessageRepository;

    @Autowired
    private MeetingService meetingService;

    @Autowired
    private JitsiJwtService jitsiJwtService;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
    
    /**
     * Get ALL sessions in the system (for admin/staff view)
     * No filtering by enrollment or topics
     */
    @GetMapping("/all")
    public ResponseEntity<List<Map<String, Object>>> getAllSessions(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) String search) {
        
        LocalDateTime now = LocalDateTime.now();
        User currentUser = getCurrentUser();
        
        List<ExpertSession> sessions;
        
        // Get all upcoming sessions regardless of enrollment
        if (courseId != null) {
            sessions = sessionRepository.findByCourseIdAndScheduledEndTimeAfterOrderByScheduledStartTimeAsc(courseId, now);
        } else {
            sessions = sessionRepository.findByScheduledEndTimeAfterOrderByScheduledStartTimeAsc(now);
        }
        
        // Minimal filtering - only show scheduled/active sessions that aren't cancelled
        sessions = sessions.stream()
            .filter(s -> s.getStatus() == ExpertSession.SessionStatus.SCHEDULED || 
                        s.getStatus() == ExpertSession.SessionStatus.IN_PROGRESS)
            .filter(s -> !Boolean.TRUE.equals(s.getIsCancelled()))
            .collect(Collectors.toList());
        
        // Apply type filter if specified
        if (type != null && !type.isEmpty()) {
            sessions = sessions.stream()
                .filter(s -> s.getSessionType().name().equalsIgnoreCase(type))
                .collect(Collectors.toList());
        }
        
        // Apply search filter
        if (search != null && !search.isEmpty()) {
            String searchLower = search.toLowerCase();
            sessions = sessions.stream()
                .filter(s -> s.getTitle().toLowerCase().contains(searchLower) ||
                            (s.getDescription() != null && s.getDescription().toLowerCase().contains(searchLower)) ||
                            (s.getExpert() != null && s.getExpert().getFullName() != null && 
                             s.getExpert().getFullName().toLowerCase().contains(searchLower)))
                .collect(Collectors.toList());
        }
        
        // Add expert info to response
        List<Map<String, Object>> result = sessions.stream()
            .map(s -> {
                Map<String, Object> map = toSessionMap(s);
                // Add isJoined status for current user
                boolean isJoined = participantRepository.existsBySessionIdAndUserId(s.getId(), currentUser.getId());
                map.put("isJoined", isJoined);
                // Add expert profile info if available
                if (s.getExpert() != null) {
                    ExpertProfile profile = expertProfileRepository.findByUser(s.getExpert()).orElse(null);
                    if (profile != null) {
                        Map<String, Object> expertInfo = (Map<String, Object>) map.get("expert");
                        expertInfo.put("title", profile.getTitle());
                        expertInfo.put("averageRating", profile.getAverageRating());
                        expertInfo.put("isVerified", profile.getIsVerified());
                    }
                }
                return map;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Browse all available sessions (for students to discover)
     * Shows upcoming and active public sessions
     */
    @GetMapping("/browse")
    public ResponseEntity<List<Map<String, Object>>> browseSessions(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) String search) {
        
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime twoWeeksFromNow = now.plusDays(14);
        User currentUser = getCurrentUser();
        boolean isPrivileged = currentUser.getRole() == Role.ADMIN || currentUser.getRole() == Role.EXPERT;
        Set<Long> enrolledCourseIds = currentUser.getCourses() == null
            ? new HashSet<>()
            : currentUser.getCourses().stream()
                .map(Course::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        
        // Get user's topics for filtering
        List<UserTopic> userTopics = userTopicRepository.findByUserId(currentUser.getId());
        Set<Long> userTopicIds = userTopics.stream()
                .map(ut -> ut.getTopic().getId())
                .collect(Collectors.toSet());
        
        List<ExpertSession> sessions;
        
        // Get upcoming sessions
        if (courseId != null) {
            sessions = sessionRepository.findByCourseIdAndScheduledEndTimeAfterOrderByScheduledStartTimeAsc(courseId, now);
        } else {
            sessions = sessionRepository.findByScheduledEndTimeAfterOrderByScheduledStartTimeAsc(now);
        }
        
        // Filter sessions
        sessions = sessions.stream()
            .filter(s -> canBrowseSession(s, currentUser, isPrivileged, enrolledCourseIds))
            .filter(s -> s.getStatus() == ExpertSession.SessionStatus.SCHEDULED || 
                        s.getStatus() == ExpertSession.SessionStatus.IN_PROGRESS)
            .filter(s -> !Boolean.TRUE.equals(s.getIsCancelled()))
            // Only show sessions that can accept more participants (excluding private 1-on-1 with assigned student)
            .filter(s -> {
                // For ONE_ON_ONE sessions, only show if no student is assigned yet OR if it's open registration
                if (s.getSessionType() == ExpertSession.SessionType.ONE_ON_ONE) {
                    return s.getStudent() == null; // Only browsable if no specific student assigned
                }
                // For other session types, show if there's room
                return s.getCurrentParticipants() < s.getMaxParticipants();
            })
            .filter(s -> s.getScheduledStartTime().isBefore(twoWeeksFromNow))
            // Filter by topic intersection if user has topics
            .filter(s -> {
                if (userTopicIds.isEmpty()) {
                    return true; // Show all sessions if user hasn't selected topics yet
                }
                // Check if session has any topics that match user's topics
                if (s.getSessionTopics() == null || s.getSessionTopics().isEmpty()) {
                    return false; // Don't show sessions without topics if user has topics
                }
                Set<Long> sessionTopicIds = s.getSessionTopics().stream()
                        .map(st -> st.getTopic().getId())
                        .collect(Collectors.toSet());
                // Session must have at least one topic in common with user
                return sessionTopicIds.stream().anyMatch(userTopicIds::contains);
            })
            .collect(Collectors.toList());
        
        // Apply type filter if specified
        if (type != null && !type.isEmpty()) {
            sessions = sessions.stream()
                .filter(s -> s.getSessionType().name().equalsIgnoreCase(type))
                .collect(Collectors.toList());
        }
        
        // Apply search filter
        if (search != null && !search.isEmpty()) {
            String searchLower = search.toLowerCase();
            sessions = sessions.stream()
                .filter(s -> s.getTitle().toLowerCase().contains(searchLower) ||
                            (s.getDescription() != null && s.getDescription().toLowerCase().contains(searchLower)) ||
                            (s.getExpert() != null && s.getExpert().getFullName() != null && 
                             s.getExpert().getFullName().toLowerCase().contains(searchLower)))
                .collect(Collectors.toList());
        }
        
        // Add expert info to response
        List<Map<String, Object>> result = sessions.stream()
            .map(s -> {
                Map<String, Object> map = toSessionMap(s);
                // Add isJoined status for current user
                boolean isJoined = participantRepository.existsBySessionIdAndUserId(s.getId(), currentUser.getId());
                map.put("isJoined", isJoined);
                // Add expert profile info if available
                if (s.getExpert() != null) {
                    ExpertProfile profile = expertProfileRepository.findByUser(s.getExpert()).orElse(null);
                    if (profile != null) {
                        Map<String, Object> expertInfo = (Map<String, Object>) map.get("expert");
                        expertInfo.put("title", profile.getTitle());
                        expertInfo.put("averageRating", profile.getAverageRating());
                        expertInfo.put("isVerified", profile.getIsVerified());
                    }
                }
                return map;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }
    
    /**
     * Get upcoming sessions for a student (sessions they've joined)
     */
    @GetMapping("/my-upcoming")
    public ResponseEntity<List<Map<String, Object>>> getMyUpcomingSessions() {
        User user = getCurrentUser();
        LocalDateTime now = LocalDateTime.now();
        
        List<SessionParticipant> participants = participantRepository.findByUserId(user.getId());
        
        List<Map<String, Object>> upcomingSessions = participants.stream()
            .filter(p -> {
                ExpertSession session = p.getSession();
                // Exclude completed and cancelled sessions
                if (session.getStatus() == ExpertSession.SessionStatus.COMPLETED || 
                    session.getStatus() == ExpertSession.SessionStatus.CANCELLED ||
                    Boolean.TRUE.equals(session.getIsCancelled())) {
                    return false;
                }
                // Include if scheduled in future or currently in progress
                return session.getScheduledStartTime().isAfter(now) ||
                       session.getStatus() == ExpertSession.SessionStatus.IN_PROGRESS;
            })
            .sorted((a, b) -> a.getSession().getScheduledStartTime().compareTo(b.getSession().getScheduledStartTime()))
            .map(p -> {
                Map<String, Object> map = toSessionMap(p.getSession());
                map.put("isJoined", true); // User is joined since they're a participant
                map.put("participantStatus", p.getStatus().name());
                map.put("registeredAt", p.getRegisteredAt());
                return map;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(upcomingSessions);
    }
    
    /**
     * Check if user has any upcoming sessions (for sidebar badge)
     */
    @GetMapping("/my-upcoming/count")
    public ResponseEntity<Map<String, Object>> getMyUpcomingSessionsCount() {
        User user = getCurrentUser();
        LocalDateTime now = LocalDateTime.now();
        
        List<SessionParticipant> participants = participantRepository.findByUserId(user.getId());
        
        long count = participants.stream()
            .filter(p -> {
                ExpertSession session = p.getSession();
                // Exclude completed and cancelled sessions
                if (session.getStatus() == ExpertSession.SessionStatus.COMPLETED || 
                    session.getStatus() == ExpertSession.SessionStatus.CANCELLED ||
                    Boolean.TRUE.equals(session.getIsCancelled())) {
                    return false;
                }
                // Include if scheduled in future or currently in progress
                return session.getScheduledStartTime().isAfter(now) ||
                       session.getStatus() == ExpertSession.SessionStatus.IN_PROGRESS;
            })
            .count();
        
        return ResponseEntity.ok(Map.of("count", count));
    }
    
    /**
     * Get session participants (for session owners/experts)
     */
    @GetMapping("/{sessionId}/participants")
    public ResponseEntity<?> getSessionParticipants(@PathVariable Long sessionId) {
        ExpertSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        
        List<SessionParticipant> participants = participantRepository.findBySessionId(sessionId);
        
        List<Map<String, Object>> result = participants.stream()
            .map(p -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", p.getId());
                map.put("userId", p.getUser().getId());
                map.put("fullName", p.getUser().getFullName());
                map.put("username", p.getUser().getUsername());
                map.put("status", p.getStatus().name());
                map.put("registeredAt", p.getRegisteredAt());
                map.put("joinedAt", p.getJoinedAt());
                return map;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    /**
     * Get active and upcoming sessions for a course
     */
    @GetMapping("/course/{courseId}/active")
    public ResponseEntity<List<Map<String, Object>>> getActiveCourseSession(@PathVariable Long courseId) {
        LocalDateTime now = LocalDateTime.now();
        
        // Get sessions that are either:
        // 1. Currently active (between start and end time)
        // 2. Upcoming (start time in the future) within next 7 days
        LocalDateTime weekFromNow = now.plusDays(7);
        
        List<ExpertSession> sessions = sessionRepository.findByCourseIdAndScheduledEndTimeAfterOrderByScheduledStartTimeAsc(
            courseId, now);
        
        // Filter to show only relevant sessions
        sessions = sessions.stream()
            .filter(s -> s.getStatus() == ExpertSession.SessionStatus.SCHEDULED || 
                        s.getStatus() == ExpertSession.SessionStatus.IN_PROGRESS)
            .filter(s -> !Boolean.TRUE.equals(s.getIsCancelled()))
            .filter(s -> s.getScheduledStartTime().isBefore(weekFromNow))
            .collect(Collectors.toList());
        
        List<Map<String, Object>> result = sessions.stream()
            .map(this::toSessionMap)
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    /**
     * Get session by ID
     */
    @GetMapping("/{sessionId}")
    public ResponseEntity<?> getSession(@PathVariable Long sessionId) {
        ExpertSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(toSessionMap(session));
    }

    /**
     * Join a session
     */
    @PostMapping("/{sessionId}/join")
    public ResponseEntity<SessionActionResponse> joinSession(@PathVariable Long sessionId) {
        User user = getCurrentUser();
        SessionDto session = sessionService.joinSession(sessionId, user.getId());
        SessionActionResponse response = new SessionActionResponse(
                "Successfully registered for session",
                session,
                true
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Leave/cancel registration for a session
     */
    @PostMapping("/{sessionId}/leave")
    public ResponseEntity<SessionActionResponse> leaveSession(@PathVariable Long sessionId) {
        User user = getCurrentUser();
        SessionDto session = sessionService.leaveSession(sessionId, user.getId());
        SessionActionResponse response = new SessionActionResponse(
                "Successfully left session",
                session,
                false
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Get my registered sessions
     */
    @GetMapping("/my-sessions")
    public ResponseEntity<List<Map<String, Object>>> getMySessions() {
        User user = getCurrentUser();
        List<SessionParticipant> participants = participantRepository.findByUserId(user.getId());
        
        List<Map<String, Object>> sessions = participants.stream()
            .map(p -> {
                Map<String, Object> map = toSessionMap(p.getSession());
                map.put("participantStatus", p.getStatus().name());
                map.put("registeredAt", p.getRegisteredAt());
                return map;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(sessions);
    }

    /**
     * Check if user is registered for a session
     */
    @GetMapping("/{sessionId}/my-status")
    public ResponseEntity<?> getMySessionStatus(@PathVariable Long sessionId) {
        User user = getCurrentUser();
        
        boolean isRegistered = participantRepository.existsBySessionIdAndUserId(sessionId, user.getId());
        SessionParticipant participant = null;
        
        if (isRegistered) {
            participant = participantRepository.findBySessionIdAndUserId(sessionId, user.getId()).orElse(null);
        }
        
        return ResponseEntity.ok(Map.of(
            "isRegistered", isRegistered,
            "status", participant != null ? participant.getStatus().name() : "NOT_REGISTERED"
        ));
    }

    /**
     * Provide Jitsi JWT + meeting URL for the current user.
     */
    @GetMapping("/{sessionId}/jitsi-auth")
    public ResponseEntity<?> getJitsiAuth(@PathVariable Long sessionId) {
        User user = getCurrentUser();
        ExpertSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }

        boolean isSessionExpert = session.getExpert() != null && Objects.equals(session.getExpert().getId(), user.getId());
        boolean isParticipant = participantRepository.existsBySessionIdAndUserId(sessionId, user.getId());

        if (!isSessionExpert && !isParticipant) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Not registered for this session"));
        }

        if (!session.canEnterRoom()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", "Session is not active yet"));
        }

        String roomName = meetingService.buildRoomName(sessionId);
        String meetingUrl = session.getMeetingLink() != null && !session.getMeetingLink().isEmpty()
                ? session.getMeetingLink()
                : meetingService.generateJitsiMeetingLink(sessionId);

        boolean isModerator = isSessionExpert || user.getRole() == Role.ADMIN;
        String jwt = jitsiJwtService.generateToken(roomName, user, isModerator);

        Map<String, Object> response = new HashMap<>();
        response.put("roomName", roomName);
        response.put("meetingUrl", meetingUrl);
        response.put("jwt", jwt);
        response.put("expiresAt", jitsiJwtService.getExpiryInstant().toString());

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> toSessionMap(ExpertSession session) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", session.getId());
        map.put("title", session.getTitle());
        map.put("description", session.getDescription());
        map.put("sessionType", session.getSessionType() != null ? session.getSessionType().name() : null);
        map.put("sessionTypeLabel", session.getSessionType() != null ? session.getSessionType().getDisplayName() : null);
        map.put("status", session.getStatus() != null ? session.getStatus().getDisplayName() : null);
        map.put("statusKey", session.getStatus() != null ? session.getStatus().name() : null);
        map.put("scheduledStartTime", session.getScheduledStartTime());
        map.put("scheduledEndTime", session.getScheduledEndTime());
        map.put("maxParticipants", session.getMaxParticipants());
        map.put("currentParticipants", session.getCurrentParticipants());
        map.put("meetingLink", session.getMeetingLink());
        map.put("meetingPlatform", session.getMeetingPlatform());
        map.put("isRecurring", session.getIsRecurring());
        map.put("canJoin", session.canJoin());
        map.put("isUpcoming", session.isUpcoming());
        
        if (session.getExpert() != null) {
            Map<String, Object> expert = new HashMap<>();
            expert.put("id", session.getExpert().getId());
            expert.put("fullName", session.getExpert().getFullName());
            map.put("expert", expert);
        }
        
        if (session.getCourse() != null) {
            Map<String, Object> course = new HashMap<>();
            course.put("id", session.getCourse().getId());
            course.put("code", session.getCourse().getCode());
            course.put("name", session.getCourse().getName());
            map.put("course", course);
        }
        
        return map;
    }

    private boolean canBrowseSession(ExpertSession session, User currentUser, boolean isPrivileged, Set<Long> enrolledCourseIds) {
        if (session.getCourse() == null) {
            return true;
        }
        if (isPrivileged) {
            return true;
        }
        if (session.getStudent() != null && Objects.equals(session.getStudent().getId(), currentUser.getId())) {
            return true;
        }
        Long courseId = session.getCourse().getId();
        return courseId != null && enrolledCourseIds.contains(courseId);
    }
    
    /**
     * Send a chat message in a session (REST endpoint for mobile compatibility)
     * This broadcasts the message via WebSocket so all clients receive it
     */
    @PostMapping("/{sessionId}/chat")
    public ResponseEntity<?> sendSessionMessage(
            @PathVariable Long sessionId,
            @RequestBody Map<String, Object> payload) {
        
        User sender = getCurrentUser();
        
        // Verify session exists
        ExpertSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Verify user is a participant
        boolean isParticipant = participantRepository.existsBySessionIdAndUserId(sessionId, sender.getId()) ||
                                Objects.equals(session.getExpert().getId(), sender.getId());
        
        if (!isParticipant) {
            return ResponseEntity.status(403).body(Map.of("message", "Not authorized to send messages in this session"));
        }
        
        // Build message response (same format as WebSocket)
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
        
        // Persist the message
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
        
        // Update message ID with database ID
        message.put("id", savedMessage.getId());
        
        System.out.println("REST: Broadcasting chat message to /topic/session/" + sessionId + "/chat: " + message);
        
        // Broadcast to all session participants via WebSocket
        messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/chat", message);
        
        return ResponseEntity.ok(message);
    }
    
    /**
     * Get chat messages for a session (for mobile polling)
     */
    @GetMapping("/{sessionId}/messages")
    public ResponseEntity<?> getSessionMessages(@PathVariable Long sessionId) {
        User user = getCurrentUser();
        
        // Verify session exists
        ExpertSession session = sessionRepository.findById(sessionId).orElse(null);
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Verify user is a participant
        boolean isParticipant = participantRepository.existsBySessionIdAndUserId(sessionId, user.getId()) ||
                                Objects.equals(session.getExpert().getId(), user.getId());
        
        if (!isParticipant) {
            return ResponseEntity.status(403).body(Map.of("message", "Not authorized to view messages in this session"));
        }
        
        // Get all messages for this session
        List<SessionMessage> messages = sessionMessageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        
        List<Map<String, Object>> result = messages.stream()
            .map(msg -> {
                Map<String, Object> msgMap = new HashMap<>();
                msgMap.put("id", msg.getId());
                msgMap.put("sessionId", sessionId);
                msgMap.put("senderId", msg.getSender().getId());
                msgMap.put("senderName", msg.getSender().getFullName() != null ? msg.getSender().getFullName() : msg.getSender().getUsername());
                msgMap.put("content", msg.getContent());
                msgMap.put("type", msg.getMessageType());
                msgMap.put("timestamp", msg.getCreatedAt().toString());
                if (msg.getFileUrl() != null) msgMap.put("fileUrl", msg.getFileUrl());
                if (msg.getFileName() != null) msgMap.put("fileName", msg.getFileName());
                if (msg.getLanguage() != null) msgMap.put("language", msg.getLanguage());
                return msgMap;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }
}
