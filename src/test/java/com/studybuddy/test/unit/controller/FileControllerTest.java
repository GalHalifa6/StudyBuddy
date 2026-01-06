package com.studybuddy.test.unit.controller;

import com.studybuddy.file.controller.FileController;
import com.studybuddy.file.model.FileUpload;
import com.studybuddy.group.model.StudyGroup;
import com.studybuddy.user.model.User;
import com.studybuddy.file.repository.FileUploadRepository;
import com.studybuddy.group.repository.StudyGroupRepository;
import com.studybuddy.user.repository.UserRepository;
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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for FileController
 */
@ExtendWith(MockitoExtension.class)
class FileControllerTest {

    @Mock
    private FileUploadRepository fileUploadRepository;

    @Mock
    private StudyGroupRepository groupRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MultipartFile multipartFile;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private FileController fileController;

    private User testUser;
    private StudyGroup testGroup;
    private FileUpload testFileUpload;
    private Path testUploadDir;

    @BeforeEach
    void setUp() throws IOException {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setRole(com.studybuddy.model.Role.USER);

        testGroup = new StudyGroup();
        testGroup.setId(1L);
        testGroup.setName("Test Group");

        testFileUpload = new FileUpload();
        testFileUpload.setId(1L);
        testFileUpload.setFilename("test-file.pdf");
        testFileUpload.setOriginalFilename("test.pdf");
        testFileUpload.setFilePath("./test-uploads/group_1/test-file.pdf");
        testFileUpload.setFileType("application/pdf");
        testFileUpload.setFileSize(1024L);
        testFileUpload.setUploader(testUser);
        testFileUpload.setGroup(testGroup);

        // Create test upload directory
        testUploadDir = Files.createTempDirectory("test-uploads");
        ReflectionTestUtils.setField(fileController, "uploadDir", testUploadDir.toString());
        ReflectionTestUtils.setField(fileController, "uploadPath", testUploadDir);
    }

    @Test
    void testUploadFile_Success() throws IOException {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getSize()).thenReturn(1024L);
        when(multipartFile.getOriginalFilename()).thenReturn("test.pdf");
        when(multipartFile.getContentType()).thenReturn("application/pdf");
        when(multipartFile.getInputStream()).thenReturn(
                new java.io.ByteArrayInputStream("test content".getBytes()));
        when(fileUploadRepository.save(any(FileUpload.class))).thenReturn(testFileUpload);

        // Act
        ResponseEntity<?> response = fileController.uploadFile(1L, multipartFile);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(fileUploadRepository, times(1)).save(any(FileUpload.class));
    }

    @Test
    void testUploadFile_EmptyFile() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));
        when(multipartFile.isEmpty()).thenReturn(true);

        // Act
        ResponseEntity<?> response = fileController.uploadFile(1L, multipartFile);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Please select a file"));
        verify(fileUploadRepository, never()).save(any(FileUpload.class));
    }

    @Test
    void testUploadFile_FileTooLarge() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getSize()).thenReturn(100L * 1024 * 1024); // 100MB

        // Act
        ResponseEntity<?> response = fileController.uploadFile(1L, multipartFile);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("exceeds maximum limit"));
        verify(fileUploadRepository, never()).save(any(FileUpload.class));
    }

    @Test
    void testUploadFile_InvalidFileType() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));
        when(multipartFile.isEmpty()).thenReturn(false);
        when(multipartFile.getSize()).thenReturn(1024L);
        when(multipartFile.getOriginalFilename()).thenReturn("test.exe");

        // Act
        ResponseEntity<?> response = fileController.uploadFile(1L, multipartFile);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("File type not allowed"));
        verify(fileUploadRepository, never()).save(any(FileUpload.class));
    }

    @Test
    void testGetGroupFiles_Success() {
        // Arrange
        List<FileUpload> files = new ArrayList<>(List.of(testFileUpload));
        when(fileUploadRepository.findByGroupIdOrderByUploadedAtDesc(1L)).thenReturn(files);

        // Act
        ResponseEntity<List<Map<String, Object>>> response = fileController.getGroupFiles(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        verify(fileUploadRepository, times(1)).findByGroupIdOrderByUploadedAtDesc(1L);
    }

    @Test
    void testGetFileInfo_Success() {
        // Arrange
        when(fileUploadRepository.findById(1L)).thenReturn(Optional.of(testFileUpload));

        // Act
        ResponseEntity<?> response = fileController.getFileInfo(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(fileUploadRepository, times(1)).findById(1L);
    }

    @Test
    void testGetFileInfo_NotFound() {
        // Arrange
        when(fileUploadRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> {
            fileController.getFileInfo(1L);
        });
    }

    @Test
    void testDeleteFile_Success_AsUploader() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(fileUploadRepository.findById(1L)).thenReturn(Optional.of(testFileUpload));

        // Act
        ResponseEntity<?> response = fileController.deleteFile(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(fileUploadRepository, times(1)).delete(testFileUpload);
    }

    @Test
    void testDeleteFile_Success_AsAdmin() {
        // Arrange
        User adminUser = new User();
        adminUser.setId(2L);
        adminUser.setUsername("admin");
        adminUser.setRole(com.studybuddy.model.Role.ADMIN);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(fileUploadRepository.findById(1L)).thenReturn(Optional.of(testFileUpload));

        // Act
        ResponseEntity<?> response = fileController.deleteFile(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(fileUploadRepository, times(1)).delete(testFileUpload);
    }

    @Test
    void testDeleteFile_Unauthorized() {
        // Arrange
        User otherUser = new User();
        otherUser.setId(2L);
        otherUser.setUsername("otheruser");
        otherUser.setRole(com.studybuddy.model.Role.USER);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("otheruser");
        when(userRepository.findByUsername("otheruser")).thenReturn(Optional.of(otherUser));
        when(fileUploadRepository.findById(1L)).thenReturn(Optional.of(testFileUpload));

        // Act
        ResponseEntity<?> response = fileController.deleteFile(1L);

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertTrue(response.getBody().toString().contains("Not authorized"));
        verify(fileUploadRepository, never()).delete(any(FileUpload.class));
    }
}

