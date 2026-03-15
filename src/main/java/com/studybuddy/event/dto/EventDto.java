package com.studybuddy.event.dto;

import com.studybuddy.event.model.Event;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for Event data transfer
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventDto {
    private Long id;
    private String title;
    private String description;
    private Event.EventType eventType;
    private LocalDateTime startDateTime;
    private LocalDateTime endDateTime;
    private String location;
    private String meetingLink;
    private Long creatorId;
    private String creatorName;
    private Long groupId;
    private String groupName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
