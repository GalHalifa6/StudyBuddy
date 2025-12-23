package com.studybuddy.repository;

import com.studybuddy.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for Event entities
 */
@Repository
public interface EventRepository extends JpaRepository<Event, Long> {

    /**
     * Find all events for a specific study group
     */
    @Query("SELECT e FROM Event e WHERE e.group.id = :groupId ORDER BY e.startDateTime ASC")
    List<Event> findByGroupId(@Param("groupId") Long groupId);

    /**
     * Find upcoming events for a specific study group
     */
    @Query("SELECT e FROM Event e WHERE e.group.id = :groupId AND e.startDateTime >= :now ORDER BY e.startDateTime ASC")
    List<Event> findUpcomingEventsByGroupId(@Param("groupId") Long groupId, @Param("now") LocalDateTime now);

    /**
     * Find events for a user across all their groups
     */
    @Query("SELECT e FROM Event e WHERE e.group.id IN " +
           "(SELECT g.id FROM StudyGroup g JOIN g.members m WHERE m.id = :userId) " +
           "ORDER BY e.startDateTime ASC")
    List<Event> findEventsByUserId(@Param("userId") Long userId);

    /**
     * Find upcoming events for a user across all their groups
     */
    @Query("SELECT e FROM Event e WHERE e.group.id IN " +
           "(SELECT g.id FROM StudyGroup g JOIN g.members m WHERE m.id = :userId) " +
           "AND e.startDateTime >= :now " +
           "ORDER BY e.startDateTime ASC")
    List<Event> findUpcomingEventsByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    /**
     * Find events within a date range for a specific group
     */
    @Query("SELECT e FROM Event e WHERE e.group.id = :groupId " +
           "AND e.startDateTime >= :startDate " +
           "AND e.startDateTime <= :endDate " +
           "ORDER BY e.startDateTime ASC")
    List<Event> findEventsByGroupIdAndDateRange(
            @Param("groupId") Long groupId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );

    /**
     * Delete all events for a specific group
     */
    void deleteByGroupId(Long groupId);
}
