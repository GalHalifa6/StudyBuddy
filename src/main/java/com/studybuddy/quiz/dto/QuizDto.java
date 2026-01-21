package com.studybuddy.quiz.dto;

import com.studybuddy.quiz.model.QuizStatus;
import com.studybuddy.user.model.RoleType;
import jakarta.validation.constraints.*;
import lombok.*;

import java.util.List;
import java.util.Map;

/**
 * DTOs for Quiz and Profile endpoints.
 */
public class QuizDto {
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionResponse {
        private Long questionId;
        private String questionText;
        private Integer orderIndex;
        private List<OptionResponse> options;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionResponse {
        private Long optionId;
        private String optionText;
        private Integer orderIndex;
        // Note: roleWeights NOT exposed to prevent gaming the system
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuizSubmissionRequest {
        @NotEmpty(message = "Answers cannot be empty")
        private Map<Long, Long> answers; // questionId -> selectedOptionId
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProfileResponse {
        private Long userId;
        private String message;
        
        /**
         * Quiz completion status.
         */
        private QuizStatus quizStatus;
        
        /**
         * Reliability percentage (0.0 to 1.0) based on quiz completion.
         * 0.0 for SKIPPED/NOT_STARTED, partial for IN_PROGRESS, 1.0 for COMPLETED.
         */
        private Double reliabilityPercentage;
        
        /**
         * Whether user needs to see onboarding page.
         * True only when status is NOT_STARTED.
         */
        private Boolean requiresOnboarding;
        
        // Note: Role scores are kept internal for matching algorithm only
        
        // Backward compatibility
        @Deprecated
        public Boolean getProfileCompleted() {
            return quizStatus == QuizStatus.COMPLETED;
        }
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OnboardingStatusResponse {
        private Long userId;
        private Boolean requiresOnboarding;
        private QuizStatus quizStatus;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SavedAnswersResponse {
        private Map<Long, Long> answers; // questionId -> selectedOptionId
        private QuizStatus quizStatus;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateQuestionRequest {
        @NotBlank(message = "Question text is required")
        private String questionText;
        
        @NotNull
        private Integer orderIndex;
        
        @NotEmpty(message = "At least one option is required")
        private List<CreateOptionRequest> options;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateOptionRequest {
        @NotBlank(message = "Option text is required")
        private String optionText;
        
        @NotNull
        private Integer orderIndex;
        
        @NotEmpty(message = "Role weights are required")
        private Map<RoleType, Double> roleWeights;
    }
    
    // ==================== ADMIN DTOs ====================
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionAdminResponse {
        private Long questionId;
        private String questionText;
        private Integer orderIndex;
        private Boolean active;
        private List<OptionAdminResponse> options;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptionAdminResponse {
        private Long optionId;
        private String optionText;
        private Integer orderIndex;
        private Map<RoleType, Double> roleWeights; // Admin can see role weights
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateQuestionRequest {
        @NotBlank(message = "Question text is required")
        private String questionText;
        
        @NotNull
        private Integer orderIndex;
        
        private Boolean active;
        
        // Optional: if provided, will update all options
        private List<UpdateOptionRequest> options;
    }
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateOptionRequest {
        @NotBlank(message = "Option text is required")
        private String optionText;
        
        @NotNull
        private Integer orderIndex;
        
        @NotEmpty(message = "Role weights are required")
        private Map<RoleType, Double> roleWeights;
    }
}
