package com.studybuddy.test.unit.service;

import com.studybuddy.model.Notification;
import com.studybuddy.model.User;
import com.studybuddy.repository.NotificationRepository;
import com.studybuddy.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for NotificationService
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationService notificationService;

    private User testUser;
    private Notification testNotification;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");

        testNotification = Notification.builder()
                .id(1L)
                .user(testUser)
                .type("TEST_NOTIFICATION")
                .title("Test Title")
                .message("Test Message")
                .isRead(false)
                .isActionable(false)
                .build();
    }

    @Test
    void testCreateNotification_Success() {
        // Arrange
        Notification expectedNotification = Notification.builder()
                .id(1L)
                .user(testUser)
                .type("TEST_TYPE")
                .title("Test Title")
                .message("Test Message")
                .isRead(false)
                .isActionable(false)
                .build();
        when(notificationRepository.save(any(Notification.class))).thenReturn(expectedNotification);

        // Act
        Notification result = notificationService.createNotification(
                testUser, "TEST_TYPE", "Test Title", "Test Message");

        // Assert
        assertNotNull(result);
        assertEquals("TEST_TYPE", result.getType());
        assertEquals("Test Title", result.getTitle());
        assertEquals("Test Message", result.getMessage());
        assertFalse(result.getIsRead());
        assertFalse(result.getIsActionable());
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    void testCreateActionableNotification_Success() {
        // Arrange
        Notification actionableNotification = Notification.builder()
                .id(2L)
                .user(testUser)
                .type("GROUP_JOIN_REQUEST")
                .title("Join Request")
                .message("User wants to join")
                .referenceId(1L)
                .referenceType("GROUP")
                .actorId(2L)
                .isRead(false)
                .isActionable(true)
                .actionStatus("PENDING")
                .build();

        when(notificationRepository.save(any(Notification.class))).thenReturn(actionableNotification);

        // Act
        Notification result = notificationService.createActionableNotification(
                testUser, "GROUP_JOIN_REQUEST", "Join Request", "User wants to join",
                1L, "GROUP", 2L);

        // Assert
        assertNotNull(result);
        assertEquals("GROUP_JOIN_REQUEST", result.getType());
        assertTrue(result.getIsActionable());
        assertEquals("PENDING", result.getActionStatus());
        assertEquals(1L, result.getReferenceId());
        assertEquals("GROUP", result.getReferenceType());
        assertEquals(2L, result.getActorId());
        verify(notificationRepository, times(1)).save(any(Notification.class));
    }

    @Test
    void testGetUserNotifications_Success() {
        // Arrange
        List<Notification> notifications = new ArrayList<>();
        notifications.add(testNotification);
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(1L)).thenReturn(notifications);

        // Act
        List<Notification> result = notificationService.getUserNotifications(1L);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(notificationRepository, times(1)).findByUserIdOrderByCreatedAtDesc(1L);
    }

    @Test
    void testGetUnreadNotifications_Success() {
        // Arrange
        List<Notification> unreadNotifications = new ArrayList<>();
        unreadNotifications.add(testNotification);
        when(notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(1L))
                .thenReturn(unreadNotifications);

        // Act
        List<Notification> result = notificationService.getUnreadNotifications(1L);

        // Assert
        assertNotNull(result);
        assertEquals(1, result.size());
        verify(notificationRepository, times(1))
                .findByUserIdAndIsReadFalseOrderByCreatedAtDesc(1L);
    }

    @Test
    void testGetUnreadCount_Success() {
        // Arrange
        when(notificationRepository.countUnreadByUserId(1L)).thenReturn(5L);

        // Act
        Long result = notificationService.getUnreadCount(1L);

        // Assert
        assertNotNull(result);
        assertEquals(5L, result);
        verify(notificationRepository, times(1)).countUnreadByUserId(1L);
    }

    @Test
    void testMarkAsRead_Success() {
        // Arrange
        doNothing().when(notificationRepository).markAsRead(1L);

        // Act
        notificationService.markAsRead(1L);

        // Assert
        verify(notificationRepository, times(1)).markAsRead(1L);
    }

    @Test
    void testMarkAllAsRead_Success() {
        // Arrange
        doNothing().when(notificationRepository).markAllAsReadByUserId(1L);

        // Act
        notificationService.markAllAsRead(1L);

        // Assert
        verify(notificationRepository, times(1)).markAllAsReadByUserId(1L);
    }

    @Test
    void testUpdateActionStatus_Success() {
        // Arrange
        testNotification.setActionStatus("PENDING");
        when(notificationRepository.findById(1L)).thenReturn(Optional.of(testNotification));
        when(notificationRepository.save(any(Notification.class))).thenReturn(testNotification);

        // Act
        Notification result = notificationService.updateActionStatus(1L, "ACCEPTED");

        // Assert
        assertNotNull(result);
        assertEquals("ACCEPTED", result.getActionStatus());
        assertTrue(result.getIsRead());
        assertNotNull(result.getActionTakenAt());
        verify(notificationRepository, times(1)).findById(1L);
        verify(notificationRepository, times(1)).save(testNotification);
    }

    @Test
    void testUpdateActionStatus_NotificationNotFound() {
        // Arrange
        when(notificationRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> {
            notificationService.updateActionStatus(1L, "ACCEPTED");
        });
    }

    @Test
    void testHasPendingNotification_True() {
        // Arrange
        List<Notification> pendingNotifications = new ArrayList<>();
        pendingNotifications.add(testNotification);
        when(notificationRepository.findByReferenceIdAndReferenceTypeAndActorIdAndActionStatus(
                1L, "GROUP", 2L, "PENDING")).thenReturn(pendingNotifications);

        // Act
        boolean result = notificationService.hasPendingNotification(1L, "GROUP", 2L);

        // Assert
        assertTrue(result);
    }

    @Test
    void testHasPendingNotification_False() {
        // Arrange
        when(notificationRepository.findByReferenceIdAndReferenceTypeAndActorIdAndActionStatus(
                1L, "GROUP", 2L, "PENDING")).thenReturn(new ArrayList<>());

        // Act
        boolean result = notificationService.hasPendingNotification(1L, "GROUP", 2L);

        // Assert
        assertFalse(result);
    }

    @Test
    void testDeleteNotification_Success() {
        // Arrange
        doNothing().when(notificationRepository).deleteById(1L);

        // Act
        notificationService.deleteNotification(1L);

        // Assert
        verify(notificationRepository, times(1)).deleteById(1L);
    }
}

