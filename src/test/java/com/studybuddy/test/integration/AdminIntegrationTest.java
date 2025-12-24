package com.studybuddy.test.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studybuddy.model.Role;
import com.studybuddy.model.User;
import com.studybuddy.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Admin endpoints
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdminIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User testUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();

        // Create test user
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPassword(passwordEncoder.encode("password123"));
        testUser.setFullName("Test User");
        testUser.setRole(Role.USER);
        testUser.setIsActive(true);
        testUser = userRepository.save(testUser);

        // Create admin user
        adminUser = new User();
        adminUser.setUsername("admin");
        adminUser.setEmail("admin@example.com");
        adminUser.setPassword(passwordEncoder.encode("password123"));
        adminUser.setFullName("Admin User");
        adminUser.setRole(Role.ADMIN);
        adminUser.setIsActive(true);
        adminUser = userRepository.save(adminUser);
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void testGetAllUsers_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].username").exists());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void testGetUserById_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/admin/users/{id}", testUser.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testUser.getId()))
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void testGetUserById_NotFound() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/admin/users/{id}", 99999L))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void testUpdateUserRole_Success() throws Exception {
        // Arrange
        Map<String, String> request = new HashMap<>();
        request.put("role", "EXPERT");

        // Act & Assert
        mockMvc.perform(put("/api/admin/users/{id}/role", testUser.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Verify role was updated
        User updatedUser = userRepository.findById(testUser.getId()).orElse(null);
        assertNotNull(updatedUser);
        assertEquals(Role.EXPERT, updatedUser.getRole());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void testUpdateUserRole_InvalidRole() throws Exception {
        // Arrange
        Map<String, String> request = new HashMap<>();
        request.put("role", "INVALID_ROLE");

        // Act & Assert
        mockMvc.perform(put("/api/admin/users/{id}/role", testUser.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void testUpdateUserStatus_Success() throws Exception {
        // Arrange
        Map<String, Boolean> request = new HashMap<>();
        request.put("active", false);

        // Act & Assert
        mockMvc.perform(put("/api/admin/users/{id}/status", testUser.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Verify status was updated
        User updatedUser = userRepository.findById(testUser.getId()).orElse(null);
        assertNotNull(updatedUser);
        assertFalse(updatedUser.getIsActive());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void testDeleteUser_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(delete("/api/admin/users/{id}", testUser.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Verify user was deleted
        assertFalse(userRepository.existsById(testUser.getId()));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void testDeleteUser_NotFound() throws Exception {
        // Act & Assert
        mockMvc.perform(delete("/api/admin/users/{id}", 99999L))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "testuser", roles = "USER")
    void testGetAllUsers_Forbidden() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "testuser", roles = "USER")
    void testUpdateUserRole_Forbidden() throws Exception {
        // Arrange
        Map<String, String> request = new HashMap<>();
        request.put("role", "EXPERT");

        // Act & Assert
        mockMvc.perform(put("/api/admin/users/{id}/role", testUser.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
}







