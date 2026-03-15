package com.studybuddy.topic.dto;

import com.studybuddy.topic.model.TopicCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTOs for Topics API
 */
public class TopicDto {

    /**
     * Response DTO for a single topic
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopicResponse {
        private Long id;
        private String name;
        private TopicCategory category;
        private String description;
        private Boolean isActive;
    }

    /**
     * Simplified topic info (for embedding in other DTOs)
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopicInfo {
        private Long id;
        private String name;
        private String category;
        private String description;
    }

    /**
     * Response DTO for topics grouped by category
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopicsByCategoryResponse {
        private List<TopicResponse> education;
        private List<TopicResponse> casual;
        private List<TopicResponse> hobby;
    }

    /**
     * Request DTO to update user's topics
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateUserTopicsRequest {
        @NotNull(message = "Topic IDs are required")
        private List<Long> topicIds;
    }

    /**
     * Response DTO for user's topics
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserTopicsResponse {
        private Long userId;
        private String username;
        private List<TopicResponse> topics;
        private LocalDateTime lastUpdated;
    }

    /**
     * Request DTO to create a new topic (admin only)
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateTopicRequest {
        @NotBlank(message = "Topic name is required")
        private String name;
        
        @NotNull(message = "Category is required")
        private TopicCategory category;
        
        private String description;
    }

    /**
     * Response for topic creation/update
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopicOperationResponse {
        private String message;
        private TopicResponse topic;
    }
}
