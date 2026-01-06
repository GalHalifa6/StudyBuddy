package com.studybuddy.test.integration;

import com.studybuddy.course.model.Course;
import com.studybuddy.user.model.Role;
import com.studybuddy.group.model.StudyGroup;
import com.studybuddy.user.model.User;
import com.studybuddy.course.repository.CourseRepository;
import com.studybuddy.group.repository.StudyGroupRepository;
import com.studybuddy.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.ObjectMapper;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for Course endpoints
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CourseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private StudyGroupRepository groupRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private Course testCourse1;
    private Course testCourse2;
    private User testUser;

    @BeforeEach
    void setUp() {
        courseRepository.deleteAll();
        groupRepository.deleteAll();
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

        // Create test courses
        testCourse1 = new Course();
        testCourse1.setCode("CS101");
        testCourse1.setName("Introduction to Computer Science");
        testCourse1.setDescription("Basic CS course");
        testCourse1.setFaculty("Engineering");
        testCourse1.setSemester("Fall 2024");
        testCourse1 = courseRepository.save(testCourse1);

        testCourse2 = new Course();
        testCourse2.setCode("MATH201");
        testCourse2.setName("Calculus II");
        testCourse2.setDescription("Advanced calculus");
        testCourse2.setFaculty("Mathematics");
        testCourse2.setSemester("Fall 2024");
        testCourse2 = courseRepository.save(testCourse2);

        // Create a group for course1
        StudyGroup group = new StudyGroup();
        group.setName("CS101 Group");
        group.setDescription("Study group for CS101");
        group.setTopic("Programming");
        group.setMaxSize(10);
        group.setVisibility("open");
        group.setCourse(testCourse1);
        group.setCreator(testUser);
        group.setIsActive(true);
        group.getMembers().add(testUser);
        groupRepository.save(group);

        // Enroll test user in course
        testUser.getCourses().add(testCourse1);
        testUser = userRepository.save(testUser);
    }

    @Test
    @WithMockUser(username = "testuser")
    void testGetAllCourses_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].code").exists())
                .andExpect(jsonPath("$[0].name").exists())
                .andExpect(jsonPath("$[0].groupCount").exists());
    }

    @Test
    @WithMockUser(username = "testuser")
    void testGetCourseById_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/courses/{id}", testCourse1.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testCourse1.getId()))
                .andExpect(jsonPath("$.code").value("CS101"))
                .andExpect(jsonPath("$.name").value("Introduction to Computer Science"))
                .andExpect(jsonPath("$.groupCount").value(1));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testGetCourseById_NotFound() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/courses/{id}", 99999L))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = "testuser")
    void testSearchCourses_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/courses/search")
                        .param("query", "Computer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].name").value(org.hamcrest.Matchers.containsString("Computer")));
    }

    @Test
    @WithMockUser(username = "testuser")
    void testSearchCourses_NoResults() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/courses/search")
                        .param("query", "NonexistentCourse"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void testCreateCourse_AsAdmin_Success() throws Exception {
        // Arrange
        Course newCourse = new Course();
        newCourse.setCode("CS201");
        newCourse.setName("Data Structures");
        newCourse.setDescription("Advanced data structures");
        newCourse.setFaculty("Engineering");
        newCourse.setSemester("Spring 2025");

        // Act & Assert
        mockMvc.perform(post("/api/courses")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newCourse)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("CS201"));
    }

    @Test
    @WithMockUser(username = "user", roles = "USER")
    void testCreateCourse_AsUser_Forbidden() throws Exception {
        // Arrange
        Course newCourse = new Course();
        newCourse.setCode("CS201");
        newCourse.setName("Data Structures");

        // Act & Assert
        mockMvc.perform(post("/api/courses")
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newCourse)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "testuser")
    void testGetAllCourses_WithGroupCount() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/api/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code == 'CS101')].groupCount").value(1))
                .andExpect(jsonPath("$[?(@.code == 'MATH201')].groupCount").value(0));
    }
}

