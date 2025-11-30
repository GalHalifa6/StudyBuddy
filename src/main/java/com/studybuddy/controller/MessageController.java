package com.studybuddy.controller;

import com.studybuddy.model.FileUpload;
import com.studybuddy.model.Message;
import com.studybuddy.model.StudyGroup;
import com.studybuddy.model.User;
import com.studybuddy.repository.FileUploadRepository;
import com.studybuddy.repository.MessageRepository;
import com.studybuddy.repository.StudyGroupRepository;
import com.studybuddy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

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
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<Map<String, Object>>> getGroupMessages(@PathVariable Long groupId) {
        List<Message> messages = messageRepository.findByGroupIdOrderByCreatedAtAsc(groupId);
        List<Map<String, Object>> result = messages.stream()
            .map(this::toMessageMap)
            .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/group/{groupId}")
    public ResponseEntity<?> sendMessage(@PathVariable Long groupId, @RequestBody Map<String, Object> payload) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User sender = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

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

        Message savedMessage = messageRepository.save(message);
        
        // Broadcast the message to all subscribers of this group (use safe map)
        messagingTemplate.convertAndSend("/topic/group/" + groupId, toMessageMap(savedMessage));
        
        return ResponseEntity.ok(toMessageMap(savedMessage));
    }

    @PostMapping("/{id}/pin")
    public ResponseEntity<?> togglePin(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

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
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

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
        
        return map;
    }
}
