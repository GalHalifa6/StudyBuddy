package com.studybuddy.test.integration;

import com.studybuddy.user.model.User;
import com.studybuddy.notification.model.Notification;
import com.studybuddy.user.repository.UserRepository;
import com.studybuddy.notification.repository.NotificationRepository;
import com.studybuddy.notification.service.NotificationService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Notification endpoints
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class NotificationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User testUser;
    private Notification testNotification;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        notificationRepository.deleteAll();

        // Create test user
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPassword(passwordEncoder.encode("password123"));
        testUser.setFullName("Test User");
        testUser.setRole(Role.USER);
        testUser.setIsActive(true);
        testUser = userRepository.save(testUser);

        // Create test notification
        testNotification = notificationService.createNotification(
                testUser, "TEST_TYPE", "Test Title", "Test Message");
    }

    @Test
    @WithMockUser(username = "testuser")
    void testGetMyNotifications_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].title").value("Test Title"));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testGetUnreadNotifications_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/notifications/unread"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].isRead").value(false));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testGetUnreadCount_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/notifications/unread/count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(1));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testMarkAsRead_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(post("/api/notifications/{id}/read", testNotification.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("marked as read")));

        // Verify notification is marked as read - @Modifying query updates DB directly
        // Clear persistence context and re-fetch
        entityManager.flush();
        entityManager.clear();
        Notification updated = notificationRepository.findById(testNotification.getId()).orElse(null);
        assertNotNull(updated);
        assertTrue(updated.getIsRead());
    }

    @Test
    @WithMockUser(username = "testuser")
    void testMarkAllAsRead_Success() throws Exception {
        // Arrange - Create another notification
        notificationService.createNotification(testUser, "ANOTHER_TYPE", "Another Title", "Another Message");

        // Act & Assert
        mockMvc.perform(post("/api/notifications/read-all"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("All notifications")));

        // Verify all notifications are read
        assertEquals(0, notificationService.getUnreadCount(testUser.getId()));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testDeleteNotification_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(delete("/api/notifications/{id}", testNotification.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("deleted")));

        // Verify notification was deleted
        assertFalse(notificationRepository.existsById(testNotification.getId()));
    }
}

