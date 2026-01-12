package com.studybuddy.group.repository;

import com.studybuddy.group.model.RoomShare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for RoomShare entity
 */
@Repository
public interface RoomShareRepository extends JpaRepository<RoomShare, Long> {
    
    List<RoomShare> findByGroupId(Long groupId);
    
    List<RoomShare> findByIsActiveTrueOrderByStartTimeAsc();
    
    @Query("SELECT r FROM RoomShare r WHERE r.isActive = true AND r.startTime >= :now AND r.availableSeats > 0 ORDER BY r.startTime ASC")
    List<RoomShare> findAvailableRoomShares(@Param("now") LocalDateTime now);
    
    @Query("SELECT r FROM RoomShare r WHERE r.isActive = true AND r.startTime BETWEEN :startTime AND :endTime")
    List<RoomShare> findRoomSharesInTimeRange(
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );
}
