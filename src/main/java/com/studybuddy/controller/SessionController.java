package com.studybuddy.controller;

import com.studybuddy.dto.ExpertDto;
import com.studybuddy.model.*;
import com.studybuddy.repository.*;
import com.studybuddy.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
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
        
        List<ExpertSession> sessions;
        
        // Get upcoming sessions
        if (courseId != null) {
            sessions = sessionRepository.findByCourseIdAndScheduledEndTimeAfterOrderByScheduledStartTimeAsc(courseId, now);
        } else {
            sessions = sessionRepository.findByScheduledEndTimeAfterOrderByScheduledStartTimeAsc(now);
        }
        
        // Filter sessions
        sessions = sessions.stream()
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
        User currentUser = getCurrentUser();
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
            .filter(p -> p.getSession().getScheduledStartTime().isAfter(now) ||
                        p.getSession().getStatus() == ExpertSession.SessionStatus.IN_PROGRESS)
            .filter(p -> !Boolean.TRUE.equals(p.getSession().getIsCancelled()))
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
            .filter(p -> p.getSession().getScheduledStartTime().isAfter(now) ||
                        p.getSession().getStatus() == ExpertSession.SessionStatus.IN_PROGRESS)
            .filter(p -> !Boolean.TRUE.equals(p.getSession().getIsCancelled()))
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
    public ResponseEntity<?> joinSession(@PathVariable Long sessionId) {
        try {
            User user = getCurrentUser();
            ExpertSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
            
            // Check if session is full
            if (session.getCurrentParticipants() >= session.getMaxParticipants()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Session is full"));
            }
            
            // Check if session is cancelled
            if (Boolean.TRUE.equals(session.getIsCancelled())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Session has been cancelled"));
            }
            
            // Check if already registered
            if (participantRepository.existsBySessionIdAndUserId(sessionId, user.getId())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Already registered for this session"));
            }
            
            // Create participant record
            SessionParticipant participant = SessionParticipant.builder()
                .session(session)
                .user(user)
                .status(SessionParticipant.ParticipantStatus.REGISTERED)
                .registeredAt(LocalDateTime.now())
                .build();
            participantRepository.save(participant);
            
            // Update participant count
            session.setCurrentParticipants(session.getCurrentParticipants() + 1);
            sessionRepository.save(session);
            
            return ResponseEntity.ok(Map.of(
                "message", "Successfully registered for session",
                "session", toSessionMap(session)
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Leave/cancel registration for a session
     */
    @PostMapping("/{sessionId}/leave")
    public ResponseEntity<?> leaveSession(@PathVariable Long sessionId) {
        try {
            User user = getCurrentUser();
            
            SessionParticipant participant = participantRepository.findBySessionIdAndUserId(sessionId, user.getId())
                .orElseThrow(() -> new RuntimeException("Not registered for this session"));
            
            ExpertSession session = participant.getSession();
            
            // Remove participant
            participantRepository.delete(participant);
            
            // Update participant count
            session.setCurrentParticipants(Math.max(0, session.getCurrentParticipants() - 1));
            sessionRepository.save(session);
            
            return ResponseEntity.ok(Map.of("message", "Successfully left session"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
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
}
