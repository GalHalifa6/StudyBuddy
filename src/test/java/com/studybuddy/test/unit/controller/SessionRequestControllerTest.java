package com.studybuddy.test.unit.controller;

import com.studybuddy.controller.ExpertController;
import com.studybuddy.controller.StudentExpertController;
import com.studybuddy.dto.ExpertDto;
import com.studybuddy.model.*;
import com.studybuddy.repository.*;
import com.studybuddy.service.MeetingService;
import com.studybuddy.service.NotificationService;
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

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for SessionRequest endpoints (StudentExpertController and ExpertController)
 */
@ExtendWith(MockitoExtension.class)
class SessionRequestControllerTest {

    @Mock
    private SessionRequestRepository sessionRequestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private CourseRepository courseRepository;

    @Mock
    private ExpertSessionRepository sessionRepository;

    @Mock
    private MeetingService meetingService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private ExpertProfileRepository expertProfileRepository;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private StudentExpertController studentExpertController;

    @InjectMocks
    private ExpertController expertController;

    private User studentUser;
    private User expertUser;
    private Course testCourse;
    private SessionRequest testRequest;

    @BeforeEach
    void setUp() {
        // Setup student user
        studentUser = new User();
        studentUser.setId(1L);
        studentUser.setUsername("student");
        studentUser.setEmail("student@example.com");
        studentUser.setFullName("Student User");
        studentUser.setRole(com.studybuddy.model.Role.USER);

        // Setup expert user
        expertUser = new User();
        expertUser.setId(2L);
        expertUser.setUsername("expert");
        expertUser.setEmail("expert@example.com");
        expertUser.setFullName("Expert User");
        expertUser.setRole(com.studybuddy.model.Role.EXPERT);

        // Setup test course
        testCourse = new Course();
        testCourse.setId(1L);
        testCourse.setCode("CS101");
        testCourse.setName("Introduction to Computer Science");

        // Setup test session request
        testRequest = new SessionRequest();
        testRequest.setId(1L);
        testRequest.setStudent(studentUser);
        testRequest.setExpert(expertUser);
        testRequest.setCourse(testCourse);
        testRequest.setTitle("Test Session");
        testRequest.setDescription("Test Description");
        testRequest.setStatus(SessionRequest.RequestStatus.PENDING);
        // preferredTimeSlots is a JSON string in the model, so set as needed for controller logic
        testRequest.setPreferredTimeSlots("[]");

        // Setup security context
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("student");
    }

