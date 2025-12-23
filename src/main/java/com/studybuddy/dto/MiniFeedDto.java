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
        private String itemType; // "QUIZ_REMINDER", "GROUP_ACTIVITY", "UPCOMING_SESSION", "GROUP_MATCH"
        private Integer priority; // Lower number = higher priority
        private String timestamp;
        
        // Quiz reminder fields
        private String quizMessage;
        private Integer questionsAnswered;
        private Integer totalQuestions;
        
        // Group activity fields
        private Long groupId;
        private String groupName;
        private String activityType; // "MESSAGE", "FILE"
        private String activityMessage;
        private String actorName;
        
        // Session fields
        private Long sessionId;
        private String sessionTitle;
        private String expertName;
        private String courseName;
        private String scheduledAt;
        private Integer availableSpots;
        
        // Group match fields
        private Integer matchPercentage;
        private String matchReason;
        private Integer currentSize;
        private Integer maxSize;
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
