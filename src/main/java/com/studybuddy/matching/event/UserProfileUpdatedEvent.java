package com.studybuddy.matching.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Event published when a user's characteristic profile is updated.
 * Triggers recalculation of all groups the user is a member of.
 */
@Getter
@AllArgsConstructor
public class UserProfileUpdatedEvent {
    private final Long userId;
    private final LocalDateTime timestamp;
}
