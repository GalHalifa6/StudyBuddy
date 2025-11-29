package com.studybuddy.test.unit.controller;

import com.studybuddy.controller.NotificationController;
import com.studybuddy.model.Notification;
import com.studybuddy.model.User;
import com.studybuddy.repository.UserRepository;
import com.studybuddy.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for NotificationController
 */
@ExtendWith(MockitoExtension.class)
class NotificationControllerTest {

    @Mock
    private NotificationService notificationService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private NotificationController notificationController;

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
    void testGetMyNotifications_Success() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        
        List<Notification> notifications = new ArrayList<>(List.of(testNotification));
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(notificationService.getUserNotifications(1L)).thenReturn(notifications);

        // Act
        ResponseEntity<List<Notification>> response = notificationController.getMyNotifications();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        verify(notificationService, times(1)).getUserNotifications(1L);
    }

    @Test
    void testGetUnreadNotifications_Success() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        
        List<Notification> unreadNotifications = new ArrayList<>(List.of(testNotification));
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(notificationService.getUnreadNotifications(1L)).thenReturn(unreadNotifications);

        // Act
        ResponseEntity<List<Notification>> response = notificationController.getUnreadNotifications();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        verify(notificationService, times(1)).getUnreadNotifications(1L);
    }

    @Test
    void testGetUnreadCount_Success() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(notificationService.getUnreadCount(1L)).thenReturn(5L);

        // Act
        ResponseEntity<Map<String, Long>> response = notificationController.getUnreadCount();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(5L, response.getBody().get("count"));
        verify(notificationService, times(1)).getUnreadCount(1L);
    }

    @Test
    void testMarkAsRead_Success() {
        // Arrange
        doNothing().when(notificationService).markAsRead(1L);

        // Act
        ResponseEntity<?> response = notificationController.markAsRead(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(notificationService, times(1)).markAsRead(1L);
    }

    @Test
    void testMarkAllAsRead_Success() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        doNothing().when(notificationService).markAllAsRead(1L);

        // Act
        ResponseEntity<?> response = notificationController.markAllAsRead();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(notificationService, times(1)).markAllAsRead(1L);
    }

    @Test
    void testDeleteNotification_Success() {
        // Arrange
        doNothing().when(notificationService).deleteNotification(1L);

        // Act
        ResponseEntity<?> response = notificationController.deleteNotification(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(notificationService, times(1)).deleteNotification(1L);
    }
}

