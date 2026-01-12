package com.studybuddy.messaging.controller;

import com.studybuddy.messaging.model.*;
import com.studybuddy.messaging.repository.*;
import com.studybuddy.user.model.User;
import com.studybuddy.user.repository.UserRepository;
import com.studybuddy.file.model.FileUpload;
import com.studybuddy.file.repository.FileUploadRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Direct Message Controller - Handles direct messaging between users (Student ↔ Expert)
 */
@RestController
@RequestMapping("/api/dm")
public class DirectMessageController {

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private DirectMessageRepository messageRepository;

    @Autowired
    private DirectMessageReceiptRepository receiptRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FileUploadRepository fileUploadRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private com.studybuddy.notification.service.NotificationService notificationService;

    /**
     * Create or get existing conversation between current user and another user
     */
    @PostMapping("/conversations")
    public ResponseEntity<?> createOrGetConversation(@RequestBody Map<String, Long> body) {
        try {
            User currentUser = getCurrentUser();
            Long otherUserId = body.get("participantId");
            if (otherUserId == null) {
                // Fallback for backward compatibility
                otherUserId = body.get("userId");
            }

            if (otherUserId == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "participantId is required"));
            }

            if (currentUser.getId().equals(otherUserId)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Cannot create conversation with yourself"));
            }

            User otherUser = userRepository.findById(otherUserId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Check if conversation already exists
            Optional<Conversation> existing = conversationRepository.findConversationBetweenUsers(
                    currentUser.getId(), otherUserId);

            Conversation conversation;
            if (existing.isPresent()) {
                conversation = existing.get();
            } else {
                // Create new conversation (ensure consistent ordering: userA < userB for uniqueness)
                Long userAId = Math.min(currentUser.getId(), otherUserId);
                Long userBId = Math.max(currentUser.getId(), otherUserId);
                User userA = userAId.equals(currentUser.getId()) ? currentUser : otherUser;
                User userB = userBId.equals(otherUser.getId()) ? otherUser : currentUser;

                conversation = Conversation.builder()
                        .type(Conversation.ConversationType.DIRECT)
                        .userA(userA)
                        .userB(userB)
                        .build();
                conversation = conversationRepository.save(conversation);
            }

            return ResponseEntity.ok(toConversationResponse(conversation, currentUser));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get all conversations for current user
     */
    @GetMapping("/conversations")
    public ResponseEntity<List<Map<String, Object>>> getConversations() {
        try {
            User currentUser = getCurrentUser();
            List<Conversation> conversations = conversationRepository.findByUserIdOrderByLastMessageAtDesc(currentUser.getId());

            List<Map<String, Object>> result = conversations.stream()
                    .map(conv -> toConversationResponse(conv, currentUser))
                    .collect(Collectors.toList());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonList(Map.of("error", e.getMessage())));
        }
    }

