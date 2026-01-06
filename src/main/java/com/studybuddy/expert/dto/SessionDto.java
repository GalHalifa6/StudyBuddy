package com.studybuddy.expert.dto;

import com.studybuddy.course.model.Course;
import com.studybuddy.expert.model.ExpertSession;
import com.studybuddy.user.model.User;

import java.time.LocalDateTime;

public record SessionDto(
        Long id,
        String title,
        String description,
        String sessionType,
        String sessionTypeLabel,
        String status,
        String statusKey,
        LocalDateTime scheduledStartTime,
        LocalDateTime scheduledEndTime,
        Integer maxParticipants,
        Integer currentParticipants,
        String meetingLink,
        String meetingPlatform,
        Boolean isRecurring,
        Boolean isCancelled,
        Boolean canJoin,
        Boolean isUpcoming,
        ExpertSummary expert,
        CourseSummary course
) {
    public static SessionDto from(ExpertSession session) {
        String sessionType = session.getSessionType() != null ? session.getSessionType().name() : null;
        String sessionTypeLabel = session.getSessionType() != null ? session.getSessionType().getDisplayName() : null;
        ExpertSession.SessionStatus statusEnum = session.getStatus();
        String statusDisplay = statusEnum != null ? statusEnum.getDisplayName() : null;
        String statusKey = statusEnum != null ? statusEnum.name() : null;

        return new SessionDto(
                session.getId(),
                session.getTitle(),
                session.getDescription(),
                sessionType,
                sessionTypeLabel,
                statusDisplay,
                statusKey,
                session.getScheduledStartTime(),
                session.getScheduledEndTime(),
                session.getMaxParticipants(),
                session.getCurrentParticipants(),
                session.getMeetingLink(),
                session.getMeetingPlatform(),
                session.getIsRecurring(),
                session.getIsCancelled(),
                session.canJoin(),
                session.isUpcoming(),
                toExpertSummary(session.getExpert()),
                toCourseSummary(session.getCourse())
        );
    }

    private static ExpertSummary toExpertSummary(User expert) {
        if (expert == null) {
            return null;
        }
        return new ExpertSummary(expert.getId(), expert.getFullName());
    }

    private static CourseSummary toCourseSummary(Course course) {
        if (course == null) {
            return null;
        }
        return new CourseSummary(course.getId(), course.getCode(), course.getName());
    }

    public record ExpertSummary(Long id, String fullName) { }

    public record CourseSummary(Long id, String code, String name) { }
}
