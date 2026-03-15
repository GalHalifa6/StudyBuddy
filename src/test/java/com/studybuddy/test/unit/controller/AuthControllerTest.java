package com.studybuddy.test.unit.controller;

import com.studybuddy.auth.controller.AuthController;
import com.studybuddy.auth.dto.AuthDto;
import com.studybuddy.user.model.Role;
import com.studybuddy.user.model.User;
import com.studybuddy.user.repository.UserRepository;
import com.studybuddy.security.JwtUtils;
import com.studybuddy.email.service.EmailDomainService;
import com.studybuddy.email.service.EmailVerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AuthController
 */
@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtils jwtUtils;

    @Mock
    private EmailDomainService emailDomainService;

    @Mock
    private EmailVerificationService emailVerificationService;

    @Mock
    private BindingResult bindingResult;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private AuthController authController;

    private User testUser;
    private AuthDto.RegisterRequest registerRequest;
    private AuthDto.LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPassword("encodedPassword");
        testUser.setFullName("Test User");
        testUser.setRole(Role.USER);
        testUser.setIsActive(true);
        testUser.setIsEmailVerified(true); // Add email verification

        registerRequest = new AuthDto.RegisterRequest();
        registerRequest.setUsername("newuser");
        registerRequest.setEmail("newuser@example.com");
        registerRequest.setPassword("password123");
        registerRequest.setFullName("New User");

        loginRequest = new AuthDto.LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("password123");
    }

    @Test
    void testRegisterUser_Success() {
        // Arrange
        when(bindingResult.hasErrors()).thenReturn(false);
        when(emailDomainService.isEmailDomainAllowed(anyString())).thenReturn(true); // Mock domain validation
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        ResponseEntity<?> response = authController.registerUser(registerRequest, bindingResult);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof AuthDto.MessageResponse);
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertTrue(messageResponse.isSuccess());
        verify(userRepository, times(1)).save(any(User.class));
        verify(emailVerificationService, times(1)).createAndSendVerificationToken(any(User.class));
    }

    @Test
    void testRegisterUser_UsernameAlreadyExists() {
        // Arrange
        when(bindingResult.hasErrors()).thenReturn(false);
        when(emailDomainService.isEmailDomainAllowed(anyString())).thenReturn(true);
        when(userRepository.existsByUsername(anyString())).thenReturn(true);

        // Act
        ResponseEntity<?> response = authController.registerUser(registerRequest, bindingResult);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertFalse(messageResponse.isSuccess());
        assertTrue(messageResponse.getMessage().contains("already taken"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testRegisterUser_EmailAlreadyExists() {
        // Arrange
        when(bindingResult.hasErrors()).thenReturn(false);
        when(emailDomainService.isEmailDomainAllowed(anyString())).thenReturn(true);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(true);

        // Act
        ResponseEntity<?> response = authController.registerUser(registerRequest, bindingResult);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertFalse(messageResponse.isSuccess());
        assertTrue(messageResponse.getMessage().contains("already registered"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testRegisterUser_ValidationErrors() {
        // Arrange
        when(bindingResult.hasErrors()).thenReturn(true);
        FieldError fieldError = new FieldError("registerRequest", "username", "Username is required");
        when(bindingResult.getFieldErrors()).thenReturn(java.util.List.of(fieldError));

        // Act
        ResponseEntity<?> response = authController.registerUser(registerRequest, bindingResult);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertFalse(messageResponse.isSuccess());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testLogin_Success() {
        // Arrange
        when(bindingResult.hasErrors()).thenReturn(false);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername("testuser")
                .password("encodedPassword")
                .authorities("ROLE_USER")
                .build();
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(jwtUtils.generateToken(any(UserDetails.class))).thenReturn("test-jwt-token");
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(testUser));
        when(emailDomainService.getInstitutionName(anyString())).thenReturn("Test University");

        // Act
        ResponseEntity<?> response = authController.authenticateUser(loginRequest, bindingResult);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof AuthDto.JwtResponse);
        AuthDto.JwtResponse jwtResponse = (AuthDto.JwtResponse) response.getBody();
        assertEquals("test-jwt-token", jwtResponse.getToken());
        assertNotNull(jwtResponse.getUser());
        assertEquals("testuser", jwtResponse.getUser().getUsername());
        assertEquals("test@example.com", jwtResponse.getUser().getEmail());
        assertEquals("USER", jwtResponse.getUser().getRole());
        assertTrue(jwtResponse.getUser().getEmailVerified());
        assertEquals("Test University", jwtResponse.getUser().getInstitutionName());
    }

    @Test
    void testLogin_InvalidCredentials() {
        // Arrange
        when(bindingResult.hasErrors()).thenReturn(false);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Invalid credentials"));

        // Act
        ResponseEntity<?> response = authController.authenticateUser(loginRequest, bindingResult);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertFalse(messageResponse.isSuccess());
        assertTrue(messageResponse.getMessage().contains("Invalid username or password"));
    }

    @Test
    void testLogin_ValidationErrors() {
        // Arrange
        when(bindingResult.hasErrors()).thenReturn(true);
        FieldError fieldError = new FieldError("loginRequest", "username", "Username is required");
        when(bindingResult.getFieldErrors()).thenReturn(java.util.List.of(fieldError));

        // Act
        ResponseEntity<?> response = authController.authenticateUser(loginRequest, bindingResult);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertFalse(messageResponse.isSuccess());
    }

    @Test
    void testRegisterUser_WithRole() {
        // Arrange
        registerRequest.setRole("EXPERT");
        when(bindingResult.hasErrors()).thenReturn(false);
        when(emailDomainService.isEmailDomainAllowed(anyString())).thenReturn(true);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        ResponseEntity<?> response = authController.registerUser(registerRequest, bindingResult);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(userRepository, times(1)).save(argThat(user -> 
            user.getRole() == Role.EXPERT
        ));
    }

    @Test
    void testRegisterUser_InvalidRole() {
        // Arrange
        registerRequest.setRole("INVALID_ROLE");
        when(bindingResult.hasErrors()).thenReturn(false);
        when(emailDomainService.isEmailDomainAllowed(anyString())).thenReturn(true);
        when(userRepository.existsByUsername(anyString())).thenReturn(false);
        when(userRepository.existsByEmail(anyString())).thenReturn(false);

        // Act
        ResponseEntity<?> response = authController.registerUser(registerRequest, bindingResult);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertFalse(messageResponse.isSuccess());
        assertTrue(messageResponse.getMessage().contains("Invalid role"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testRegisterUser_InvalidDomain() {
        // Arrange
        when(bindingResult.hasErrors()).thenReturn(false);
        when(emailDomainService.isEmailDomainAllowed(anyString())).thenReturn(false); // Domain not allowed
        when(emailDomainService.extractDomain(anyString())).thenReturn("example.com");

        // Act
        ResponseEntity<?> response = authController.registerUser(registerRequest, bindingResult);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertFalse(messageResponse.isSuccess());
        assertTrue(messageResponse.getMessage().contains("not authorized"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testLogin_EmailNotVerified() {
        // Arrange
        testUser.setIsEmailVerified(false); // Email not verified
        testUser.setGoogleSub(null); // Manual registration user
        
        when(bindingResult.hasErrors()).thenReturn(false);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(authentication);
        UserDetails userDetails = org.springframework.security.core.userdetails.User
                .withUsername("testuser")
                .password("encodedPassword")
                .authorities("ROLE_USER")
                .build();
        when(authentication.getPrincipal()).thenReturn(userDetails);
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.of(testUser));

        // Act
        ResponseEntity<?> response = authController.authenticateUser(loginRequest, bindingResult);

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertFalse(messageResponse.isSuccess());
        assertEquals("EMAIL_NOT_VERIFIED", messageResponse.getErrorCode());
        assertTrue(messageResponse.getMessage().contains("not verified"));
    }
}

