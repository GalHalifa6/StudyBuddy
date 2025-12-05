package com.studybuddy.test.unit.controller;

import com.studybuddy.controller.AdminController;
import com.studybuddy.dto.AuthDto;
import com.studybuddy.dto.UserAdminDto;
import com.studybuddy.model.Role;
import com.studybuddy.model.User;
import com.studybuddy.repository.UserRepository;
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

        adminUser = new User();
        adminUser.setId(2L);
        adminUser.setUsername("admin");
        adminUser.setEmail("admin@example.com");
        adminUser.setFullName("Admin User");
        adminUser.setRole(Role.ADMIN);
        adminUser.setIsActive(true);
    }

    @Test
    void testGetAllUsers_Success() {
        // Arrange
        List<User> users = new ArrayList<>(List.of(testUser, adminUser));
        when(userRepository.findAll()).thenReturn(users);

        // Act
        ResponseEntity<List<UserAdminDto>> response = adminController.getAllUsers();

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

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        ResponseEntity<?> response = adminController.updateUserRole(1L, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof AuthDto.MessageResponse);
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertTrue(messageResponse.isSuccess());
        verify(userRepository, times(1)).save(argThat(user -> 
            user.getRole() == Role.EXPERT
        ));
    }

    @Test
    void testUpdateUserRole_InvalidRole() {
        // Arrange
        AdminController.RoleUpdateRequest request = new AdminController.RoleUpdateRequest();
        request.setRole("INVALID_ROLE");

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));

        // Act
        ResponseEntity<?> response = adminController.updateUserRole(1L, request);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof AuthDto.MessageResponse);
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertFalse(messageResponse.isSuccess());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testUpdateUserRole_UserNotFound() {
        // Arrange
        AdminController.RoleUpdateRequest request = new AdminController.RoleUpdateRequest();
        request.setRole("EXPERT");

        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        // Act
        ResponseEntity<?> response = adminController.updateUserRole(1L, request);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testUpdateUserStatus_Success_Activate() {
        // Arrange
        AdminController.StatusUpdateRequest request = new AdminController.StatusUpdateRequest();
        request.setActive(true);
        testUser.setIsActive(false);

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        ResponseEntity<?> response = adminController.updateUserStatus(1L, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(userRepository, times(1)).save(argThat(user -> 
            user.getIsActive() == true
        ));
    }

    @Test
    void testUpdateUserStatus_Success_Deactivate() {
        // Arrange
        AdminController.StatusUpdateRequest request = new AdminController.StatusUpdateRequest();
        request.setActive(false);

        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        // Act
        ResponseEntity<?> response = adminController.updateUserStatus(1L, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(userRepository, times(1)).save(argThat(user -> 
            user.getIsActive() == false
        ));
    }

    @Test
    void testUpdateUserStatus_UserNotFound() {
        // Arrange
        AdminController.StatusUpdateRequest request = new AdminController.StatusUpdateRequest();
        request.setActive(true);

        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        // Act
        ResponseEntity<?> response = adminController.updateUserStatus(1L, request);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testDeleteUser_Success() {
        // Arrange
        when(userRepository.existsById(1L)).thenReturn(true);
        doNothing().when(userRepository).deleteById(1L);

        // Act
        ResponseEntity<?> response = adminController.deleteUser(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof AuthDto.MessageResponse);
        AuthDto.MessageResponse messageResponse = (AuthDto.MessageResponse) response.getBody();
        assertTrue(messageResponse.isSuccess());
        verify(userRepository, times(1)).deleteById(1L);
    }

    @Test
    void testDeleteUser_NotFound() {
        // Arrange
        when(userRepository.existsById(1L)).thenReturn(false);

        // Act
        ResponseEntity<?> response = adminController.deleteUser(1L);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(userRepository, never()).deleteById(anyLong());
    }
}

