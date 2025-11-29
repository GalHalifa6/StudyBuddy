package com.studybuddy.test.integration;

import com.studybuddy.model.*;
import com.studybuddy.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for File endpoints
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FileIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private StudyGroupRepository groupRepository;

    @Autowired
    private FileUploadRepository fileUploadRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User testUser;
    private User anotherUser;
    private Course testCourse;
    private StudyGroup testGroup;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        courseRepository.deleteAll();
        groupRepository.deleteAll();
        fileUploadRepository.deleteAll();

        // Create test user
        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPassword(passwordEncoder.encode("password123"));
        testUser.setFullName("Test User");
        testUser.setRole(Role.USER);
        testUser.setIsActive(true);
        testUser = userRepository.save(testUser);

        // Create another user
        anotherUser = new User();
        anotherUser.setUsername("anotheruser");
        anotherUser.setEmail("another@example.com");
        anotherUser.setPassword(passwordEncoder.encode("password123"));
        anotherUser.setFullName("Another User");
        anotherUser.setRole(Role.USER);
        anotherUser.setIsActive(true);
        anotherUser = userRepository.save(anotherUser);

        // Create test course
        testCourse = new Course();
        testCourse.setCode("CS101");
        testCourse.setName("Introduction to Computer Science");
        testCourse.setDescription("Basic CS course");
        testCourse.setFaculty("Engineering");
        testCourse.setSemester("Fall 2024");
        testCourse = courseRepository.save(testCourse);

        // Create test group
        testGroup = new StudyGroup();
        testGroup.setName("Test Group");
        testGroup.setDescription("Test Description");
        testGroup.setTopic("Test Topic");
        testGroup.setMaxSize(10);
        testGroup.setVisibility("open");
        testGroup.setCourse(testCourse);
        testGroup.setCreator(testUser);
        testGroup.setIsActive(true);
        testGroup.getMembers().add(testUser);
        testGroup = groupRepository.save(testGroup);
    }

    @Test
    @WithMockUser(username = "testuser")
    void testUploadFile_Success() throws Exception {
        // Arrange
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.pdf",
                "application/pdf",
                "test content".getBytes()
        );

        // Act & Assert
        mockMvc.perform(multipart("/api/files/upload/group/{groupId}", testGroup.getId())
                        .file(file))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.originalFilename").value("test.pdf"))
                .andExpect(jsonPath("$.id").exists());

        // Verify file was saved
        assertEquals(1, fileUploadRepository.findByGroupIdOrderByUploadedAtDesc(testGroup.getId()).size());
    }

    @Test
    @WithMockUser(username = "testuser")
    void testUploadFile_EmptyFile() throws Exception {
        // Arrange
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file",
                "empty.pdf",
                "application/pdf",
                new byte[0]
        );

        // Act & Assert
        mockMvc.perform(multipart("/api/files/upload/group/{groupId}", testGroup.getId())
                        .file(emptyFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.containsString("Please select a file")));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testUploadFile_InvalidFileType() throws Exception {
        // Arrange
        MockMultipartFile invalidFile = new MockMultipartFile(
                "file",
                "test.exe",
                "application/x-msdownload",
                "test content".getBytes()
        );

        // Act & Assert
        mockMvc.perform(multipart("/api/files/upload/group/{groupId}", testGroup.getId())
                        .file(invalidFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.containsString("File type not allowed")));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testGetGroupFiles_Success() throws Exception {
        // Arrange - Create a file
        FileUpload file = new FileUpload();
        file.setFilename("test-file.pdf");
        file.setOriginalFilename("test.pdf");
        file.setFilePath("./test-uploads/group_1/test-file.pdf");
        file.setFileType("application/pdf");
        file.setFileSize(1024L);
        file.setUploader(testUser);
        file.setGroup(testGroup);
        fileUploadRepository.save(file);

        // Act & Assert
        mockMvc.perform(get("/api/files/group/{groupId}", testGroup.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].originalFilename").value("test.pdf"));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testGetFileInfo_Success() throws Exception {
        // Arrange - Create a file
        FileUpload file = new FileUpload();
        file.setFilename("test-file.pdf");
        file.setOriginalFilename("test.pdf");
        file.setFilePath("./test-uploads/group_1/test-file.pdf");
        file.setFileType("application/pdf");
        file.setFileSize(1024L);
        file.setUploader(testUser);
        file.setGroup(testGroup);
        file = fileUploadRepository.save(file);

        // Act & Assert
        mockMvc.perform(get("/api/files/info/{fileId}", file.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.originalFilename").value("test.pdf"))
                .andExpect(jsonPath("$.fileSize").value(1024));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testDeleteFile_Success_AsUploader() throws Exception {
        // Arrange - Create a file
        FileUpload file = new FileUpload();
        file.setFilename("test-file.pdf");
        file.setOriginalFilename("test.pdf");
        file.setFilePath("./test-uploads/group_1/test-file.pdf");
        file.setFileType("application/pdf");
        file.setFileSize(1024L);
        file.setUploader(testUser);
        file.setGroup(testGroup);
        file = fileUploadRepository.save(file);

        // Act & Assert
        mockMvc.perform(delete("/api/files/{fileId}", file.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.containsString("deleted successfully")));

        // Verify file was deleted
        assertFalse(fileUploadRepository.existsById(file.getId()));
    }

    @Test
    @WithMockUser(username = "anotheruser")
    void testDeleteFile_Unauthorized() throws Exception {
        // Arrange - Create a file uploaded by testUser
        FileUpload file = new FileUpload();
        file.setFilename("test-file.pdf");
        file.setOriginalFilename("test.pdf");
        file.setFilePath("./test-uploads/group_1/test-file.pdf");
        file.setFileType("application/pdf");
        file.setFileSize(1024L);
        file.setUploader(testUser);
        file.setGroup(testGroup);
        file = fileUploadRepository.save(file);

        // Act & Assert
        mockMvc.perform(delete("/api/files/{fileId}", file.getId()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.containsString("Not authorized")));
    }
}

