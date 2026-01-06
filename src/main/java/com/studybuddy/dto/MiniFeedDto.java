package com.studybuddy.dto;

import com.studybuddy.model.RoleType;
import lombok.*;

import java.util.List;
import java.util.Map;

/**
 * DTOs for the MiniFeed aggregated response.
 */
public class MiniFeedDto {
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private List<FeedItem> feedItems; // Unified feed with mixed items
        private List<FeedItem> recommendedGroups; // Separate section for group recommendations
        private ProfileSummary userProfile;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeedItem {
        private String itemType; // "QUIZ_REMINDER", "UPCOMING_EVENT", "REGISTERED_SESSION", "RECOMMENDED_SESSION", "GROUP_MATCH"
        private Integer priority; // Lower number = higher priority
        private String timestamp;
        
        // Quiz reminder fields
        private String quizMessage;
        private Integer questionsAnswered;
        private Integer totalQuestions;
        
        // Event fields
        private Long eventId;
        private String eventTitle;
        private String eventType;
        private String eventDescription;
        private String eventLocation;
        private String eventMeetingLink;
        private String eventStartTime;
        private String eventEndTime;
        
        // Group match fields
        private Long groupId;
        private String groupName;
        private String courseName;
        private Integer matchPercentage;
        private String matchReason;
        private Integer currentSize;
        private Integer maxSize;
        
        // Session fields (both registered and recommended)
        private Long sessionId;
        private String sessionTitle;
        private String expertName;
        private String scheduledAt;
        private Integer availableSpots;
        private Boolean isRegistered; // true for registered sessions, false for recommendations
        private Integer topicMatchPercentage; // for recommended sessions
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizReminder {
        private Boolean shouldCompleteQuiz;
        private String message;
        private Integer questionsAnswered;
        private Integer totalQuestions;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GroupRecommendation {
        private Long groupId;
        private String groupName;
        private String courseName;
        private Integer currentSize;
        private Integer maxSize;
        private Integer matchPercentage; // 0-100 displayed to user
        private String matchReason;
        private Double currentVariance;
        private Double projectedVariance;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SessionRecommendation {
        private Long sessionId;
        private String sessionTitle;
        private String expertName;
        private String courseName;
        private String scheduledAt;
        private Integer availableSpots;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExpertRecommendation {
        private Long expertId;
        private String expertName;
        private String specialization;
        private Double averageRating;
        private Integer totalSessions;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProfileSummary {
        private Boolean hasProfile;
        private String message;
        // Note: Internal role classifications hidden from users
    }
}
