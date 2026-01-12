package com.studybuddy.test.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studybuddy.auth.dto.AuthDto;
import com.studybuddy.admin.model.AllowedEmailDomain;
import com.studybuddy.user.model.Role;
import com.studybuddy.user.model.User;
import com.studybuddy.admin.repository.AllowedEmailDomainRepository;
import com.studybuddy.user.repository.UserRepository;
import com.studybuddy.email.service.EmailService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Authentication endpoints
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AllowedEmailDomainRepository domainRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private EmailService emailService;

    private User testUser;
    private AllowedEmailDomain testDomain;

    @BeforeEach
    void setUp() {
        // Mock email service to prevent actual email sending
        doNothing().when(emailService).sendVerificationEmail(anyString(), anyString());

        userRepository.deleteAll();
        domainRepository.deleteAll();

        // Add test domain to allowed list
        testDomain = new AllowedEmailDomain();
        testDomain.setDomain("example.com");
        testDomain.setStatus(AllowedEmailDomain.DomainStatus.ALLOW);
        testDomain.setInstitutionName("Test University");
        domainRepository.save(testDomain);

        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPassword(passwordEncoder.encode("password123"));
        testUser.setFullName("Test User");
        testUser.setRole(Role.USER);
        testUser.setIsActive(true);
        testUser.setIsEmailVerified(true); // Set as verified for login tests
        userRepository.save(testUser);
    }

    @Test
    void testRegisterUser_Success() throws Exception {
        // Arrange
        AuthDto.RegisterRequest request = new AuthDto.RegisterRequest();
        request.setUsername("newuser");
        request.setEmail("newuser@example.com");
        request.setPassword("password123");
        request.setFullName("New User");

        // Act & Assert
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").exists());

        // Verify user was created
        assertTrue(userRepository.existsByUsername("newuser"));
        assertTrue(userRepository.existsByEmail("newuser@example.com"));
    }

    @Test
    void testRegisterUser_DuplicateUsername() throws Exception {
        // Arrange
        AuthDto.RegisterRequest request = new AuthDto.RegisterRequest();
        request.setUsername("testuser"); // Already exists
        request.setEmail("different@example.com");
        request.setPassword("password123");
        request.setFullName("New User");

        // Act & Assert
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already taken")));
    }

    @Test
    void testRegisterUser_DuplicateEmail() throws Exception {
        // Arrange
        AuthDto.RegisterRequest request = new AuthDto.RegisterRequest();
        request.setUsername("differentuser");
        request.setEmail("test@example.com"); // Already exists
        request.setPassword("password123");
        request.setFullName("New User");

        // Act & Assert
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already registered")));
    }

    @Test
    void testRegisterUser_ValidationErrors() throws Exception {
        // Arrange - Missing required fields
        AuthDto.RegisterRequest request = new AuthDto.RegisterRequest();
        request.setUsername(""); // Empty username
        request.setEmail("invalid-email"); // Invalid email
        request.setPassword("123"); // Too short password

        // Act & Assert
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testLogin_Success() throws Exception {
        // Arrange
        AuthDto.LoginRequest request = new AuthDto.LoginRequest();
        request.setUsername("testuser");
        request.setPassword("password123");

        // Act & Assert
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.user").exists())
                .andExpect(jsonPath("$.user.username").value("testuser"))
                .andExpect(jsonPath("$.user.email").value("test@example.com"))
                .andExpect(jsonPath("$.user.role").value("USER"))
                .andExpect(jsonPath("$.user.emailVerified").value(true))
                .andExpect(jsonPath("$.user.institutionName").value("Test University"));
    }

    @Test
    void testLogin_InvalidCredentials() throws Exception {
        // Arrange
        AuthDto.LoginRequest request = new AuthDto.LoginRequest();
        request.setUsername("testuser");
        request.setPassword("wrongpassword");

        // Act & Assert
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Invalid username or password")));
    }

    @Test
    void testLogin_UserNotFound() throws Exception {
        // Arrange
        AuthDto.LoginRequest request = new AuthDto.LoginRequest();
        request.setUsername("nonexistent");
        request.setPassword("password123");

        // Act & Assert
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testRegisterUser_WithRole() throws Exception {
        // Arrange
        AuthDto.RegisterRequest request = new AuthDto.RegisterRequest();
        request.setUsername("expertuser");
        request.setEmail("expert@example.com");
        request.setPassword("password123");
        request.setFullName("Expert User");
        request.setRole("EXPERT");

        // Act & Assert
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // Verify user was created with EXPERT role
        User savedUser = userRepository.findByUsername("expertuser").orElse(null);
        assertNotNull(savedUser);
        assertEquals(Role.EXPERT, savedUser.getRole());
    }
}

