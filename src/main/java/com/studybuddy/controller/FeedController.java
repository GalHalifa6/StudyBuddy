package com.studybuddy.controller;

import com.studybuddy.dto.FeedbackDto;
import com.studybuddy.dto.MiniFeedDto;
import com.studybuddy.dto.QuizDto;
import com.studybuddy.model.*;
import com.studybuddy.repository.ExpertProfileRepository;
import com.studybuddy.repository.ExpertSessionRepository;
import com.studybuddy.repository.MessageRepository;
import com.studybuddy.repository.SafetyFeedbackRepository;
import com.studybuddy.service.MatchingService;
import com.studybuddy.service.QuizService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Feed Controller - The Aggregator.
 * 
 * Aggregates recommendations from multiple services:
 * - Group matches (MatchingService)
 * - Upcoming sessions (ExpertSessionRepository)
 * - Suggested experts (ExpertProfileRepository)
 * 
 * Note: 
 * - Quiz/profiling endpoints are in QuizController
 * - Feedback collection endpoints are in PSFeedbackController
 */
@RestController
@RequestMapping("/api/feed")
@RequiredArgsConstructor
@Slf4j
public class FeedController {
    
    private final MatchingService matchingService;
    private final QuizService quizService;
    private final ExpertSessionRepository sessionRepository;
    private final ExpertProfileRepository expertRepository;
    private final MessageRepository messageRepository;
    private final com.studybuddy.repository.UserRepository userRepository;
    
