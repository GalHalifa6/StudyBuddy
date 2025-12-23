package com.studybuddy.test.unit.controller;

import com.studybuddy.controller.DirectMessageController;
import com.studybuddy.model.*;
import com.studybuddy.repository.*;
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
 * Unit tests for DirectMessageController
 */
@ExtendWith(MockitoExtension.class)
class DirectMessageControllerTest {

    @Mock
    private ConversationRepository conversationRepository;

    @Mock
    private DirectMessageRepository directMessageRepository;

    @Mock
    private DirectMessageReceiptRepository receiptRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Authentication authentication;

    @Mock
    private SecurityContext securityContext;

    @InjectMocks
    private DirectMessageController directMessageController;

    private User currentUser;
    private User otherUser;
    private Conversation testConversation;
    private DirectMessage testMessage;

    @BeforeEach
    void setUp() {
        // Setup current user
        currentUser = new User();
        currentUser.setId(1L);
        currentUser.setUsername("user1");
        currentUser.setEmail("user1@example.com");
        currentUser.setFullName("User One");

        // Setup other user
        otherUser = new User();
        otherUser.setId(2L);
        otherUser.setUsername("user2");
        otherUser.setEmail("user2@example.com");
        otherUser.setFullName("User Two");

        // Setup test conversation
        testConversation = new Conversation();
        testConversation.setId(1L);
        testConversation.setUserA(currentUser);
        testConversation.setUserB(otherUser);
        testConversation.setType(Conversation.ConversationType.DIRECT);

        // Setup test message
        testMessage = new DirectMessage();
        testMessage.setId(1L);
        testMessage.setConversation(testConversation);
        testMessage.setSender(currentUser);
        testMessage.setContent("Test message");
        testMessage.setMessageType("text");
        testMessage.setCreatedAt(LocalDateTime.now());

        // Setup security context
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getName()).thenReturn("user1");
    }

    @Test
    void testCreateOrGetConversation_NewConversation() {
        // Arrange
        when(userRepository.findByUsername("user1")).thenReturn(Optional.of(currentUser));
        when(userRepository.findById(2L)).thenReturn(Optional.of(otherUser));
        when(conversationRepository.findConversationBetweenUsers(1L, 2L))
            .thenReturn(Optional.empty());
        when(conversationRepository.save(any(Conversation.class))).thenReturn(testConversation);

        Map<String, Long> requestBody = new HashMap<>();
        requestBody.put("participantId", 2L);

        // Act
        ResponseEntity<?> response = directMessageController.createOrGetConversation(requestBody);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(conversationRepository, times(1)).save(any(Conversation.class));
    }

    @Test
    void testCreateOrGetConversation_ExistingConversation() {
        // Arrange
        when(userRepository.findByUsername("user1")).thenReturn(Optional.of(currentUser));
        when(userRepository.findById(2L)).thenReturn(Optional.of(otherUser));
        when(conversationRepository.findConversationBetweenUsers(1L, 2L))
            .thenReturn(Optional.of(testConversation));

        Map<String, Long> requestBody = new HashMap<>();
        requestBody.put("participantId", 2L);

        // Act
        ResponseEntity<?> response = directMessageController.createOrGetConversation(requestBody);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(conversationRepository, never()).save(any(Conversation.class));
    }

    @Test
    void testGetConversations_Success() {
        // Arrange
        when(userRepository.findByUsername("user1")).thenReturn(Optional.of(currentUser));
        when(conversationRepository.findByUserIdOrderByLastMessageAtDesc(1L)).thenReturn(Arrays.asList(testConversation));
        when(receiptRepository.countUnreadReceipts(1L, 1L)).thenReturn(0L);

        // Act
        ResponseEntity<?> response = directMessageController.getConversations();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(conversationRepository, times(1)).findByUserIdOrderByLastMessageAtDesc(1L);
    }

    @Test
    void testGetMessages_Success() {
        // Arrange
        when(userRepository.findByUsername("user1")).thenReturn(Optional.of(currentUser));
        when(conversationRepository.findById(1L)).thenReturn(Optional.of(testConversation));
        when(directMessageRepository.findByConversationIdOrderByCreatedAtAsc(1L))
            .thenReturn(Arrays.asList(testMessage));
        when(receiptRepository.findByMessageIdAndUserId(anyLong(), eq(1L)))
            .thenReturn(Optional.empty());

        // Act
        ResponseEntity<?> response = directMessageController.getMessages(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(directMessageRepository, times(1)).findByConversationIdOrderByCreatedAtAsc(1L);
    }

    @Test
    void testSendMessage_Success() {
        // Arrange
        when(userRepository.findByUsername("user1")).thenReturn(Optional.of(currentUser));
        when(conversationRepository.findById(1L)).thenReturn(Optional.of(testConversation));
        when(directMessageRepository.save(any(DirectMessage.class))).thenAnswer(invocation -> {
            DirectMessage msg = invocation.getArgument(0);
            msg.setId(2L);
            return msg;
        });
        when(userRepository.findById(2L)).thenReturn(Optional.of(otherUser));
        when(receiptRepository.save(any(DirectMessageReceipt.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("content", "Hello!");
        requestBody.put("messageType", "text");

        // Act
        ResponseEntity<?> response = directMessageController.sendMessage(1L, requestBody);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode()); // Controller returns ok() not CREATED
        verify(directMessageRepository, times(1)).save(any(DirectMessage.class));
        verify(receiptRepository, times(1)).save(any(DirectMessageReceipt.class));
    }

    @Test
    void testMarkConversationAsRead_Success() {
        // Arrange
        when(userRepository.findByUsername("user1")).thenReturn(Optional.of(currentUser));
        when(conversationRepository.findById(1L)).thenReturn(Optional.of(testConversation));
        when(receiptRepository.markConversationAsRead(anyLong(), anyLong(), any(LocalDateTime.class)))
            .thenReturn(5);

        // Act
        ResponseEntity<?> response = directMessageController.markAsRead(1L);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(receiptRepository, times(1))
            .markConversationAsRead(eq(1L), eq(1L), any(LocalDateTime.class));
    }

    @Test
    void testCreateOrGetConversation_WithSelf() {
        // Arrange
        when(userRepository.findByUsername("user1")).thenReturn(Optional.of(currentUser));

        Map<String, Long> requestBody = new HashMap<>();
        requestBody.put("participantId", 1L); // Same as current user

        // Act
        ResponseEntity<?> response = directMessageController.createOrGetConversation(requestBody);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        verify(conversationRepository, never()).save(any(Conversation.class));
    }
}

