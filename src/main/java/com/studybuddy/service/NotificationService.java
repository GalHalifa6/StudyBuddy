package com.studybuddy.service;

import com.studybuddy.model.Notification;
import com.studybuddy.model.User;
import com.studybuddy.repository.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service for managing notifications
 */
@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    /**
     * Create a simple notification
     */
    public Notification createNotification(User user, String type, String title, String message) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .isRead(false)
                .isActionable(false)
                .build();
        return notificationRepository.save(notification);
    }

    /**
     * Create a notification with a link
     */
    public Notification createNotification(User user, String type, String title, String message, String link) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .link(link)
                .isRead(false)
                .isActionable(false)
                .build();
        return notificationRepository.save(notification);
    }

    /**
     * Create an actionable notification (requires accept/reject)
     */
    public Notification createActionableNotification(User user, String type, String title, String message,
                                                      Long referenceId, String referenceType, Long actorId) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .referenceId(referenceId)
                .referenceType(referenceType)
                .actorId(actorId)
                .isRead(false)
                .isActionable(true)
                .actionStatus("PENDING")
                .build();
        return notificationRepository.save(notification);
    }

    /**
     * Get all notifications for a user
     */
    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Get unread notifications for a user
     */
    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    /**
     * Get unread count for a user
     */
    public Long getUnreadCount(Long userId) {
        return notificationRepository.countUnreadByUserId(userId);
    }

    /**
     * Mark a notification as read
     */
    @Transactional
    public void markAsRead(Long notificationId) {
        notificationRepository.markAsRead(notificationId);
    }

    /**
     * Mark all notifications as read for a user
     */
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
    }

    /**
     * Update action status on a notification
     */
    @Transactional
    public Notification updateActionStatus(Long notificationId, String status) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setActionStatus(status);
        notification.setActionTakenAt(LocalDateTime.now());
        notification.setIsRead(true);
        notification.setReadAt(LocalDateTime.now());
        return notificationRepository.save(notification);
    }

    /**
     * Check if a similar pending notification already exists
     */
    public boolean hasPendingNotification(Long referenceId, String referenceType, Long actorId) {
        List<Notification> existing = notificationRepository.findByReferenceIdAndReferenceTypeAndActorIdAndActionStatus(
                referenceId, referenceType, actorId, "PENDING");
        return !existing.isEmpty();
    }

    /**
     * Delete a notification
     */
    public void deleteNotification(Long notificationId) {
        notificationRepository.deleteById(notificationId);
    }
}