    /**
     * GET /api/feed/student
     * 
     * Returns unified feed with prioritized items:
     * Priority 1: Quiz Status (if incomplete)
     * Priority 2: Recent group activities
     * Priority 3: Upcoming expert sessions
     * Priority 4: High % match study groups
     */
    @GetMapping("/student")
    public ResponseEntity<MiniFeedDto.Response> getStudentFeed(Authentication authentication) {
        try {
            log.info("=== FEED ENDPOINT CALLED ===");
            User currentUser = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            log.info("Fetching unified feed for user {} ({})", currentUser.getId(), currentUser.getUsername());
            
            List<MiniFeedDto.FeedItem> feedItems = new java.util.ArrayList<>();
        
        // ALWAYS add quiz reminder first if profile incomplete
        MiniFeedDto.FeedItem quizItem = null;
        try {
            quizItem = createQuizReminderItem(currentUser);
            if (quizItem != null) {
                log.info("Adding quiz reminder to feed");
                feedItems.add(quizItem);
            }
        } catch (Exception e) {
            log.error("Error creating quiz reminder for user {}: {}", currentUser.getId(), e.getMessage(), e);
        }
        
        // Collect all other feed items
        List<MiniFeedDto.FeedItem> activities = new java.util.ArrayList<>();
        try {
            activities = getRecentGroupActivities(currentUser);
            log.info("Found {} recent group activities", activities.size());
        } catch (Exception e) {
            log.error("Error getting group activities for user {}: {}", currentUser.getId(), e.getMessage(), e);
        }
        
        List<MiniFeedDto.FeedItem> sessions = new java.util.ArrayList<>();
        try {
            sessions = getUpcomingSessionItems(currentUser);
            log.info("Found {} upcoming sessions", sessions.size());
        } catch (Exception e) {
            log.error("Error getting upcoming sessions for user {}: {}", currentUser.getId(), e.getMessage(), e);
        }
        
        List<MiniFeedDto.FeedItem> matches = new java.util.ArrayList<>();
        try {
            matches = getGroupMatchItems(currentUser);
            log.info("Found {} group matches", matches.size());
        } catch (Exception e) {
            log.error("Error getting group matches for user {}: {}", currentUser.getId(), e.getMessage(), e);
        }
        
        // Smart interleaving: alternate between different types for diversity
        List<MiniFeedDto.FeedItem> mixedItems = interleaveItems(sessions, activities, matches);
        feedItems.addAll(mixedItems);
        
        // Limit total feed to 15 items (1 quiz + 14 others)
        if (feedItems.size() > 15) {
            feedItems = feedItems.subList(0, 15);
        }
        
        log.info("Total feed items: {} (Quiz: {}, Activities: {}, Sessions: {}, Matches: {})", 
                feedItems.size(), 
                quizItem != null ? 1 : 0,
                activities.size(),
                sessions.size(),
                matches.size());
        
        MiniFeedDto.ProfileSummary userProfile = getUserProfileSummary(currentUser);
        
            MiniFeedDto.Response response = MiniFeedDto.Response.builder()
                    .feedItems(feedItems)
                    .userProfile(userProfile)
                    .build();
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("=== FEED ENDPOINT ERROR ===", e);
            log.error("Error type: {}", e.getClass().getName());
            log.error("Error message: {}", e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
    
    // ==================== Helper Methods ====================
    
    /**
     * Priority 1: Create quiz reminder item if profile incomplete.
     * Returns null if quiz is completed or skipped (no reminder needed).
     */
    private MiniFeedDto.FeedItem createQuizReminderItem(User user) {
        try {
            log.info("Creating quiz reminder for user {}", user.getId());
            QuizDto.ProfileResponse profile = quizService.getUserProfile(user);
            
            if (profile == null) {
                log.warn("Profile is null for user {}, showing default reminder", user.getId());
                return MiniFeedDto.FeedItem.builder()
                        .itemType("QUIZ_REMINDER")
                        .priority(1)
                        .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))
                        .quizMessage("Complete the quiz for personalized group matches")
                        .questionsAnswered(0)
                        .totalQuestions(null)
                        .build();
            }
            
            // Get quiz status safely
            com.studybuddy.model.QuizStatus status = profile.getQuizStatus();
            log.info("User {} has quiz status: {}", user.getId(), status);
            
            // No reminder only for completed quizzes
            if (status == com.studybuddy.model.QuizStatus.COMPLETED) {
                log.info("User {} quiz is COMPLETED - no reminder needed", user.getId());
                return null;
            }
            
            // Show reminder for NOT_STARTED, IN_PROGRESS, or SKIPPED
            String message;
            if (status == com.studybuddy.model.QuizStatus.NOT_STARTED) {
                message = "Complete the quiz for personalized group matches";
                log.info("User {} hasn't started quiz - showing reminder", user.getId());
            } else if (status == com.studybuddy.model.QuizStatus.IN_PROGRESS) {
                Double reliability = profile.getReliabilityPercentage() != null ? profile.getReliabilityPercentage() : 0.0;
                int percentage = (int) Math.round(reliability * 100);
                message = String.format("Complete the remaining quiz questions for better matches (%d%% done)", percentage);
                log.info("User {} quiz is in progress ({}%) - showing reminder", user.getId(), percentage);
            } else if (status == com.studybuddy.model.QuizStatus.SKIPPED) {
                message = "You skipped the quiz. Complete it now for better group recommendations!";
                log.info("User {} skipped quiz - showing reminder to complete", user.getId());
            } else {
                message = "Complete the quiz for better group matching";
                log.info("User {} has unknown quiz status - showing default reminder", user.getId());
            }
            
            return MiniFeedDto.FeedItem.builder()
                    .itemType("QUIZ_REMINDER")
                    .priority(1)
                    .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))
                    .quizMessage(message)
                    .questionsAnswered(null)
                    .totalQuestions(null)
                    .build();
        } catch (Exception e) {
            log.error("Error creating quiz reminder item for user {}: {}", user.getId(), e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * Priority 2: Get recent activities from user's study groups.
     * Shows groups with unread messages (messages created after user joined or last seen).
     */
    private List<MiniFeedDto.FeedItem> getRecentGroupActivities(User student) {
        List<MiniFeedDto.FeedItem> activities = new java.util.ArrayList<>();
        
        try {
            // Get student's groups with null checks
            Set<StudyGroup> myGroups = student.getGroups();
            if (myGroups == null || myGroups.isEmpty()) {
                return activities;
            }
            
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime threeDaysAgo = now.minusDays(3);
            
            // For each group, check for recent messages
            for (StudyGroup group : myGroups) {
                if (group == null) continue;
                
                // Get recent messages in this group
                List<Message> recentMessages = messageRepository.findByGroupIdOrderByCreatedAtAsc(group.getId())
                    .stream()
                    .filter(msg -> msg != null && msg.getCreatedAt() != null && msg.getCreatedAt().isAfter(threeDaysAgo))
                    .filter(msg -> msg.getSender() != null && !msg.getSender().getId().equals(student.getId())) // Not sent by current user
                    .collect(Collectors.toList());
                
                if (!recentMessages.isEmpty()) {
                    Message latestMessage = recentMessages.get(recentMessages.size() - 1);
                    String groupName = group.getName() != null ? group.getName() : "Study Group";
                    String senderName = latestMessage.getSender() != null && latestMessage.getSender().getUsername() != null ?
                                       latestMessage.getSender().getUsername() : "Someone";
                    
                    int unreadCount = recentMessages.size();
                    String activityMsg = unreadCount == 1 ? 
                        String.format("%s sent a message", senderName) :
                        String.format("%d new messages", unreadCount);
                    
                    activities.add(MiniFeedDto.FeedItem.builder()
                            .itemType("GROUP_ACTIVITY")
                            .priority(2)
                            .timestamp(latestMessage.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME))
                            .groupId(group.getId())
                            .groupName(groupName)
                            .activityType("MESSAGE")
                            .activityMessage(activityMsg)
                            .actorName(senderName)
                            .build());
                }
            }
            
            // Sort by timestamp (most recent first) and limit to 5
            return activities.stream()
                .sorted((a, b) -> b.getTimestamp().compareTo(a.getTimestamp()))
                .limit(5)
                .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error fetching group activities for user {}: {}", student.getId(), e.getMessage());
            return activities;
        }
    }
    
    /**
     * Priority 3: Get upcoming expert sessions (within 7 days).
     * Sorted by urgency (sooner = higher priority).
     */
    private List<MiniFeedDto.FeedItem> getUpcomingSessionItems(User student) {
        try {
            Set<Course> studentCourses = student.getCourses();
            if (studentCourses == null || studentCourses.isEmpty()) {
                return List.of();
            }
            
            Set<Long> enrolledCourseIds = studentCourses.stream()
                    .filter(course -> course != null && course.getId() != null)
                    .map(Course::getId)
                    .collect(Collectors.toSet());
            
            if (enrolledCourseIds.isEmpty()) {
                return List.of();
            }
            
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime weekFromNow = now.plusDays(7);
            
            List<ExpertSession> allSessions = sessionRepository.findAll();
            if (allSessions == null) {
                return List.of();
            }
            
            return allSessions.stream()
                    .filter(session -> session != null && 
                                      session.getScheduledStartTime() != null &&
                                      session.getScheduledStartTime().isAfter(now) &&
                                      session.getScheduledStartTime().isBefore(weekFromNow))
                    .filter(session -> session.getCourse() != null &&
                                      enrolledCourseIds.contains(session.getCourse().getId()))
                    .filter(session -> {
                        // Only show sessions with available spots
                        int available = session.getMaxParticipants() - session.getCurrentParticipants();
                        return available > 0;
                    })
                    .sorted(Comparator.comparing(ExpertSession::getScheduledStartTime)) // Sooner first
                    .limit(8)
                    .map(session -> {
                        String expertName = session.getExpert() != null && session.getExpert().getFullName() != null ? 
                                           session.getExpert().getFullName() : "Expert";
                        String courseName = session.getCourse() != null && session.getCourse().getName() != null ? 
                                           session.getCourse().getName() : "General";
                        String sessionTitle = session.getTitle() != null ? session.getTitle() : "Study Session";
                        String timestamp = session.getScheduledStartTime() != null ? 
                                          session.getScheduledStartTime().format(DateTimeFormatter.ISO_DATE_TIME) : 
                                          now.format(DateTimeFormatter.ISO_DATE_TIME);
                        
                        return MiniFeedDto.FeedItem.builder()
                                .itemType("UPCOMING_SESSION")
                                .priority(3)
                                .timestamp(timestamp)
                                .sessionId(session.getId())
                                .sessionTitle(sessionTitle)
                                .expertName(expertName)
                                .courseName(courseName)
                                .scheduledAt(timestamp)
                                .availableSpots(session.getMaxParticipants() - session.getCurrentParticipants())
                                .build();
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error fetching upcoming sessions for user {}: {}", student.getId(), e.getMessage());
            return List.of();
        }
    }
    
    /**
     * Priority 4: Get high % match study groups.
     * Sorted by match quality and group health (not full, active).
     */
    private List<MiniFeedDto.FeedItem> getGroupMatchItems(User student) {
        List<MiniFeedDto.GroupRecommendation> matches = matchingService.getTopGroups(student);
        log.info("MatchingService returned {} group recommendations", matches.size());
        
        return matches.stream()
                .filter(match -> {
                    // Only show groups that aren't full
                    return match.getCurrentSize() < match.getMaxSize();
                })
                .sorted((m1, m2) -> {
                    // Sort by match percentage (higher = better)
                    return Integer.compare(m2.getMatchPercentage(), m1.getMatchPercentage());
                })
                .limit(10)
                .map(match -> MiniFeedDto.FeedItem.builder()
                        .itemType("GROUP_MATCH")
                        .priority(4)
                        .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))
                        .groupId(match.getGroupId())
                        .groupName(match.getGroupName())
                        .courseName(match.getCourseName())
                        .matchPercentage(match.getMatchPercentage())
                        .matchReason(match.getMatchReason())
                        .currentSize(match.getCurrentSize())
                        .maxSize(match.getMaxSize())
                        .build())
                .collect(Collectors.toList());
    }
    
    /**
     * Smart interleaving: Mix different feed types for diversity.
     * Prioritizes urgent sessions, then alternates between types.
     */
    private List<MiniFeedDto.FeedItem> interleaveItems(
            List<MiniFeedDto.FeedItem> sessions,
            List<MiniFeedDto.FeedItem> activities,
            List<MiniFeedDto.FeedItem> matches) {
        
        // Create mutable copies since input lists might be immutable
        List<MiniFeedDto.FeedItem> sessionsCopy = new java.util.ArrayList<>(sessions);
        List<MiniFeedDto.FeedItem> activitiesCopy = new java.util.ArrayList<>(activities);
        List<MiniFeedDto.FeedItem> matchesCopy = new java.util.ArrayList<>(matches);
        
        List<MiniFeedDto.FeedItem> result = new java.util.ArrayList<>();
        
        // Add urgent sessions first (within 24 hours)
        LocalDateTime tomorrow = LocalDateTime.now().plusDays(1);
        List<MiniFeedDto.FeedItem> urgentSessions = sessionsCopy.stream()
                .filter(s -> {
                    try {
                        LocalDateTime sessionTime = LocalDateTime.parse(s.getScheduledAt(), DateTimeFormatter.ISO_DATE_TIME);
                        return sessionTime.isBefore(tomorrow);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .limit(2)
                .collect(Collectors.toList());
        result.addAll(urgentSessions);
        sessionsCopy.removeAll(urgentSessions);
        
        // Now interleave: session, activity, match, activity, session, match...
        int maxItems = Math.max(Math.max(sessionsCopy.size(), activitiesCopy.size()), matchesCopy.size());
        for (int i = 0; i < maxItems; i++) {
            if (i < sessionsCopy.size()) result.add(sessionsCopy.get(i));
            if (i < activitiesCopy.size()) result.add(activitiesCopy.get(i));
            if (i < matchesCopy.size()) result.add(matchesCopy.get(i));
            if (i < activitiesCopy.size() - 1) {
                // Add extra activity for engagement
                result.add(activitiesCopy.get(Math.min(i + 1, activitiesCopy.size() - 1)));
            }
        }
        
        return result;
    }
    
    /**
     * Get user profile summary.
     */
    private MiniFeedDto.ProfileSummary getUserProfileSummary(User user) {
        QuizDto.ProfileResponse profile = quizService.getUserProfile(user);
        
        if (profile == null) {
            return MiniFeedDto.ProfileSummary.builder()
                    .hasProfile(false)
                    .message("Complete the quiz to get personalized recommendations")
                    .build();
        }
        
        return MiniFeedDto.ProfileSummary.builder()
                .hasProfile(true)
                .message("Profile active - receiving personalized matches")
                .build();
    }
}