    @Test
    void testCreateSessionRequest_Success() {
        // Arrange
        ExpertProfile expertProfile = new ExpertProfile();
        expertProfile.setUser(expertUser);
        expertProfile.setAcceptingNewStudents(true);
        expertProfile.setIsVerified(true);
        
        when(userRepository.findByUsername("student")).thenReturn(Optional.of(studentUser));
        when(userRepository.findById(2L)).thenReturn(Optional.of(expertUser));
        when(expertProfileRepository.findByUser(expertUser)).thenReturn(Optional.of(expertProfile));
        when(courseRepository.findById(1L)).thenReturn(Optional.of(testCourse));
        when(sessionRepository.hasSchedulingConflict(anyLong(), any(), any())).thenReturn(false);
        when(sessionRequestRepository.save(any(SessionRequest.class))).thenReturn(testRequest);
        when(meetingService.generateJitsiMeetingLink(anyLong())).thenReturn("https://meet.jit.si/test-room");
        when(sessionRepository.save(any(com.studybuddy.model.ExpertSession.class))).thenAnswer(invocation -> {
            com.studybuddy.model.ExpertSession session = invocation.getArgument(0);
            session.setId(100L);
            return session;
        });

        // Act
        com.studybuddy.dto.ExpertDto.SessionRequestCreate requestBody = com.studybuddy.dto.ExpertDto.SessionRequestCreate.builder()
            .expertId(2L)
            .courseId(1L)
            .title("Test Session")
            .description("Test Description")
            .scheduledStartTime(java.time.LocalDateTime.now().plusDays(1))
            .scheduledEndTime(java.time.LocalDateTime.now().plusDays(1).plusHours(1))
            .preferredTimeSlots(new ArrayList<>())
            .build();

        ResponseEntity<?> response = studentExpertController.createSessionRequest(requestBody);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode()); // This creates a session directly, returns OK not CREATED
        verify(sessionRepository, times(1)).save(any(com.studybuddy.model.ExpertSession.class));
        verify(notificationService, times(1)).createNotification(any(), any(), any(), any());
    }

    @Test
    void testGetMySessionRequests_Success() {
        // Arrange
        when(userRepository.findByUsername("student")).thenReturn(Optional.of(studentUser));
        when(sessionRequestRepository.findByStudentIdOrderByCreatedAtDesc(1L))
            .thenReturn(Arrays.asList(testRequest));

        // Act
        ResponseEntity<?> response = studentExpertController.getMySessionRequests();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(sessionRequestRepository, times(1)).findByStudentIdOrderByCreatedAtDesc(1L);
    }

    @Test
    void testCancelSessionRequest_Success() {
        // Arrange
        when(userRepository.findByUsername("student")).thenReturn(Optional.of(studentUser));
        when(sessionRequestRepository.findById(1L)).thenReturn(Optional.of(testRequest));
        when(sessionRequestRepository.save(any(SessionRequest.class))).thenReturn(testRequest);

        // Act
        ResponseEntity<?> response = studentExpertController.cancelSessionRequest(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(sessionRequestRepository, times(1)).save(any(SessionRequest.class));
        assertEquals(SessionRequest.RequestStatus.CANCELLED, testRequest.getStatus());
    }

    @Test
    void testGetExpertSessionRequests_Success() {
        // Arrange
        ExpertProfile expertProfile = new ExpertProfile();
        expertProfile.setUser(expertUser);
        expertProfile.setIsVerified(true);
        expertProfile.setIsActive(true);
        
        when(userRepository.findByUsername("expert")).thenReturn(Optional.of(expertUser));
        when(expertProfileRepository.findByUser(expertUser)).thenReturn(Optional.of(expertProfile));
        when(sessionRequestRepository.findByExpertIdAndStatusOrderByCreatedAtDesc(
            2L, SessionRequest.RequestStatus.PENDING))
            .thenReturn(Arrays.asList(testRequest));

        // Act
        ResponseEntity<?> response = expertController.getSessionRequests("PENDING");

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(sessionRequestRepository, times(1))
            .findByExpertIdAndStatusOrderByCreatedAtDesc(2L, SessionRequest.RequestStatus.PENDING);
    }

    @Test
    void testApproveSessionRequest_Success() {
        // Arrange
        ExpertProfile expertProfile = new ExpertProfile();
        expertProfile.setUser(expertUser);
        expertProfile.setIsVerified(true);
        expertProfile.setIsActive(true);
        
        when(userRepository.findByUsername("expert")).thenReturn(Optional.of(expertUser));
        when(expertProfileRepository.findByUser(expertUser)).thenReturn(Optional.of(expertProfile));
        when(sessionRequestRepository.findById(1L)).thenReturn(Optional.of(testRequest));
        when(meetingService.generateJitsiMeetingLink(anyLong())).thenReturn("https://meet.jit.si/test-room");
        when(sessionRepository.save(any(ExpertSession.class))).thenAnswer(invocation -> {
            ExpertSession session = invocation.getArgument(0);
            session.setId(100L);
            return session;
        });
        when(sessionRequestRepository.save(any(SessionRequest.class))).thenReturn(testRequest);

        LocalDateTime chosenStart = LocalDateTime.now().plusDays(2);
        LocalDateTime chosenEnd = chosenStart.plusHours(1);

        ExpertDto.SessionRequestApprove requestBody = ExpertDto.SessionRequestApprove.builder()
            .chosenStart(chosenStart)
            .chosenEnd(chosenEnd)
            .message("Approved!")
            .build();

        // Act
        ResponseEntity<?> response = expertController.approveSessionRequest(1L, requestBody);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(sessionRepository, times(1)).save(any(ExpertSession.class));
        verify(sessionRequestRepository, times(1)).save(any(SessionRequest.class));
        assertEquals(SessionRequest.RequestStatus.APPROVED, testRequest.getStatus());
        verify(notificationService, times(1)).createNotification(any(), any(), any(), any());
    }

    @Test
    void testRejectSessionRequest_Success() {
        // Arrange
        ExpertProfile expertProfile = new ExpertProfile();
        expertProfile.setUser(expertUser);
        expertProfile.setIsVerified(true);
        expertProfile.setIsActive(true);
        
        when(userRepository.findByUsername("expert")).thenReturn(Optional.of(expertUser));
        when(expertProfileRepository.findByUser(expertUser)).thenReturn(Optional.of(expertProfile));
        when(sessionRequestRepository.findById(1L)).thenReturn(Optional.of(testRequest));
        when(sessionRequestRepository.save(any(SessionRequest.class))).thenReturn(testRequest);

        ExpertDto.SessionRequestReject requestBody = ExpertDto.SessionRequestReject.builder()
            .reason("Not available at requested times")
            .build();

        // Act
        ResponseEntity<?> response = expertController.rejectSessionRequest(1L, requestBody);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(sessionRequestRepository, times(1)).save(any(SessionRequest.class));
        assertEquals(SessionRequest.RequestStatus.REJECTED, testRequest.getStatus());
        assertEquals("Not available at requested times", testRequest.getRejectionReason());
        verify(notificationService, times(1)).createNotification(any(), any(), any(), any());
    }
}

