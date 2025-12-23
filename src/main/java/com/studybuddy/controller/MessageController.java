package com.studybuddy.controller;

import com.studybuddy.model.Event;
import com.studybuddy.model.FileUpload;
import com.studybuddy.model.Message;
import com.studybuddy.model.MessageReceipt;
import com.studybuddy.model.StudyGroup;
import com.studybuddy.model.User;
import com.studybuddy.repository.EventRepository;
import com.studybuddy.repository.FileUploadRepository;
import com.studybuddy.repository.MessageReceiptRepository;
import com.studybuddy.repository.MessageRepository;
import com.studybuddy.repository.StudyGroupRepository;
import com.studybuddy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private StudyGroupRepository groupRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FileUploadRepository fileUploadRepository;

    @Autowired
    private EventRepository eventRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private MessageReceiptRepository messageReceiptRepository;

    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<Map<String, Object>>> getGroupMessages(@PathVariable Long groupId) {
        List<Message> messages = messageRepository.findByGroupIdOrderByCreatedAtAsc(groupId);
        List<Map<String, Object>> result = messages.stream()
            .map(this::toMessageMap)
            .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/group/{groupId}")
    @Transactional
    public ResponseEntity<?> sendMessage(@PathVariable Long groupId, @RequestBody Map<String, Object> payload) {
        User sender = getCurrentUser();
        StudyGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        Message message = new Message();
        message.setContent((String) payload.get("content"));
        message.setSender(sender);
        message.setGroup(group);
        message.setMessageType((String) payload.getOrDefault("messageType", "text"));
        message.setIsPinned(false);

        // Handle file attachment
        if (payload.containsKey("fileId") && payload.get("fileId") != null) {
            Long fileId = Long.valueOf(payload.get("fileId").toString());
            FileUpload file = fileUploadRepository.findById(fileId)
                    .orElseThrow(() -> new RuntimeException("File not found"));
            message.setAttachedFile(file);
            message.setMessageType("file");
        }

        // Handle event reference
        if (payload.containsKey("eventId") && payload.get("eventId") != null) {
            Long eventId = Long.valueOf(payload.get("eventId").toString());
            Event event = eventRepository.findById(eventId)
                    .orElseThrow(() -> new RuntimeException("Event not found"));
            message.setEvent(event);
            message.setMessageType("event");
        }

        Message savedMessage = messageRepository.save(message);

        // Create receipts for group members
        createReceiptsForMessage(savedMessage, sender, group);
        
        // Broadcast the message to all subscribers of this group (use safe map)
        messagingTemplate.convertAndSend("/topic/group/" + groupId, toMessageMap(savedMessage));
        
        return ResponseEntity.ok(toMessageMap(savedMessage));
    }

    @PostMapping("/{id}/pin")
    public ResponseEntity<?> togglePin(@PathVariable Long id) {
        User user = getCurrentUser();

        Message message = messageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        message.setIsPinned(!message.getIsPinned());
        Message savedMessage = messageRepository.save(message);

        // Broadcast pin update to all subscribers (use safe map)
        messagingTemplate.convertAndSend("/topic/group/" + message.getGroup().getId() + "/pin", toMessageMap(savedMessage));

        return ResponseEntity.ok(toMessageMap(savedMessage));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMessage(@PathVariable Long id) {
        User user = getCurrentUser();

        Message message = messageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        if (!message.getSender().getId().equals(user.getId()) && 
            !user.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(403).body("Cannot delete other user's messages");
        }

        Long groupId = message.getGroup().getId();
        messageRepository.delete(message);
        
        // Broadcast delete event
        messagingTemplate.convertAndSend("/topic/group/" + groupId + "/delete", id);
        
        return ResponseEntity.ok("Message deleted");
    }

    @GetMapping("/group/{groupId}/pinned")
    public ResponseEntity<List<Map<String, Object>>> getPinnedMessages(@PathVariable Long groupId) {
        List<Message> messages = messageRepository.findByGroupIdAndIsPinnedTrue(groupId);
        List<Map<String, Object>> result = messages.stream()
            .map(this::toMessageMap)
            .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/unread/summary")
    public ResponseEntity<?> getUnreadSummary() {
        User user = getCurrentUser();
        long totalUnread = messageReceiptRepository.countUnreadForUser(user.getId());

        List<Object[]> grouped = messageReceiptRepository.countUnreadByUserGrouped(user.getId());
        List<Map<String, Object>> groups = new ArrayList<>();

        for (Object[] row : grouped) {
            Long groupId = (Long) row[0];
            Long count = (Long) row[1];

            groupRepository.findById(groupId).ifPresent(group -> {
                Map<String, Object> groupMap = new LinkedHashMap<>();
                groupMap.put("groupId", group.getId());
                groupMap.put("groupName", group.getName());
                groupMap.put("unreadCount", count.intValue());

                if (group.getCourse() != null) {
                    Map<String, Object> courseInfo = new LinkedHashMap<>();
                    courseInfo.put("id", group.getCourse().getId());
                    courseInfo.put("code", group.getCourse().getCode());
                    courseInfo.put("name", group.getCourse().getName());
                    groupMap.put("course", courseInfo);
                }

                Message lastMessage = messageRepository.findRecentMessagesByGroup(groupId)
                        .stream()
                        .findFirst()
                        .orElse(null);

                if (lastMessage != null) {
                    groupMap.put("lastMessageAt", lastMessage.getCreatedAt());
                    groupMap.put("lastMessagePreview", truncate(lastMessage.getContent(), 140));
                }

                groups.add(groupMap);
            });
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("total", (int) totalUnread);
        response.put("groups", groups);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/group/{groupId}/read")
    @Transactional
    public ResponseEntity<?> markGroupAsRead(@PathVariable Long groupId) {
        User user = getCurrentUser();
        if (!groupRepository.isUserMemberOfGroup(groupId, user.getId())) {
            return ResponseEntity.status(403).body("Not a member of this group");
        }

        int updated = messageReceiptRepository.markGroupAsRead(user.getId(), groupId, LocalDateTime.now());
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("updated", updated);
        response.put("total", (int) messageReceiptRepository.countUnreadForUser(user.getId()));
        return ResponseEntity.ok(response);
    }
    
    /**
     * Convert Message entity to a safe Map without circular references
     */
    private Map<String, Object> toMessageMap(Message message) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", message.getId());
        map.put("content", message.getContent());
        map.put("messageType", message.getMessageType());
        map.put("isPinned", message.getIsPinned());
        map.put("createdAt", message.getCreatedAt());
        
        // Safe sender info
        if (message.getSender() != null) {
            Map<String, Object> sender = new HashMap<>();
            sender.put("id", message.getSender().getId());
            sender.put("username", message.getSender().getUsername());
            sender.put("fullName", message.getSender().getFullName());
            map.put("sender", sender);
        }
        
        // Safe group info (minimal)
        if (message.getGroup() != null) {
            Map<String, Object> group = new HashMap<>();
            group.put("id", message.getGroup().getId());
            group.put("name", message.getGroup().getName());
            map.put("group", group);
        }
        
        // Safe file info
        if (message.getAttachedFile() != null) {
            Map<String, Object> file = new HashMap<>();
            file.put("id", message.getAttachedFile().getId());
            file.put("fileName", message.getAttachedFile().getOriginalFilename());
            file.put("fileType", message.getAttachedFile().getFileType());
            file.put("fileSize", message.getAttachedFile().getFileSize());
            map.put("attachedFile", file);
        }

        // Safe event info
        if (message.getEvent() != null) {
            Map<String, Object> event = new HashMap<>();
            event.put("id", message.getEvent().getId());
            event.put("title", message.getEvent().getTitle());
            event.put("eventType", message.getEvent().getEventType());
            event.put("startDateTime", message.getEvent().getStartDateTime());
            event.put("endDateTime", message.getEvent().getEndDateTime());
            event.put("location", message.getEvent().getLocation());
            event.put("meetingLink", message.getEvent().getMeetingLink());
            map.put("event", event);
            map.put("eventId", message.getEvent().getId());
        }
        
        return map;
    }

            private void createReceiptsForMessage(Message message, User sender, StudyGroup group) {
                Set<User> recipients = new HashSet<>(group.getMembers());
                recipients.add(group.getCreator());

                LocalDateTime now = LocalDateTime.now();
                List<MessageReceipt> receipts = recipients.stream()
                        .filter(Objects::nonNull)
                        .map(user -> {
                            MessageReceipt receipt = new MessageReceipt();
                            receipt.setMessage(message);
                            receipt.setUser(user);
                            if (user.getId().equals(sender.getId())) {
                                receipt.setIsRead(true);
                                receipt.setReadAt(now);
                            } else {
                                receipt.setIsRead(false);
                            }
                            return receipt;
                        })
                        .collect(Collectors.toList());

                messageReceiptRepository.saveAll(receipts);
            }

            private User getCurrentUser() {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                return userRepository.findByUsername(auth.getName())
                        .orElseThrow(() -> new RuntimeException("User not found"));
            }

            private String truncate(String content, int limit) {
                if (content == null || content.length() <= limit) {
                    return content;
                }
                return content.substring(0, Math.max(0, limit - 3)) + "...";
            }
}
