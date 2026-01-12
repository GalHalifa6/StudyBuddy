package com.studybuddy.test.unit.controller;

import com.studybuddy.group.controller.GroupController;
import com.studybuddy.user.model.User;
import com.studybuddy.course.model.Course;
import com.studybuddy.group.model.StudyGroup;
import com.studybuddy.group.model.GroupMemberRequest;
import com.studybuddy.user.repository.UserRepository;
import com.studybuddy.course.repository.CourseRepository;
import com.studybuddy.group.repository.StudyGroupRepository;
import com.studybuddy.group.repository.GroupMemberRequestRepository;
import com.studybuddy.notification.service.NotificationService;
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

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for GroupController
 */
@ExtendWith(MockitoExtension.class)
class GroupControllerTest {

    @Mock
    private StudyGroupRepository groupRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private GroupMemberRequestRepository requestRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private GroupController groupController;

    private User testUser;
    private User creatorUser;
    private Course testCourse;
    private StudyGroup testGroup;

    @BeforeEach
    void setUp() {
        // Setup test user
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setFullName("Test User");
        testUser.setGroups(new HashSet<>());
        testUser.setCourses(new HashSet<>());

        // Setup creator user
        creatorUser = new User();
        creatorUser.setId(2L);
        creatorUser.setUsername("creator");
        creatorUser.setEmail("creator@example.com");
        creatorUser.setFullName("Creator User");
        creatorUser.setGroups(new HashSet<>());

        // Setup test course
        testCourse = new Course();
        testCourse.setId(1L);
        testCourse.setCode("CS101");
        testCourse.setName("Introduction to Computer Science");

        // Setup test group
        testGroup = new StudyGroup();
        testGroup.setId(1L);
        testGroup.setName("Test Group");
        testGroup.setDescription("Test Description");
        testGroup.setTopic("Test Topic");
        testGroup.setMaxSize(10);
        testGroup.setVisibility("open");
        testGroup.setCourse(testCourse);
        testGroup.setCreator(creatorUser);
        testGroup.setIsActive(true);
        testGroup.setMembers(new HashSet<>(List.of(creatorUser)));

        // Setup security context
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
    }

    @Test
    void testCreateGroup_Success() {
        // Arrange
        Map<String, Object> request = new HashMap<>();
        request.put("name", "New Group");
        request.put("description", "New Description");
        request.put("topic", "New Topic");
        request.put("maxSize", 10);
        request.put("visibility", "open");
        
        Map<String, Object> courseMap = new HashMap<>();
        courseMap.put("id", 1L);
        request.put("course", courseMap);

        // Enroll user in course
        testUser.getCourses().add(testCourse);
        
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(courseRepository.findById(1L)).thenReturn(Optional.of(testCourse));
        when(groupRepository.save(any(StudyGroup.class))).thenReturn(testGroup);
        when(groupRepository.findById(anyLong())).thenReturn(Optional.of(testGroup));

        // Act
        ResponseEntity<?> response = groupController.createGroup(request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(groupRepository, times(1)).save(any(StudyGroup.class));
    }

    @Test
    void testCreateGroup_MissingCourse() {
        // Arrange
        Map<String, Object> request = new HashMap<>();
        request.put("name", "New Group");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

        // Act
        ResponseEntity<?> response = groupController.createGroup(request);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(groupRepository, never()).save(any(StudyGroup.class));
    }

    @Test
    void testGetGroupById_Success() {
        // Arrange
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));

        // Act
        ResponseEntity<?> response = groupController.getGroupById(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }

    @Test
    void testGetGroupById_NotFound() {
        // Arrange
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.empty());

        // Act
        ResponseEntity<?> response = groupController.getGroupById(1L);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void testGetGroupById_PrivateGroup_NonMember() {
        // Arrange
        testGroup.setVisibility("private");
        testGroup.setMembers(new HashSet<>(List.of(creatorUser)));

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));

        // Act
        ResponseEntity<?> response = groupController.getGroupById(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody() instanceof Map);
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertTrue((Boolean) body.get("isPrivate"));
    }

    @Test
    void testJoinGroup_OpenGroup_Success() {
        // Arrange
        testGroup.setVisibility("open");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));

        // Act
        ResponseEntity<?> response = groupController.joinGroup(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(userRepository, times(1)).save(testUser);
    }

    @Test
    void testJoinGroup_AlreadyMember() {
        // Arrange
        testGroup.setVisibility("open");
        testGroup.getMembers().add(testUser);
        testUser.getGroups().add(testGroup);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));

        // Act
        ResponseEntity<?> response = groupController.joinGroup(1L);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void testJoinGroup_GroupFull() {
        // Arrange
        testGroup.setVisibility("open");
        testGroup.setMaxSize(1);
        testGroup.setMembers(new HashSet<>(List.of(creatorUser)));

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));

        // Act
        ResponseEntity<?> response = groupController.joinGroup(1L);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody() instanceof Map);
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertTrue(body.get("message").toString().contains("full"));
    }

    @Test
    void testJoinGroup_ApprovalGroup_CreatesRequest() {
        // Arrange
        testGroup.setVisibility("approval");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));
        when(requestRepository.existsPendingRequestForUser(1L, 1L)).thenReturn(false);
        when(requestRepository.save(any(GroupMemberRequest.class))).thenReturn(new GroupMemberRequest());

        // Act
        ResponseEntity<?> response = groupController.joinGroup(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(requestRepository, times(1)).save(any(GroupMemberRequest.class));
        verify(notificationService, times(1)).createActionableNotification(
                any(User.class), anyString(), anyString(), anyString(), anyLong(), anyString(), anyLong());
    }

    @Test
    void testJoinGroup_PrivateGroup_Denied() {
        // Arrange
        testGroup.setVisibility("private");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));

        // Act
        ResponseEntity<?> response = groupController.joinGroup(1L);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody() instanceof Map);
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertTrue(body.get("message").toString().contains("private"));
    }

    @Test
    void testLeaveGroup_Success() {
        // Arrange
        testUser.getGroups().add(testGroup);
        testGroup.getMembers().add(testUser);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));

        // Act
        ResponseEntity<?> response = groupController.leaveGroup(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(userRepository, times(1)).save(testUser);
    }

    @Test
    void testLeaveGroup_CreatorCannotLeave() {
        // Arrange
        when(authentication.getName()).thenReturn("creator");
        when(userRepository.findByUsername("creator")).thenReturn(Optional.of(creatorUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));

        // Act
        ResponseEntity<?> response = groupController.leaveGroup(1L);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody() instanceof Map);
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assertTrue(body.get("message").toString().contains("creator cannot leave"));
    }

    @Test
    void testGetMyGroups_Success() {
        // Arrange
        testUser.getGroups().add(testGroup);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findGroupsByMemberId(1L)).thenReturn(List.of(testGroup));

        // Act
        ResponseEntity<List<Map<String, Object>>> response = groupController.getMyGroups();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
    }
}

