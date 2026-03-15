package com.studybuddy.test.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studybuddy.course.model.Course;
import com.studybuddy.user.model.Role;
import com.studybuddy.group.model.StudyGroup;
import com.studybuddy.user.model.User;
import com.studybuddy.course.repository.CourseRepository;
import com.studybuddy.group.repository.StudyGroupRepository;
import com.studybuddy.group.repository.GroupMemberRequestRepository;
import com.studybuddy.user.repository.UserRepository;
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
 * Integration tests for Group management endpoints
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class GroupIntegrationTest {

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
    private GroupMemberRequestRepository requestRepository;

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
        requestRepository.deleteAll();

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

        // Enroll test user in course
        testUser.getCourses().add(testCourse);
        testUser = userRepository.save(testUser);

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
    void testCreateGroup_Success() throws Exception {
        // Arrange
        Map<String, Object> request = new HashMap<>();
        request.put("name", "New Group");
        request.put("description", "New Description");
        request.put("topic", "New Topic");
        request.put("maxSize", 10);
        request.put("visibility", "open");
        
        Map<String, Object> courseMap = new HashMap<>();
        courseMap.put("id", testCourse.getId());
        request.put("course", courseMap);

        // Act & Assert
        mockMvc.perform(post("/api/groups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("New Group"))
                .andExpect(jsonPath("$.id").exists());

        // Verify group was created
        assertTrue(groupRepository.findAll().size() >= 2);
    }

    @Test
    @WithMockUser(username = "testuser")
    void testGetGroupById_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/groups/{id}", testGroup.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testGroup.getId()))
                .andExpect(jsonPath("$.name").value("Test Group"));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testGetGroupById_NotFound() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/groups/{id}", 99999L))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "anotheruser")
    void testJoinGroup_OpenGroup_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(post("/api/groups/{id}/join", testGroup.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("JOINED"));

        // Verify user was added to group - refresh entities
        userRepository.flush();
        groupRepository.flush();
        StudyGroup updatedGroup = groupRepository.findById(testGroup.getId()).orElse(null);
        assertNotNull(updatedGroup);
        // Refresh to get updated members
        updatedGroup = groupRepository.findById(testGroup.getId()).orElse(null);
        User updatedUser = userRepository.findById(anotherUser.getId()).orElse(null);
        assertNotNull(updatedUser);
        assertTrue(updatedUser.getGroups().stream()
                .anyMatch(g -> g.getId().equals(testGroup.getId())));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testJoinGroup_AlreadyMember() throws Exception {
        // Ensure testUser is properly associated with the group
        testUser = userRepository.findById(testUser.getId()).orElse(testUser);
        testGroup = groupRepository.findById(testGroup.getId()).orElse(testGroup);
        if (!testUser.getGroups().contains(testGroup)) {
            testUser.getGroups().add(testGroup);
            userRepository.save(testUser);
        }
        userRepository.flush();
        
        // Act & Assert
        mockMvc.perform(post("/api/groups/{id}/join", testGroup.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Already a member")));
    }

    @Test
    @WithMockUser(username = "anotheruser")
    void testJoinGroup_ApprovalGroup_CreatesRequest() throws Exception {
        // Arrange
        testGroup.setVisibility("approval");
        groupRepository.save(testGroup);

        // Act & Assert
        mockMvc.perform(post("/api/groups/{id}/join", testGroup.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING"));

        // Verify request was created
        assertTrue(requestRepository.existsPendingRequestForUser(testGroup.getId(), anotherUser.getId()));
    }

    @Test
    @WithMockUser(username = "anotheruser")
    void testJoinGroup_PrivateGroup_Denied() throws Exception {
        // Arrange
        testGroup.setVisibility("private");
        groupRepository.save(testGroup);

        // Act & Assert
        mockMvc.perform(post("/api/groups/{id}/join", testGroup.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("private")));
    }

    @Test
    @WithMockUser(username = "anotheruser")
    void testGetMyGroups_Empty() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/groups/my-groups"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser(username = "testuser")
    void testGetMyGroups_WithGroups() throws Exception {
        // Ensure testUser is properly associated with the group
        testUser = userRepository.findById(testUser.getId()).orElse(testUser);
        testGroup = groupRepository.findById(testGroup.getId()).orElse(testGroup);
        if (!testUser.getGroups().contains(testGroup)) {
            testUser.getGroups().add(testGroup);
            userRepository.save(testUser);
        }
        
        // Act & Assert
        mockMvc.perform(get("/api/groups/my-groups"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(testGroup.getId()));
    }

    @Test
    @WithMockUser(username = "anotheruser")
    void testLeaveGroup_Success() throws Exception {
        // Arrange - Add user to group first
        anotherUser = userRepository.findById(anotherUser.getId()).orElse(anotherUser);
        testGroup = groupRepository.findById(testGroup.getId()).orElse(testGroup);
        anotherUser.getGroups().add(testGroup);
        testGroup.getMembers().add(anotherUser);
        userRepository.save(anotherUser);
        groupRepository.save(testGroup);
        userRepository.flush();
        groupRepository.flush();

        // Act & Assert
        mockMvc.perform(post("/api/groups/{id}/leave", testGroup.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Left group")));

        // Verify user was removed from group - refresh entities
        userRepository.flush();
        User updatedUser = userRepository.findById(anotherUser.getId()).orElse(null);
        assertNotNull(updatedUser);
        assertFalse(updatedUser.getGroups().stream()
                .anyMatch(g -> g.getId().equals(testGroup.getId())));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testLeaveGroup_CreatorCannotLeave() throws Exception {
        // Act & Assert
        mockMvc.perform(post("/api/groups/{id}/leave", testGroup.getId()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("creator cannot leave")));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testGetGroupsByCourse_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/groups/course/{courseId}", testCourse.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(testGroup.getId()));
    }
}

