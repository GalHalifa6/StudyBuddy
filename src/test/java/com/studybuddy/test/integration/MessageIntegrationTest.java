package com.studybuddy.test.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studybuddy.user.model.User;
import com.studybuddy.course.model.Course;
import com.studybuddy.group.model.StudyGroup;
import com.studybuddy.user.repository.UserRepository;
import com.studybuddy.course.repository.CourseRepository;
import com.studybuddy.group.repository.StudyGroupRepository;
import com.studybuddy.messaging.repository.MessageRepository;
import com.studybuddy.file.repository.FileUploadRepository;
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
 * Integration tests for Message endpoints
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class MessageIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private StudyGroupRepository groupRepository;

    @Autowired
    private MessageRepository messageRepository;

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
        messageRepository.deleteAll();

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
    void testGetGroupMessages_Success() throws Exception {
        // Arrange - Create a message
        Message message = new Message();
        message.setContent("Hello world");
        message.setSender(testUser);
        message.setGroup(testGroup);
        message.setMessageType("text");
        message.setIsPinned(false);
        messageRepository.save(message);

        // Act & Assert
        mockMvc.perform(get("/api/messages/group/{groupId}", testGroup.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].content").value("Hello world"));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testSendMessage_Success() throws Exception {
        // Arrange
        Map<String, Object> payload = new HashMap<>();
        payload.put("content", "Test message");
        payload.put("messageType", "text");

        // Act & Assert
        mockMvc.perform(post("/api/messages/group/{groupId}", testGroup.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("Test message"))
                .andExpect(jsonPath("$.id").exists());

        // Verify message was saved
        assertEquals(1, messageRepository.findByGroupIdOrderByCreatedAtAsc(testGroup.getId()).size());
    }

    @Test
    @WithMockUser(username = "testuser")
    void testSendMessage_WithFileAttachment() throws Exception {
        // Arrange - Create a file first
        FileUpload file = new FileUpload();
        file.setFilename("test.pdf");
        file.setOriginalFilename("test.pdf");
        file.setFilePath("./test-uploads/test.pdf");
        file.setFileType("application/pdf");
        file.setFileSize(1024L);
        file.setUploader(testUser);
        file.setGroup(testGroup);
        file = fileUploadRepository.save(file);

        Map<String, Object> payload = new HashMap<>();
        payload.put("content", "Check this file");
        payload.put("fileId", file.getId());

        // Act & Assert
        mockMvc.perform(post("/api/messages/group/{groupId}", testGroup.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messageType").value("file"))
                .andExpect(jsonPath("$.attachedFile").exists());
    }

    @Test
    @WithMockUser(username = "testuser")
    void testTogglePin_Success() throws Exception {
        // Arrange - Create a message
        Message message = new Message();
        message.setContent("Important message");
        message.setSender(testUser);
        message.setGroup(testGroup);
        message.setMessageType("text");
        message.setIsPinned(false);
        message = messageRepository.save(message);

        // Act & Assert
        mockMvc.perform(post("/api/messages/{id}/pin", message.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isPinned").value(true));

        // Verify message is pinned
        Message updatedMessage = messageRepository.findById(message.getId()).orElse(null);
        assertNotNull(updatedMessage);
        assertTrue(updatedMessage.getIsPinned());
    }

    @Test
    @WithMockUser(username = "testuser")
    void testGetPinnedMessages_Success() throws Exception {
        // Arrange - Create pinned message
        Message pinnedMessage = new Message();
        pinnedMessage.setContent("Pinned message");
        pinnedMessage.setSender(testUser);
        pinnedMessage.setGroup(testGroup);
        pinnedMessage.setMessageType("text");
        pinnedMessage.setIsPinned(true);
        messageRepository.save(pinnedMessage);

        // Act & Assert
        mockMvc.perform(get("/api/messages/group/{groupId}/pinned", testGroup.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].isPinned").value(true));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testDeleteMessage_Success_AsSender() throws Exception {
        // Arrange - Create a message
        Message message = new Message();
        message.setContent("Message to delete");
        message.setSender(testUser);
        message.setGroup(testGroup);
        message.setMessageType("text");
        message = messageRepository.save(message);

        // Act & Assert
        mockMvc.perform(delete("/api/messages/{id}", message.getId()))
                .andExpect(status().isOk());

        // Verify message was deleted
        assertFalse(messageRepository.existsById(message.getId()));
    }
}

