package com.studybuddy.feedback.dto;

import jakarta.validation.constraints.*;
import lombok.*;

/**
 * DTOs for Safety Feedback collection.
 */
public class FeedbackDto {
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmitRequest {
        @NotNull(message = "Group ID is required")
        private Long groupId;
        
        private Long sessionId; // Optional
        
        @NotNull(message = "PS Score is required")
        @Min(value = 1, message = "PS Score must be between 1 and 10")
        @Max(value = 10, message = "PS Score must be between 1 and 10")
        private Integer psScore;
        
        @Size(max = 1000, message = "Feedback cannot exceed 1000 characters")
        private String verbalFeedback;
        
        private String participationLevel; // LOW, MEDIUM, HIGH
        private String conflictLevel; // NONE, LOW, MEDIUM, HIGH
        private Boolean wouldRecommend;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long feedbackId;
        private String message;
        private String submittedAt;
    }
}
