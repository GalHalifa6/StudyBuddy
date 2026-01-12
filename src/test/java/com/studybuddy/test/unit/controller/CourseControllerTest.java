package com.studybuddy.test.unit.controller;

import com.studybuddy.course.controller.CourseController;
import com.studybuddy.course.model.Course;
import com.studybuddy.group.model.StudyGroup;
import com.studybuddy.user.model.User;
import com.studybuddy.user.model.Role;
import com.studybuddy.course.repository.CourseRepository;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for CourseController
 */
@ExtendWith(MockitoExtension.class)
class CourseControllerTest {

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private StudyGroupRepository studyGroupRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private org.springframework.security.core.Authentication authentication;

    @Mock
    private org.springframework.security.core.context.SecurityContext securityContext;

    @InjectMocks
    private CourseController courseController;

    private Course testCourse;

    @BeforeEach
    void setUp() {
        testCourse = new Course();
        testCourse.setId(1L);
        testCourse.setCode("CS101");
        testCourse.setName("Introduction to Computer Science");
        testCourse.setDescription("Basic CS course");
        testCourse.setFaculty("Engineering");
        testCourse.setSemester("Fall 2024");
        testCourse.setIsArchived(false);
    }

    @Test
    void testGetAllCourses_Success() {
        // Arrange
        List<Course> courses = new ArrayList<>(List.of(testCourse));
        when(courseRepository.findByIsArchivedFalse()).thenReturn(courses);
        when(studyGroupRepository.findByCourseIdAndIsActiveTrue(anyLong())).thenReturn(new ArrayList<>());

        // Act
        ResponseEntity<List<Map<String, Object>>> response = courseController.getAllCourses();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        assertEquals("CS101", response.getBody().get(0).get("code"));
        verify(courseRepository, times(1)).findByIsArchivedFalse();
    }

    @Test
    void testGetCourseById_Success() {
        // Arrange
        User testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setRole(Role.ADMIN); // Admin can access all courses
        testUser.setCourses(new java.util.HashSet<>());
        
        when(securityContext.getAuthentication()).thenReturn(authentication);
        org.springframework.security.core.context.SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(java.util.Optional.of(testUser));
        when(courseRepository.findById(1L)).thenReturn(Optional.of(testCourse));
        when(studyGroupRepository.findByCourseIdAndIsActiveTrue(1L)).thenReturn(new ArrayList<>());

        // Act
        ResponseEntity<?> response = courseController.getCourseById(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof Map);
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertEquals("CS101", body.get("code"));
        verify(courseRepository, times(1)).findById(1L);
    }

    @Test
    void testGetCourseById_NotFound() {
        // Arrange
        User testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setRole(Role.ADMIN);
        testUser.setCourses(new java.util.HashSet<>());
        
        when(securityContext.getAuthentication()).thenReturn(authentication);
        org.springframework.security.core.context.SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(java.util.Optional.of(testUser));
        when(courseRepository.findById(1L)).thenReturn(Optional.empty());

        // Act
        ResponseEntity<?> response = courseController.getCourseById(1L);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        verify(courseRepository, times(1)).findById(1L);
    }

    @Test
    void testSearchCourses_Success() {
        // Arrange
        List<Course> courses = new ArrayList<>(List.of(testCourse));
        when(courseRepository.findByNameContainingIgnoreCase("Computer")).thenReturn(courses);
        when(studyGroupRepository.findByCourseIdAndIsActiveTrue(anyLong())).thenReturn(new ArrayList<>());

        // Act
        ResponseEntity<List<Map<String, Object>>> response = courseController.searchCourses("Computer");

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        verify(courseRepository, times(1)).findByNameContainingIgnoreCase("Computer");
    }

    @Test
    void testGetAllCourses_WithGroupCount() {
        // Arrange
        List<Course> courses = new ArrayList<>(List.of(testCourse));
        StudyGroup group = new StudyGroup();
        group.setId(1L);
        group.setName("Test Group");
        
        when(courseRepository.findByIsArchivedFalse()).thenReturn(courses);
        when(studyGroupRepository.findByCourseIdAndIsActiveTrue(1L)).thenReturn(List.of(group));

        // Act
        ResponseEntity<List<Map<String, Object>>> response = courseController.getAllCourses();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        assertEquals(1, response.getBody().get(0).get("groupCount"));
    }
}

