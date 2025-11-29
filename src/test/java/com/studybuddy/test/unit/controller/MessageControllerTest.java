package com.studybuddy.test.unit.controller;

import com.studybuddy.controller.MessageController;
import com.studybuddy.model.FileUpload;
import com.studybuddy.model.Message;
import com.studybuddy.model.StudyGroup;
import com.studybuddy.model.User;
import com.studybuddy.repository.FileUploadRepository;
import com.studybuddy.repository.MessageRepository;
import com.studybuddy.repository.StudyGroupRepository;
import com.studybuddy.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for MessageController
 */
@ExtendWith(MockitoExtension.class)
class MessageControllerTest {

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private StudyGroupRepository groupRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private FileUploadRepository fileUploadRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private MessageController messageController;

    private User testUser;
    private StudyGroup testGroup;
    private Message testMessage;
    private FileUpload testFile;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");

        testGroup = new StudyGroup();
        testGroup.setId(1L);
        testGroup.setName("Test Group");
        testGroup.setMembers(new HashSet<>(List.of(testUser)));

        testMessage = new Message();
        testMessage.setId(1L);
        testMessage.setContent("Test message");
        testMessage.setSender(testUser);
        testMessage.setGroup(testGroup);
        testMessage.setMessageType("text");
        testMessage.setIsPinned(false);

        testFile = new FileUpload();
        testFile.setId(1L);
        testFile.setFilename("test.pdf");
        testFile.setOriginalFilename("test.pdf");
    }

    @Test
    void testGetGroupMessages_Success() {
        // Arrange
        List<Message> messages = new ArrayList<>(List.of(testMessage));
        when(messageRepository.findByGroupIdOrderByCreatedAtAsc(1L)).thenReturn(messages);

        // Act
        ResponseEntity<List<Message>> response = messageController.getGroupMessages(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        verify(messageRepository, times(1)).findByGroupIdOrderByCreatedAtAsc(1L);
    }

    @Test
    void testSendMessage_Success() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        
        Map<String, Object> payload = new HashMap<>();
        payload.put("content", "Hello world");
        payload.put("messageType", "text");

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));
        when(messageRepository.save(any(Message.class))).thenReturn(testMessage);

        // Act
        ResponseEntity<?> response = messageController.sendMessage(1L, payload);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(messageRepository, times(1)).save(any(Message.class));
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/group/1"), any(Message.class));
    }

    @Test
    void testSendMessage_WithFileAttachment() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        
        Map<String, Object> payload = new HashMap<>();
        payload.put("content", "Check this file");
        payload.put("fileId", 1L);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.of(testGroup));
        when(fileUploadRepository.findById(1L)).thenReturn(Optional.of(testFile));
        when(messageRepository.save(any(Message.class))).thenReturn(testMessage);

        // Act
        ResponseEntity<?> response = messageController.sendMessage(1L, payload);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        ArgumentCaptor<Message> messageCaptor = ArgumentCaptor.forClass(Message.class);
        verify(messageRepository).save(messageCaptor.capture());
        Message savedMessage = messageCaptor.getValue();
        assertEquals("file", savedMessage.getMessageType());
        assertNotNull(savedMessage.getAttachedFile());
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/group/1"), any(Message.class));
    }

    @Test
    void testSendMessage_UserNotFound() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        
        Map<String, Object> payload = new HashMap<>();
        payload.put("content", "Hello");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> {
            messageController.sendMessage(1L, payload);
        });
    }

    @Test
    void testSendMessage_GroupNotFound() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        
        Map<String, Object> payload = new HashMap<>();
        payload.put("content", "Hello");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(groupRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> {
            messageController.sendMessage(1L, payload);
        });
    }

    @Test
    void testTogglePin_Success() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(messageRepository.findById(1L)).thenReturn(Optional.of(testMessage));
        testMessage.setIsPinned(false);
        when(messageRepository.save(any(Message.class))).thenReturn(testMessage);

        // Act
        ResponseEntity<?> response = messageController.togglePin(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        ArgumentCaptor<Message> messageCaptor = ArgumentCaptor.forClass(Message.class);
        verify(messageRepository).save(messageCaptor.capture());
        assertTrue(messageCaptor.getValue().getIsPinned());
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/group/1/pin"), any(Message.class));
    }

    @Test
    void testTogglePin_Unpin() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        
        testMessage.setIsPinned(true);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(messageRepository.findById(1L)).thenReturn(Optional.of(testMessage));
        when(messageRepository.save(any(Message.class))).thenReturn(testMessage);

        // Act
        ResponseEntity<?> response = messageController.togglePin(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        ArgumentCaptor<Message> messageCaptor = ArgumentCaptor.forClass(Message.class);
        verify(messageRepository).save(messageCaptor.capture());
        assertFalse(messageCaptor.getValue().getIsPinned());
    }

    @Test
    void testDeleteMessage_Success_AsSender() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("testuser");
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));
        when(messageRepository.findById(1L)).thenReturn(Optional.of(testMessage));
        doNothing().when(messageRepository).delete(testMessage);

        // Act
        ResponseEntity<?> response = messageController.deleteMessage(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(messageRepository, times(1)).delete(testMessage);
        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/group/1/delete"), eq(1L));
    }

    @Test
    void testDeleteMessage_Success_AsAdmin() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        
        User adminUser = new User();
        adminUser.setId(2L);
        adminUser.setUsername("admin");
        adminUser.setRole(com.studybuddy.model.Role.ADMIN);

        when(authentication.getName()).thenReturn("admin");
        when(userRepository.findByUsername("admin")).thenReturn(Optional.of(adminUser));
        when(messageRepository.findById(1L)).thenReturn(Optional.of(testMessage));
        doNothing().when(messageRepository).delete(testMessage);

        // Act
        ResponseEntity<?> response = messageController.deleteMessage(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(messageRepository, times(1)).delete(testMessage);
    }

    @Test
    void testDeleteMessage_Unauthorized() {
        // Arrange
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        
        User otherUser = new User();
        otherUser.setId(2L);
        otherUser.setUsername("otheruser");
        otherUser.setRole(com.studybuddy.model.Role.USER);

        when(authentication.getName()).thenReturn("otheruser");
        when(userRepository.findByUsername("otheruser")).thenReturn(Optional.of(otherUser));
        when(messageRepository.findById(1L)).thenReturn(Optional.of(testMessage));

        // Act
        ResponseEntity<?> response = messageController.deleteMessage(1L);

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(messageRepository, never()).delete(any(Message.class));
    }

    @Test
    void testGetPinnedMessages_Success() {
        // Arrange
        testMessage.setIsPinned(true);
        List<Message> pinnedMessages = new ArrayList<>(List.of(testMessage));
        when(messageRepository.findByGroupIdAndIsPinnedTrue(1L)).thenReturn(pinnedMessages);

        // Act
        ResponseEntity<List<Message>> response = messageController.getPinnedMessages(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().size());
        assertTrue(response.getBody().get(0).getIsPinned());
        verify(messageRepository, times(1)).findByGroupIdAndIsPinnedTrue(1L);
    }
}

