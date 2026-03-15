package com.studybuddy.expert.dto;

import com.studybuddy.expert.model.ExpertSession;

public record SessionStateDto(
        Long sessionId,
        Integer currentParticipants,
        Integer maxParticipants,
        boolean full,
        String statusKey,
        String statusLabel
) {
    public static SessionStateDto from(ExpertSession session) {
        ExpertSession.SessionStatus status = session.getStatus();
        String statusKey = status != null ? status.name() : null;
        String statusLabel = status != null ? status.getDisplayName() : null;
        Integer current = session.getCurrentParticipants();
        Integer max = session.getMaxParticipants();
        boolean full = current != null && max != null && current >= max;

        return new SessionStateDto(
                session.getId(),
                current,
                max,
                full,
                statusKey,
                statusLabel
        );
    }
}
