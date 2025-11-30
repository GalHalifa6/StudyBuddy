package com.studybuddy.repository;

import com.studybuddy.model.ExpertSession;
import com.studybuddy.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ExpertSessionRepository extends JpaRepository<ExpertSession, Long> {

    // Find sessions by expert
    List<ExpertSession> findByExpertIdOrderByScheduledStartTimeDesc(Long expertId);

    // Find sessions by student
    List<ExpertSession> findByStudentIdOrderByScheduledStartTimeDesc(Long studentId);

    // Find upcoming sessions for expert
    @Query("SELECT es FROM ExpertSession es WHERE es.expert.id = :expertId AND es.status = 'SCHEDULED' AND es.scheduledStartTime > :now ORDER BY es.scheduledStartTime ASC")
    List<ExpertSession> findUpcomingSessionsByExpert(@Param("expertId") Long expertId, @Param("now") LocalDateTime now);

    // Find upcoming sessions for student
    @Query("SELECT es FROM ExpertSession es WHERE es.student.id = :studentId AND es.status = 'SCHEDULED' AND es.scheduledStartTime > :now ORDER BY es.scheduledStartTime ASC")
    List<ExpertSession> findUpcomingSessionsByStudent(@Param("studentId") Long studentId, @Param("now") LocalDateTime now);

    // Find sessions by study group
    List<ExpertSession> findByStudyGroupIdOrderByScheduledStartTimeDesc(Long groupId);

    // Find sessions by course
    List<ExpertSession> findByCourseIdOrderByScheduledStartTimeDesc(Long courseId);

    // Find sessions by course with end time after a given time (active/upcoming)
    List<ExpertSession> findByCourseIdAndScheduledEndTimeAfterOrderByScheduledStartTimeAsc(Long courseId, LocalDateTime endTimeAfter);
    
    // Find all sessions with end time after a given time (for browsing)
    List<ExpertSession> findByScheduledEndTimeAfterOrderByScheduledStartTimeAsc(LocalDateTime endTimeAfter);

    // Find sessions by status
    List<ExpertSession> findByStatus(ExpertSession.SessionStatus status);

    // Find sessions by type
    List<ExpertSession> findBySessionType(ExpertSession.SessionType sessionType);

    // Find sessions in time range
    @Query("SELECT es FROM ExpertSession es WHERE es.expert.id = :expertId AND es.scheduledStartTime BETWEEN :start AND :end")
    List<ExpertSession> findExpertSessionsInTimeRange(@Param("expertId") Long expertId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // Find sessions needing reminders
    @Query("SELECT es FROM ExpertSession es WHERE es.status = 'SCHEDULED' AND es.reminderSent = false AND es.scheduledStartTime BETWEEN :now AND :reminderTime")
    List<ExpertSession> findSessionsNeedingReminders(@Param("now") LocalDateTime now, @Param("reminderTime") LocalDateTime reminderTime);

    // Find sessions that should be marked as completed
    @Query("SELECT es FROM ExpertSession es WHERE es.status = 'IN_PROGRESS' AND es.scheduledEndTime < :now")
    List<ExpertSession> findSessionsToComplete(@Param("now") LocalDateTime now);

    // Find sessions that are no-shows
    @Query("SELECT es FROM ExpertSession es WHERE es.status = 'SCHEDULED' AND es.scheduledEndTime < :now")
    List<ExpertSession> findPotentialNoShows(@Param("now") LocalDateTime now);

    // Count sessions by expert
    long countByExpertId(Long expertId);

    // Count completed sessions by expert
    @Query("SELECT COUNT(es) FROM ExpertSession es WHERE es.expert.id = :expertId AND es.status = 'COMPLETED'")
    long countCompletedSessionsByExpert(@Param("expertId") Long expertId);

    // Get expert's average session rating
    @Query("SELECT AVG(es.studentRating) FROM ExpertSession es WHERE es.expert.id = :expertId AND es.studentRating IS NOT NULL")
    Double getAverageRatingForExpert(@Param("expertId") Long expertId);

    // Find sessions by date
    @Query("SELECT es FROM ExpertSession es WHERE DATE(es.scheduledStartTime) = DATE(:date) AND es.expert.id = :expertId")
    List<ExpertSession> findExpertSessionsByDate(@Param("expertId") Long expertId, @Param("date") LocalDateTime date);

    // Check for scheduling conflicts
    @Query("SELECT COUNT(es) > 0 FROM ExpertSession es WHERE es.expert.id = :expertId AND es.status = 'SCHEDULED' " +
           "AND ((es.scheduledStartTime <= :startTime AND es.scheduledEndTime > :startTime) " +
           "OR (es.scheduledStartTime < :endTime AND es.scheduledEndTime >= :endTime) " +
           "OR (es.scheduledStartTime >= :startTime AND es.scheduledEndTime <= :endTime))")
    boolean hasSchedulingConflict(@Param("expertId") Long expertId, @Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);

    // Statistics
    @Query("SELECT COUNT(DISTINCT es.student.id) FROM ExpertSession es WHERE es.expert.id = :expertId AND es.status = 'COMPLETED'")
    long countUniqueStudentsByExpert(@Param("expertId") Long expertId);

    @Query("SELECT es.sessionType, COUNT(es) FROM ExpertSession es WHERE es.expert.id = :expertId GROUP BY es.sessionType")
    List<Object[]> getSessionTypeDistribution(@Param("expertId") Long expertId);
}
