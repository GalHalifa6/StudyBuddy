package com.studybuddy.matching.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Event published when a new study group is created.
 * Triggers creation of the group's characteristic profile based on creator's profile.
 */
@Getter
@AllArgsConstructor
public class GroupCreatedEvent {
    private final Long groupId;
    private final Long creatorId;
    private final LocalDateTime timestamp;
}
