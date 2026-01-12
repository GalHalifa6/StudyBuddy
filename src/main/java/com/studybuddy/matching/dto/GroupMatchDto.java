package com.studybuddy.matching.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO for group recommendations with match percentages.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupMatchDto {
    private Long groupId;
    private String groupName;
    private String description;
    private String topic;
    private String visibility;
    private Long courseId;
    private String courseName;
    private String courseCode;
    private Integer currentSize;
    private Integer maxSize;
    private Integer matchPercentage;
    private String matchReason;
    private Boolean isMember;
    private Boolean hasPendingRequest;
    private Double currentVariance;
    private Double projectedVariance;
    private String createdAt;
}
