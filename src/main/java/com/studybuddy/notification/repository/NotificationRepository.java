package com.studybuddy.notification.repository;

import com.studybuddy.notification.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for Notification entity
 */
@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Notification> findByUserIdAndIsReadFalseOrderByCreatedAtDesc(Long userId);

    List<Notification> findByUserIdAndTypeOrderByCreatedAtDesc(Long userId, String type);

    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = :userId AND n.isRead = false")
    Long countUnreadByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.user.id = :userId")
    void markAllAsReadByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = CURRENT_TIMESTAMP WHERE n.id = :id")
    void markAsRead(@Param("id") Long id);

    // Find actionable notifications for a specific reference
    List<Notification> findByReferenceIdAndReferenceTypeAndIsActionableTrueAndActionStatus(
            Long referenceId, String referenceType, String actionStatus);

    // Find notifications by actor for duplicate checking
    List<Notification> findByReferenceIdAndReferenceTypeAndActorIdAndActionStatus(
            Long referenceId, String referenceType, Long actorId, String actionStatus);
    
    void deleteByUserId(Long userId);
}
