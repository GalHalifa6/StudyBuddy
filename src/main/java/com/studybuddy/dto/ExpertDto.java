package com.studybuddy.dto;

import com.studybuddy.model.ExpertQuestion;
import com.studybuddy.model.ExpertSession;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * DTOs for Expert functionality
 */
public class ExpertDto {

    // ============ Expert Profile DTOs ============

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExpertProfileRequest {
        private String title;
        private String institution;
        
        @Size(max = 2000, message = "Bio must not exceed 2000 characters")
        private String bio;
        
        private String qualifications;
        
        @Min(value = 0, message = "Years of experience cannot be negative")
        private Integer yearsOfExperience;
        
        private List<String> specializations;
        private List<String> skills;
        private String weeklyAvailability; // JSON string
        
        @Min(value = 1, message = "Max sessions per week must be at least 1")
        @Max(value = 50, message = "Max sessions per week cannot exceed 50")
        private Integer maxSessionsPerWeek;
        
        @Min(value = 15, message = "Session duration must be at least 15 minutes")
        @Max(value = 180, message = "Session duration cannot exceed 180 minutes")
        private Integer sessionDurationMinutes;
        
        private Boolean offersGroupConsultations;
        private Boolean offersOneOnOne;
        private Boolean offersAsyncQA;
        private Integer typicalResponseHours;
        private String linkedInUrl;
        private String personalWebsite;
        private List<Long> expertiseCourseIds;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExpertProfileResponse {
        private Long id;
        private Long userId;
        private String username;
        private String fullName;
        private String email;
        private String title;
        private String institution;
        private String bio;
        private String qualifications;
        private Integer yearsOfExperience;
        private List<String> specializations;
        private List<String> skills;
        private Boolean isVerified;
        private LocalDateTime verifiedAt;
        private Double averageRating;
        private Integer totalRatings;
        private Integer totalSessions;
        private Integer totalQuestionsAnswered;
        private String weeklyAvailability;
        private Integer maxSessionsPerWeek;
        private Integer sessionDurationMinutes;
        private Boolean acceptingNewStudents;
        private Boolean offersGroupConsultations;
        private Boolean offersOneOnOne;
        private Boolean offersAsyncQA;
        private Integer typicalResponseHours;
        private Boolean isAvailableNow;
        private Integer helpfulAnswers;
        private Integer studentsHelped;
        private String linkedInUrl;
        private String personalWebsite;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExpertSearchResult {
        private Long expertId;
        private Long userId;
        private String fullName;
        private String title;
        private String institution;
        private String bio;
        private List<String> specializations;
        private Double averageRating;
        private Integer totalRatings;
        private Boolean isVerified;
        private Boolean isAvailableNow;
        private Boolean offersOneOnOne;
        private Boolean offersAsyncQA;
    }

    // ============ Expert Session DTOs ============

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SessionRequest {
        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title must not exceed 200 characters")
        private String title;
        
        private String description;
        private String agenda;
        
        private Long expertId; // For booking sessions with an expert (preferred field)
        @Deprecated // Deprecated: use expertId instead. Kept for backward compatibility
        private Long studentId; // For one-on-one sessions (when created by expert for specific student)
        private Long groupId; // For group consultations
        private Long courseId;
        
        @NotNull(message = "Session type is required")
        private ExpertSession.SessionType sessionType;
        
        @NotNull(message = "Start time is required")
        private LocalDateTime scheduledStartTime;
        
        @NotNull(message = "End time is required")
        private LocalDateTime scheduledEndTime;
        
        private Integer maxParticipants;
        private String meetingLink;
        private String meetingPlatform;
        private Boolean isRecurring;
        private String recurrencePattern;
        private List<Long> topicIds; // Topics for this session
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SessionResponse {
        private Long id;
        private ExpertSummary expert;
        private StudentSummary student;
        private GroupSummary studyGroup;
        private CourseSummary course;
        private String title;
        private String description;
        private String agenda;
        private String sessionType;
        private String status;
        private LocalDateTime scheduledStartTime;
        private LocalDateTime scheduledEndTime;
        private LocalDateTime actualStartTime;
        private LocalDateTime actualEndTime;
        private Integer maxParticipants;
        private Integer currentParticipants;
        private String meetingLink;
        private String meetingPlatform;
        private String sessionSummary;
        private Integer studentRating;
        private String studentFeedback;
        private Boolean canJoin;
        private Boolean isUpcoming;
        private LocalDateTime createdAt;
        private List<TopicDto.TopicInfo> topics; // Session topics
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SessionFeedbackRequest {
        @NotNull(message = "Rating is required")
        @Min(value = 1, message = "Rating must be at least 1")
        @Max(value = 5, message = "Rating cannot exceed 5")
        private Integer rating;
        
        @Size(max = 1000, message = "Feedback must not exceed 1000 characters")
        private String feedback;
    }

    // ============ Expert Question DTOs ============

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionRequest {
        @NotBlank(message = "Title is required")
        @Size(max = 300, message = "Title must not exceed 300 characters")
        private String title;
        
        @NotBlank(message = "Question content is required")
        @Size(max = 5000, message = "Content must not exceed 5000 characters")
        private String content;
        
        @Size(max = 10000, message = "Code snippet must not exceed 10000 characters")
        private String codeSnippet;
        
        private String programmingLanguage;
        private Long expertId; // Optional - specific expert to ask
        private Long courseId;
        private Long groupId;
        private List<String> tags;
        private Boolean isPublic;
        private Boolean isAnonymous;
        private LocalDateTime dueDate;
        private Boolean isUrgent;
        private List<String> attachments;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class QuestionResponse {
        private Long id;
        private StudentSummary student;
        private ExpertSummary expert;
        private ExpertSummary answeredBy;
        private CourseSummary course;
        private GroupSummary studyGroup;
        private String title;
        private String content;
        private String codeSnippet;
        private String programmingLanguage;
        private String status;
        private String priority;
        private List<String> tags;
        private String answer;
        private LocalDateTime answeredAt;
        private Boolean isPublic;
        private Boolean isAnonymous;
        private Integer viewCount;
        private Integer upvotes;
        private Integer downvotes;
        private Integer netVotes;
        private Boolean isAnswerAccepted;
        private Boolean isAnswerHelpful;
        private List<String> attachments;
        private LocalDateTime dueDate;
        private Boolean isUrgent;
        private Integer followUpCount;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AnswerRequest {
        @NotBlank(message = "Answer is required")
        @Size(max = 10000, message = "Answer must not exceed 10000 characters")
        private String answer;
    }

    // ============ Expert Review DTOs ============

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReviewRequest {
        @NotNull(message = "Rating is required")
        @Min(value = 1, message = "Rating must be at least 1")
        @Max(value = 5, message = "Rating cannot exceed 5")
        private Integer rating;
        
        @Min(value = 1) @Max(value = 5)
        private Integer knowledgeRating;
        
        @Min(value = 1) @Max(value = 5)
        private Integer communicationRating;
        
        @Min(value = 1) @Max(value = 5)
        private Integer responsivenessRating;
        
        @Min(value = 1) @Max(value = 5)
        private Integer helpfulnessRating;
        
        @Size(max = 2000, message = "Review must not exceed 2000 characters")
        private String review;
        
        private String highlights;
        private String improvements;
        private Boolean isAnonymous;
        private Boolean isPublic;
        
        private Long sessionId; // Optional
        private Long questionId; // Optional
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReviewResponse {
        private Long id;
        private Long expertId;
        private String expertName;
        private StudentSummary student;
        private Integer rating;
        private Integer knowledgeRating;
        private Integer communicationRating;
        private Integer responsivenessRating;
        private Integer helpfulnessRating;
        private String review;
        private String highlights;
        private String improvements;
        private Boolean isAnonymous;
        private Integer helpfulCount;
        private String expertResponse;
        private LocalDateTime expertRespondedAt;
        private LocalDateTime createdAt;
    }

    // ============ Dashboard & Statistics DTOs ============

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExpertDashboard {
        private ExpertProfileResponse profile;
        private DashboardStats stats;
        private List<SessionResponse> upcomingSessions;
        private List<QuestionResponse> pendingQuestions;
        private List<ReviewResponse> recentReviews;
        private List<String> notifications;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class DashboardStats {
        private Integer totalSessions;
        private Integer completedSessions;
        private Integer upcomingSessions;
        private Integer totalQuestionsAnswered;
        private Integer pendingQuestions;
        private Integer studentsHelped;
        private Double averageRating;
        private Integer totalReviews;
        private Double averageResponseTimeHours;
        private Integer helpfulAnswers;
        private Map<String, Integer> sessionTypeDistribution;
        private Map<String, Integer> questionStatusDistribution;
        private List<RatingDistribution> ratingDistribution;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RatingDistribution {
        private Integer rating;
        private Long count;
        private Double percentage;
    }

    // ============ Helper Summary DTOs ============

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExpertSummary {
        private Long id;
        private String fullName;
        private String title;
        private String institution;
        private Double averageRating;
        private Boolean isVerified;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StudentSummary {
        private Long id;
        private String fullName;
        private String username;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CourseSummary {
        private Long id;
        private String code;
        private String name;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class GroupSummary {
        private Long id;
        private String name;
    }

    // ============ Availability DTOs ============

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AvailabilitySlot {
        private String dayOfWeek;
        private String startTime;
        private String endTime;
        private Boolean isAvailable;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AvailabilityUpdateRequest {
        private List<AvailabilitySlot> slots;
        private Boolean isAvailableNow;
        private Boolean acceptingNewStudents;
    }

    // ============ Session Request DTOs ============

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SessionRequestCreate {
        @NotNull(message = "Expert ID is required")
        private Long expertId;
        
        private Long courseId;
        
        @NotBlank(message = "Title is required")
        @Size(max = 200, message = "Title must not exceed 200 characters")
        private String title;
        
        private String description;
        private String agenda;
        
        // Preferred time slots as list of objects with start/end
        private List<TimeSlot> preferredTimeSlots;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TimeSlot {
        @NotNull(message = "Start time is required")
        private LocalDateTime start;
        
        @NotNull(message = "End time is required")
        private LocalDateTime end;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SessionRequestResponse {
        private Long id;
        private ExpertSummary expert;
        private StudentSummary student;
        private CourseSummary course;
        private String title;
        private String description;
        private String agenda;
        private List<TimeSlot> preferredTimeSlots;
        private String status;
        private String expertResponseMessage;
        private String rejectionReason;
        private LocalDateTime chosenStart;
        private LocalDateTime chosenEnd;
        private Long createdSessionId;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SessionRequestApprove {
        @NotNull(message = "Start time is required")
        private LocalDateTime chosenStart;
        
        @NotNull(message = "End time is required")
        private LocalDateTime chosenEnd;
        
        private String message;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SessionRequestReject {
        @NotBlank(message = "Rejection reason is required")
        @Size(max = 1000, message = "Rejection reason must not exceed 1000 characters")
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SessionRequestCounterPropose {
        @NotEmpty(message = "At least one time slot is required")
        private List<TimeSlot> proposedTimeSlots;
        
        private String message;
    }
}
