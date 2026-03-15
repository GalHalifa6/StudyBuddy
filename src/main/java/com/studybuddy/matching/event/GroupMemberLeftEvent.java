package com.studybuddy.matching.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Event published when a user leaves a study group.
 * Triggers recalculation of the group's characteristic profile.
 */
@Getter
@AllArgsConstructor
public class GroupMemberLeftEvent {
    private final Long groupId;
    private final Long userId;
    private final LocalDateTime timestamp;
}
