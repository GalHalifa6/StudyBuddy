package com.studybuddy.test.unit.security;

import com.studybuddy.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for JwtUtils
 */
@ExtendWith(MockitoExtension.class)
class JwtUtilsTest {

    @InjectMocks
    private JwtUtils jwtUtils;

    private UserDetails userDetails;
    private static final String TEST_SECRET = "testSecretKeyForStudyBuddyPlatformTestingOnly123456";
    private static final Long TEST_EXPIRATION = 86400000L; // 24 hours

    @BeforeEach
    void setUp() {
        // Set private fields using reflection
        ReflectionTestUtils.setField(jwtUtils, "secret", TEST_SECRET);
        ReflectionTestUtils.setField(jwtUtils, "expiration", TEST_EXPIRATION);

        userDetails = User.builder()
                .username("testuser")
                .password("password")
                .authorities("ROLE_USER")
                .build();
    }

    @Test
    void testGenerateToken_Success() {
        // Act
        String token = jwtUtils.generateToken(userDetails);

        // Assert
        assertNotNull(token);
        assertFalse(token.isEmpty());
    }

    @Test
    void testExtractUsername_Success() {
        // Arrange
        String token = jwtUtils.generateToken(userDetails);

        // Act
        String username = jwtUtils.extractUsername(token);

        // Assert
        assertNotNull(username);
        assertEquals("testuser", username);
    }

    @Test
    void testExtractExpiration_Success() {
        // Arrange
        String token = jwtUtils.generateToken(userDetails);

        // Act
        Date expiration = jwtUtils.extractExpiration(token);

        // Assert
        assertNotNull(expiration);
        assertTrue(expiration.after(new Date()));
    }

    @Test
    void testValidateToken_ValidToken_Success() {
        // Arrange
        String token = jwtUtils.generateToken(userDetails);

        // Act
        Boolean isValid = jwtUtils.validateToken(token, userDetails);

        // Assert
        assertNotNull(isValid);
        assertTrue(isValid);
    }

    @Test
    void testValidateToken_InvalidUsername_Fails() {
        // Arrange
        String token = jwtUtils.generateToken(userDetails);
        UserDetails differentUser = User.builder()
                .username("differentuser")
                .password("password")
                .authorities("ROLE_USER")
                .build();

        // Act
        Boolean isValid = jwtUtils.validateToken(token, differentUser);

        // Assert
        assertNotNull(isValid);
        assertFalse(isValid);
    }

    @Test
    void testTokenExpiration() {
        // Arrange - Create a token with very short expiration
        ReflectionTestUtils.setField(jwtUtils, "expiration", 1000L); // 1 second
        String token = jwtUtils.generateToken(userDetails);

        // Wait for token to expire
        try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Act & Assert - extractExpiration throws exception for expired tokens
        assertThrows(Exception.class, () -> {
            jwtUtils.extractExpiration(token);
        });
        
        // Validate token should also throw exception or return false for expired tokens
        // The validateToken method calls extractExpiration which will throw
        assertThrows(Exception.class, () -> {
            jwtUtils.validateToken(token, userDetails);
        });
    }

    @Test
    void testTokenStructure() {
        // Arrange
        String token = jwtUtils.generateToken(userDetails);

        // Assert
        assertNotNull(token);
        // JWT tokens have 3 parts separated by dots
        String[] parts = token.split("\\.");
        assertEquals(3, parts.length);
    }
}

