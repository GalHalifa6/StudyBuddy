package com.studybuddy.event.dto;

import com.studybuddy.event.model.Event;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for creating a new event
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateEventDto {
    @NotBlank(message = "Event title is required")
    private String title;

    private String description;

    @NotNull(message = "Event type is required")
    private Event.EventType eventType;

    @NotNull(message = "Start date and time is required")
    private LocalDateTime startDateTime;

    private LocalDateTime endDateTime;

    private String location;

    private String meetingLink;

    @NotNull(message = "Group ID is required")
    private Long groupId;
}