    /**
     * Get messages in a conversation
     */
    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<List<Map<String, Object>>> getMessages(@PathVariable Long conversationId) {
        try {
            User currentUser = getCurrentUser();
            Conversation conversation = conversationRepository.findById(conversationId)
                    .orElseThrow(() -> new RuntimeException("Conversation not found"));

            // Check permissions
            if (!conversation.hasParticipant(currentUser)) {
                return ResponseEntity.status(403).build();
            }

            List<DirectMessage> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);

            List<Map<String, Object>> result = messages.stream()
                    .map(msg -> toMessageMap(msg, currentUser))
                    .collect(Collectors.toList());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonList(Map.of("error", e.getMessage())));
        }
    }

    /**
     * Send a message in a conversation
     */
    @PostMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<?> sendMessage(@PathVariable Long conversationId, @RequestBody Map<String, Object> payload) {
        try {
            User sender = getCurrentUser();
            Conversation conversation = conversationRepository.findById(conversationId)
                    .orElseThrow(() -> new RuntimeException("Conversation not found"));

            // Check permissions
            if (!conversation.hasParticipant(sender)) {
                return ResponseEntity.status(403).body(Map.of("message", "Not authorized"));
            }

            DirectMessage message = DirectMessage.builder()
                    .conversation(conversation)
                    .sender(sender)
                    .content((String) payload.get("content"))
                    .messageType((String) payload.getOrDefault("messageType", "text"))
                    .build();

            // Handle file attachment
            if (payload.containsKey("fileId") && payload.get("fileId") != null) {
                Long fileId = Long.valueOf(payload.get("fileId").toString());
                FileUpload file = fileUploadRepository.findById(fileId)
                        .orElseThrow(() -> new RuntimeException("File not found"));
                message.setAttachedFile(file);
                message.setMessageType("file");
            }

            DirectMessage savedMessage = messageRepository.save(message);

            // Create receipts for both participants
            User recipient = conversation.getOtherParticipant(sender);
            createReceiptsForMessage(savedMessage, sender, recipient);

            // Update conversation's last message time
            conversation.setLastMessageAt(LocalDateTime.now());
            conversationRepository.save(conversation);

            // Broadcast via WebSocket
            Map<String, Object> messageMap = toMessageMap(savedMessage, sender);
            messagingTemplate.convertAndSend("/topic/dm/" + conversationId, messageMap);

            // Notify recipient if not sender
            if (recipient != null && !recipient.getId().equals(sender.getId())) {
                notificationService.createNotification(
                        recipient,
                        "DIRECT_MESSAGE",
                        "New Message from " + (sender.getFullName() != null ? sender.getFullName() : sender.getUsername()),
                        savedMessage.getContent().length() > 100 
                            ? savedMessage.getContent().substring(0, 100) + "..." 
                            : savedMessage.getContent(),
                        "/dm/" + conversationId
                );
            }

            return ResponseEntity.ok(messageMap);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Mark conversation as read
     */
    @PostMapping("/conversations/{conversationId}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long conversationId) {
        try {
            User currentUser = getCurrentUser();
            Conversation conversation = conversationRepository.findById(conversationId)
                    .orElseThrow(() -> new RuntimeException("Conversation not found"));

            // Check permissions
            if (!conversation.hasParticipant(currentUser)) {
                return ResponseEntity.status(403).body(Map.of("message", "Not authorized"));
            }

            int updated = receiptRepository.markConversationAsRead(conversationId, currentUser.getId(), LocalDateTime.now());

            return ResponseEntity.ok(Map.of("updated", updated));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ==================== Helper Methods ====================

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Map<String, Object> toConversationResponse(Conversation conversation, User currentUser) {
        User otherUser = conversation.getOtherParticipant(currentUser);
        
        // Get unread count
        long unreadCount = receiptRepository.countUnreadReceipts(conversation.getId(), currentUser.getId());
        
        // Get last message preview
        List<DirectMessage> recentMessages = messageRepository.findRecentMessagesByConversationId(conversation.getId());
        String lastMessagePreview = recentMessages.isEmpty() ? null : 
            (recentMessages.get(0).getContent().length() > 100 
                ? recentMessages.get(0).getContent().substring(0, 100) + "..." 
                : recentMessages.get(0).getContent());

        Map<String, Object> response = new HashMap<>();
        response.put("id", conversation.getId());
        response.put("type", conversation.getType().name());
        response.put("otherUser", Map.of(
                "id", otherUser != null ? otherUser.getId() : null,
                "username", otherUser != null ? otherUser.getUsername() : null,
                "fullName", otherUser != null ? otherUser.getFullName() : null
        ));
        response.put("unreadCount", unreadCount);
        response.put("lastMessageAt", conversation.getLastMessageAt());
        response.put("lastMessagePreview", lastMessagePreview);
        response.put("createdAt", conversation.getCreatedAt());
        return response;
    }

    private Map<String, Object> toMessageMap(DirectMessage message, User currentUser) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", message.getId());
        map.put("conversationId", message.getConversation().getId());
        map.put("sender", Map.of(
                "id", message.getSender().getId(),
                "username", message.getSender().getUsername(),
                "fullName", message.getSender().getFullName()
        ));
        map.put("content", message.getContent());
        map.put("messageType", message.getMessageType());
        map.put("createdAt", message.getCreatedAt());
        
        if (message.getAttachedFile() != null) {
            map.put("attachedFile", Map.of(
                    "id", message.getAttachedFile().getId(),
                    "filename", message.getAttachedFile().getFilename(),
                    "originalFilename", message.getAttachedFile().getOriginalFilename(),
                    "fileType", message.getAttachedFile().getFileType(),
                    "fileSize", message.getAttachedFile().getFileSize()
            ));
        }

        // Check if current user has read this message
        Optional<DirectMessageReceipt> receipt = receiptRepository.findByMessageIdAndUserId(
                message.getId(), currentUser.getId());
        map.put("isRead", receipt.map(DirectMessageReceipt::getIsRead).orElse(false));
        map.put("readAt", receipt.map(DirectMessageReceipt::getReadAt).orElse(null));

        return map;
    }

    private void createReceiptsForMessage(DirectMessage message, User sender, User recipient) {
        // Create receipt for recipient (sender already knows they sent it)
        if (recipient != null && !recipient.getId().equals(sender.getId())) {
            DirectMessageReceipt recipientReceipt = DirectMessageReceipt.builder()
                    .message(message)
                    .user(recipient)
                    .isRead(false)
                    .build();
            receiptRepository.save(recipientReceipt);
        }
    }
}

