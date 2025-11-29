package com.studybuddy.repository;

import com.studybuddy.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository for Message entity
 */
@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    
    List<Message> findByGroupIdOrderByCreatedAtAsc(Long groupId);
    
    List<Message> findByGroupIdAndIsPinnedTrue(Long groupId);
    
    @Query("SELECT m FROM Message m WHERE m.group.id = :groupId AND m.createdAt BETWEEN :startTime AND :endTime ORDER BY m.createdAt ASC")
    List<Message> findMessagesBetweenTimes(
        @Param("groupId") Long groupId,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );
    
    @Query("SELECT m FROM Message m WHERE m.group.id = :groupId ORDER BY m.createdAt DESC")
    List<Message> findRecentMessagesByGroup(@Param("groupId") Long groupId);
}
