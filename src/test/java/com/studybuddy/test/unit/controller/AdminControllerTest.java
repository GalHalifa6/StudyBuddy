package com.studybuddy.test.unit.controller;

import com.studybuddy.admin.controller.AdminController;
import com.studybuddy.auth.dto.AuthDto;
import com.studybuddy.admin.dto.UserAdminDto;
import com.studybuddy.user.model.Role;
import com.studybuddy.user.model.User;
import com.studybuddy.user.repository.UserRepository;
import com.studybuddy.auth.repository.EmailVerificationTokenRepository;
import com.studybuddy.notification.repository.NotificationRepository;
import com.studybuddy.group.repository.GroupMemberRequestRepository;
import com.studybuddy.expert.repository.QuestionVoteRepository;
import com.studybuddy.expert.repository.SessionParticipantRepository;
import com.studybuddy.expert.repository.ExpertProfileRepository;
import com.studybuddy.admin.service.AdminService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AdminController
 */
@ExtendWith(MockitoExtension.class)
class AdminControllerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private GroupMemberRequestRepository groupMemberRequestRepository;

    @Mock
    private QuestionVoteRepository questionVoteRepository;

    @Mock
    private SessionParticipantRepository sessionParticipantRepository;

    @Mock
    private ExpertProfileRepository expertProfileRepository;

    @Mock
    private AdminService adminService;

    @InjectMocks
    private AdminController adminController;

    private User testUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setFullName("Test User");
        testUser.setRole(Role.USER);
        testUser.setIsActive(true);
        testUser.setIsDeleted(false);
        testUser.setIsEmailVerified(false);

        adminUser = new User();
        adminUser.setId(2L);
        adminUser.setUsername("admin");
        adminUser.setEmail("admin@example.com");
        adminUser.setFullName("Admin User");
        adminUser.setRole(Role.ADMIN);
        adminUser.setIsActive(true);
        adminUser.setIsDeleted(false);
        adminUser.setIsEmailVerified(false);
    }

    @Test
    void testGetAllUsers_Success() {
        // Arrange
        testUser.setIsDeleted(false);
        adminUser.setIsDeleted(false);
        List<User> users = new ArrayList<>(List.of(testUser, adminUser));
        when(userRepository.findAll()).thenReturn(users);

        // Act
        ResponseEntity<List<UserAdminDto>> response = adminController.getAllUsers(null);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(2, response.getBody().size());
        assertEquals("testuser", response.getBody().get(0).getUsername());
        assertEquals(Role.USER, response.getBody().get(0).getRole());
        verify(userRepository, times(1)).findAll();
    }

    @Test
    void testGetUserById_Success() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        // Act
        ResponseEntity<UserAdminDto> response = adminController.getUserById(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1L, response.getBody().getId());
        assertEquals("testuser", response.getBody().getUsername());
        assertEquals(Role.USER, response.getBody().getRole());
        verify(userRepository, times(1)).findById(1L);
    }

    @Test
    void testGetUserById_NotFound() {
        // Arrange
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        // Act
        ResponseEntity<UserAdminDto> response = adminController.getUserById(1L);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(userRepository, times(1)).findById(1L);
    }

    @Test
    void testUpdateUserRole_Success() {
        // Arrange
        AdminController.RoleUpdateRequest request = new AdminController.RoleUpdateRequest();
        request.setRole("EXPERT");
        request.setReason("Test reason");

        when(adminService.updateUserRole(1L, Role.EXPERT, "Test reason")).thenReturn(testUser);

        // Act
        ResponseEntity<?> response = adminController.updateUserRole(1L, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof AuthDto.MessageResponse);
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertTrue(messageResponse.isSuccess());
        verify(adminService, times(1)).updateUserRole(1L, Role.EXPERT, "Test reason");
    }

    @Test
    void testUpdateUserRole_InvalidRole() {
        // Arrange
        AdminController.RoleUpdateRequest request = new AdminController.RoleUpdateRequest();
        request.setRole("INVALID_ROLE");
        request.setReason("Test reason");

        // Act
        ResponseEntity<?> response = adminController.updateUserRole(1L, request);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof AuthDto.MessageResponse);
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertFalse(messageResponse.isSuccess());
        verify(adminService, never()).updateUserRole(anyLong(), any(), anyString());
    }

    @Test
    void testUpdateUserRole_UserNotFound() {
        // Arrange
        AdminController.RoleUpdateRequest request = new AdminController.RoleUpdateRequest();
        request.setRole("EXPERT");
        request.setReason("Test reason");

        when(adminService.updateUserRole(1L, Role.EXPERT, "Test reason"))
                .thenThrow(new RuntimeException("User not found"));

        // Act
        ResponseEntity<?> response = adminController.updateUserRole(1L, request);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void testUpdateUserStatus_Success_Activate() {
        // Arrange
        AdminController.StatusUpdateRequest request = new AdminController.StatusUpdateRequest();
        request.setActive(true);
        request.setReason("Test reason");
        testUser.setIsActive(false);

        when(adminService.enableLogin(1L, "Test reason")).thenReturn(testUser);

        // Act
        ResponseEntity<?> response = adminController.updateUserStatus(1L, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(adminService, times(1)).enableLogin(1L, "Test reason");
    }

    @Test
    void testUpdateUserStatus_Success_Deactivate() {
        // Arrange
        AdminController.StatusUpdateRequest request = new AdminController.StatusUpdateRequest();
        request.setActive(false);
        request.setReason("Test reason");

        when(adminService.disableLogin(1L, "Test reason")).thenReturn(testUser);

        // Act
        ResponseEntity<?> response = adminController.updateUserStatus(1L, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(adminService, times(1)).disableLogin(1L, "Test reason");
    }

    @Test
    void testUpdateUserStatus_UserNotFound() {
        // Arrange
        AdminController.StatusUpdateRequest request = new AdminController.StatusUpdateRequest();
        request.setActive(true);
        request.setReason("Test reason");

        when(adminService.enableLogin(1L, "Test reason"))
                .thenThrow(new RuntimeException("User not found"));

        // Act
        ResponseEntity<?> response = adminController.updateUserStatus(1L, request);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void testPermanentDeleteUser_Success() {
        // Arrange
        AdminController.DeleteRequest request = new AdminController.DeleteRequest();
        request.setReason("Test reason");
        
        doNothing().when(adminService).permanentDeleteUser(1L, "Test reason");

        // Act
        ResponseEntity<?> response = adminController.permanentDeleteUser(1L, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof AuthDto.MessageResponse);
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertTrue(messageResponse.isSuccess());
        verify(adminService, times(1)).permanentDeleteUser(1L, "Test reason");
    }

    @Test
    void testPermanentDeleteUser_NotFound() {
        // Arrange
        AdminController.DeleteRequest request = new AdminController.DeleteRequest();
        request.setReason("Test reason");
        
        doThrow(new RuntimeException("User not found"))
                .when(adminService).permanentDeleteUser(1L, "Test reason");

        // Act
        ResponseEntity<?> response = adminController.permanentDeleteUser(1L, request);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(adminService, times(1)).permanentDeleteUser(1L, "Test reason");
    }
}





