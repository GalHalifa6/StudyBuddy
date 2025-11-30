package com.studybuddy.controller;

import com.studybuddy.model.*;
import com.studybuddy.repository.*;
import com.studybuddy.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    @Autowired
    private StudyGroupRepository groupRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private GroupMemberRequestRepository requestRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private NotificationService notificationService;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @PostMapping
    public ResponseEntity<?> createGroup(@RequestBody Map<String, Object> request) {
        try {
            User creator = getCurrentUser();

            // Extract course ID from the request
            Map<String, Object> courseMap = (Map<String, Object>) request.get("course");
            if (courseMap == null || courseMap.get("id") == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Course is required"));
            }
            
            Long courseId = Long.valueOf(courseMap.get("id").toString());
            Course course = courseRepository.findById(courseId)
                    .orElseThrow(() -> new RuntimeException("Course not found"));

            // Create the study group
            StudyGroup group = new StudyGroup();
            group.setName((String) request.get("name"));
            group.setDescription((String) request.get("description"));
            group.setTopic((String) request.get("topic"));
            group.setMaxSize(request.get("maxSize") != null ? Integer.valueOf(request.get("maxSize").toString()) : 10);
            group.setVisibility(request.get("visibility") != null ? (String) request.get("visibility") : "open");
            group.setCourse(course);
            group.setCreator(creator);
            group.setIsActive(true);

            // Save the group first
            StudyGroup savedGroup = groupRepository.save(group);

            // Add creator to the group's members via the User entity (owning side)
            creator.getGroups().add(savedGroup);
            userRepository.save(creator);

            // Refetch the group to include the updated members
            savedGroup = groupRepository.findById(savedGroup.getId()).orElse(savedGroup);

            return ResponseEntity.ok(savedGroup);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Error creating group: " + e.getMessage()));
        }
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<Map<String, Object>>> getGroupsByCourse(@PathVariable Long courseId) {
        List<StudyGroup> groups = groupRepository.findByCourseIdAndIsActiveTrue(courseId);
        
        // Convert to safe response to avoid circular references
        List<Map<String, Object>> result = groups.stream().map(group -> {
            Map<String, Object> groupMap = new java.util.HashMap<>();
            groupMap.put("id", group.getId());
            groupMap.put("name", group.getName());
            groupMap.put("description", group.getDescription());
            groupMap.put("topic", group.getTopic());
            groupMap.put("maxSize", group.getMaxSize());
            groupMap.put("visibility", group.getVisibility());
            groupMap.put("isActive", group.getIsActive());
            groupMap.put("createdAt", group.getCreatedAt());
            
            // Safe course info
            if (group.getCourse() != null) {
                groupMap.put("course", Map.of(
                    "id", group.getCourse().getId(),
                    "code", group.getCourse().getCode(),
                    "name", group.getCourse().getName()
                ));
            }
            
            // Safe creator info
            if (group.getCreator() != null) {
                groupMap.put("creator", Map.of(
                    "id", group.getCreator().getId(),
                    "username", group.getCreator().getUsername(),
                    "fullName", group.getCreator().getFullName() != null ? group.getCreator().getFullName() : group.getCreator().getUsername()
                ));
            }
            
            // Member count
            groupMap.put("memberCount", group.getMembers() != null ? group.getMembers().size() : 0);
            
            // Safe members list
            if (group.getMembers() != null) {
                groupMap.put("members", group.getMembers().stream().map(member -> Map.of(
                    "id", member.getId(),
                    "username", member.getUsername(),
                    "fullName", member.getFullName() != null ? member.getFullName() : member.getUsername()
                )).toList());
            }
            
            return groupMap;
        }).toList();
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getGroupById(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        StudyGroup group = groupRepository.findById(id)
                .orElse(null);
        
        if (group == null) {
            return ResponseEntity.notFound().build();
        }

        // Check if user is a member
        boolean isMember = group.getMembers().stream()
                .anyMatch(m -> m.getId().equals(currentUser.getId()));
        boolean isCreator = group.getCreator().getId().equals(currentUser.getId());

        // For private groups, non-members can only see basic info
        if ("private".equals(group.getVisibility()) && !isMember && !isCreator) {
            Map<String, Object> limitedInfo = new java.util.HashMap<>();
            limitedInfo.put("id", group.getId());
            limitedInfo.put("name", group.getName());
            limitedInfo.put("description", group.getDescription() != null ? group.getDescription() : "");
            limitedInfo.put("visibility", group.getVisibility());
            limitedInfo.put("maxSize", group.getMaxSize());
            limitedInfo.put("memberCount", group.getMembers().size());
            if (group.getCourse() != null) {
                limitedInfo.put("course", Map.of(
                    "id", group.getCourse().getId(),
                    "code", group.getCourse().getCode(),
                    "name", group.getCourse().getName()
                ));
            }
            limitedInfo.put("creator", Map.of(
                "id", group.getCreator().getId(),
                "fullName", group.getCreator().getFullName() != null ? group.getCreator().getFullName() : group.getCreator().getUsername()
            ));
            limitedInfo.put("isPrivate", true);
            limitedInfo.put("canJoin", false);
            limitedInfo.put("message", "This is a private group. Only the creator can invite members.");
            return ResponseEntity.ok(limitedInfo);
        }

        // Return full group info as safe Map
        Map<String, Object> groupInfo = new java.util.HashMap<>();
        groupInfo.put("id", group.getId());
        groupInfo.put("name", group.getName());
        groupInfo.put("description", group.getDescription());
        groupInfo.put("topic", group.getTopic());
        groupInfo.put("maxSize", group.getMaxSize());
        groupInfo.put("visibility", group.getVisibility());
        groupInfo.put("isActive", group.getIsActive());
        groupInfo.put("createdAt", group.getCreatedAt());
        groupInfo.put("updatedAt", group.getUpdatedAt());
        
        // Safe course info
        if (group.getCourse() != null) {
            groupInfo.put("course", Map.of(
                "id", group.getCourse().getId(),
                "code", group.getCourse().getCode(),
                "name", group.getCourse().getName()
            ));
        }
        
        // Safe creator info
        if (group.getCreator() != null) {
            groupInfo.put("creator", Map.of(
                "id", group.getCreator().getId(),
                "username", group.getCreator().getUsername(),
                "fullName", group.getCreator().getFullName() != null ? group.getCreator().getFullName() : group.getCreator().getUsername()
            ));
        }
        
        // Member count and members list
        groupInfo.put("memberCount", group.getMembers() != null ? group.getMembers().size() : 0);
        if (group.getMembers() != null) {
            groupInfo.put("members", group.getMembers().stream().map(member -> Map.of(
                "id", member.getId(),
                "username", member.getUsername(),
                "fullName", member.getFullName() != null ? member.getFullName() : member.getUsername()
            )).toList());
        }
        
        // Additional info for members
        groupInfo.put("isMember", isMember);
        groupInfo.put("isCreator", isCreator);
        
        return ResponseEntity.ok(groupInfo);
    }

    /**
     * Check if user can view group content (chat, files)
     */
    @GetMapping("/{id}/can-view-content")
    public ResponseEntity<?> canViewContent(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        StudyGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        boolean isMember = group.getMembers().stream()
                .anyMatch(m -> m.getId().equals(currentUser.getId()));

        return ResponseEntity.ok(Map.of(
            "canView", isMember,
            "isMember", isMember,
            "visibility", group.getVisibility()
        ));
    }

    /**
     * Join a group directly (only for 'open' visibility)
     */
    @PostMapping("/{id}/join")
    public ResponseEntity<?> joinGroup(@PathVariable Long id) {
        User user = getCurrentUser();
        StudyGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Check if already a member
        if (user.getGroups().contains(group)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Already a member of this group"));
        }

        // Check group capacity
        if (group.getMembers().size() >= group.getMaxSize()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Group is full"));
        }

        String visibility = group.getVisibility();

        // Only 'open' groups allow direct joining
        if ("open".equals(visibility)) {
            // Update both sides of the relationship
            user.getGroups().add(group);
            group.getMembers().add(user);
            userRepository.save(user);
            groupRepository.save(group);
            return ResponseEntity.ok(Map.of("message", "Joined group successfully", "status", "JOINED"));
        }

        // For 'approval' groups, create a join request
        if ("approval".equals(visibility)) {
            // Check if there's already a pending request
            if (requestRepository.existsPendingRequestForUser(group.getId(), user.getId())) {
                return ResponseEntity.badRequest().body(Map.of("message", "You already have a pending request for this group"));
            }

            GroupMemberRequest request = GroupMemberRequest.builder()
                    .group(group)
                    .user(user)
                    .requestType("JOIN_REQUEST")
                    .status("PENDING")
                    .build();
            requestRepository.save(request);

            // Notify the group creator
            notificationService.createActionableNotification(
                    group.getCreator(),
                    "GROUP_JOIN_REQUEST",
                    "Join Request for " + group.getName(),
                    user.getFullName() + " wants to join your group \"" + group.getName() + "\"",
                    group.getId(),
                    "GROUP",
                    user.getId()
            );

            return ResponseEntity.ok(Map.of(
                "message", "Join request sent. Waiting for approval from group creator.",
                "status", "PENDING"
            ));
        }

        // For 'private' groups, deny the request
        if ("private".equals(visibility)) {
            return ResponseEntity.badRequest().body(Map.of(
                "message", "This is a private group. Only the creator can invite members.",
                "status", "DENIED"
            ));
        }

        return ResponseEntity.badRequest().body(Map.of("message", "Unknown visibility setting"));
    }

    /**
     * Request to join a group (for 'approval' visibility)
     */
    @PostMapping("/{id}/request-join")
    public ResponseEntity<?> requestJoin(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        User user = getCurrentUser();
        StudyGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Check if already a member
        if (user.getGroups().contains(group)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Already a member of this group"));
        }

        // Only 'approval' groups accept join requests
        if (!"approval".equals(group.getVisibility())) {
            return ResponseEntity.badRequest().body(Map.of("message", "This group does not accept join requests"));
        }

        // Check if there's already a pending request
        if (requestRepository.existsPendingRequestForUser(group.getId(), user.getId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "You already have a pending request for this group"));
        }

        String message = body != null ? body.get("message") : null;

        GroupMemberRequest request = GroupMemberRequest.builder()
                .group(group)
                .user(user)
                .requestType("JOIN_REQUEST")
                .status("PENDING")
                .message(message)
                .build();
        requestRepository.save(request);

        // Notify the group creator
        notificationService.createActionableNotification(
                group.getCreator(),
                "GROUP_JOIN_REQUEST",
                "Join Request for " + group.getName(),
                user.getFullName() + " wants to join your group \"" + group.getName() + "\"" + 
                    (message != null ? ". Message: " + message : ""),
                group.getId(),
                "GROUP",
                user.getId()
        );

        return ResponseEntity.ok(Map.of(
            "message", "Join request sent successfully",
            "status", "PENDING"
        ));
    }

    /**
     * Invite a user to a group (only creator can do this)
     */
    @PostMapping("/{id}/invite")
    public ResponseEntity<?> inviteUser(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        User currentUser = getCurrentUser();
        StudyGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Only creator can invite
        if (!group.getCreator().getId().equals(currentUser.getId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only the group creator can invite users"));
        }

        Long userId = Long.valueOf(body.get("userId").toString());
        User invitedUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if user is already a member
        if (invitedUser.getGroups().contains(group)) {
            return ResponseEntity.badRequest().body(Map.of("message", "User is already a member of this group"));
        }

        // Check if there's already a pending invite
        if (requestRepository.findPendingRequest(group.getId(), userId, "INVITE").isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "User already has a pending invite"));
        }

        String message = body.get("message") != null ? body.get("message").toString() : null;

        GroupMemberRequest invite = GroupMemberRequest.builder()
                .group(group)
                .user(invitedUser)
                .requestType("INVITE")
                .status("PENDING")
                .message(message)
                .invitedBy(currentUser)
                .build();
        requestRepository.save(invite);

        // Notify the invited user
        notificationService.createActionableNotification(
                invitedUser,
                "GROUP_INVITE",
                "Group Invitation",
                currentUser.getFullName() + " invited you to join \"" + group.getName() + "\"" +
                    (message != null ? ". Message: " + message : ""),
                group.getId(),
                "GROUP",
                currentUser.getId()
        );

        return ResponseEntity.ok(Map.of("message", "Invitation sent successfully"));
    }

    /**
     * Accept a join request (for group creators)
     */
    @PostMapping("/requests/{requestId}/accept")
    public ResponseEntity<?> acceptRequest(@PathVariable Long requestId) {
        User currentUser = getCurrentUser();
        GroupMemberRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        // Only creator can accept join requests
        if ("JOIN_REQUEST".equals(request.getRequestType())) {
            if (!request.getGroup().getCreator().getId().equals(currentUser.getId())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Only the group creator can accept requests"));
            }
        }

        // For invites, the invited user accepts
        if ("INVITE".equals(request.getRequestType())) {
            if (!request.getUser().getId().equals(currentUser.getId())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Only the invited user can accept this invitation"));
            }
        }

        // Add user to group
        User userToAdd = request.getUser();
        StudyGroup group = request.getGroup();

        // Check capacity
        if (group.getMembers().size() >= group.getMaxSize()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Group is full"));
        }

        // Update both sides of the relationship
        userToAdd.getGroups().add(group);
        group.getMembers().add(userToAdd);
        
        // Save both entities to ensure relationship is persisted
        userRepository.save(userToAdd);
        groupRepository.save(group);

        // Update request status
        request.setStatus("ACCEPTED");
        request.setRespondedAt(LocalDateTime.now());
        request.setRespondedBy(currentUser);
        requestRepository.save(request);

        // Notify the requester/inviter
        if ("JOIN_REQUEST".equals(request.getRequestType())) {
            notificationService.createNotification(
                    userToAdd,
                    "GROUP_REQUEST_ACCEPTED",
                    "Join Request Accepted",
                    "Your request to join \"" + group.getName() + "\" has been accepted!"
            );
        } else {
            notificationService.createNotification(
                    request.getInvitedBy(),
                    "GROUP_INVITE_ACCEPTED",
                    "Invitation Accepted",
                    userToAdd.getFullName() + " accepted your invitation to join \"" + group.getName() + "\""
            );
        }

        return ResponseEntity.ok(Map.of("message", "Request accepted successfully"));
    }

    /**
     * Reject a join request (for group creators) or decline an invite
     */
    @PostMapping("/requests/{requestId}/reject")
    public ResponseEntity<?> rejectRequest(@PathVariable Long requestId) {
        User currentUser = getCurrentUser();
        GroupMemberRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        // Only creator can reject join requests
        if ("JOIN_REQUEST".equals(request.getRequestType())) {
            if (!request.getGroup().getCreator().getId().equals(currentUser.getId())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Only the group creator can reject requests"));
            }
        }

        // For invites, the invited user declines
        if ("INVITE".equals(request.getRequestType())) {
            if (!request.getUser().getId().equals(currentUser.getId())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Only the invited user can decline this invitation"));
            }
        }

        request.setStatus("REJECTED");
        request.setRespondedAt(LocalDateTime.now());
        request.setRespondedBy(currentUser);
        requestRepository.save(request);

        // Notify appropriately
        if ("JOIN_REQUEST".equals(request.getRequestType())) {
            notificationService.createNotification(
                    request.getUser(),
                    "GROUP_REQUEST_REJECTED",
                    "Join Request Declined",
                    "Your request to join \"" + request.getGroup().getName() + "\" was declined."
            );
        } else {
            notificationService.createNotification(
                    request.getInvitedBy(),
                    "GROUP_INVITE_DECLINED",
                    "Invitation Declined",
                    request.getUser().getFullName() + " declined your invitation to join \"" + request.getGroup().getName() + "\""
            );
        }

        return ResponseEntity.ok(Map.of("message", "Request rejected"));
    }

    /**
     * Get pending join requests for a group (for creators)
     */
    @GetMapping("/{id}/pending-requests")
    public ResponseEntity<?> getPendingRequests(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        StudyGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Only creator can view requests
        if (!group.getCreator().getId().equals(currentUser.getId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only the group creator can view pending requests"));
        }

        List<GroupMemberRequest> requests = requestRepository.findByGroupIdAndRequestTypeAndStatus(
                id, "JOIN_REQUEST", "PENDING");
        return ResponseEntity.ok(requests);
    }

    /**
     * Get my pending invites
     */
    @GetMapping("/my-invites")
    public ResponseEntity<List<GroupMemberRequest>> getMyInvites() {
        User currentUser = getCurrentUser();
        List<GroupMemberRequest> invites = requestRepository.findByUserIdAndRequestTypeAndStatus(
                currentUser.getId(), "INVITE", "PENDING");
        return ResponseEntity.ok(invites);
    }

    /**
     * Get my pending join requests (what I've requested)
     */
    @GetMapping("/my-requests")
    public ResponseEntity<List<GroupMemberRequest>> getMyRequests() {
        User currentUser = getCurrentUser();
        List<GroupMemberRequest> requests = requestRepository.findByUserIdAndRequestTypeAndStatus(
                currentUser.getId(), "JOIN_REQUEST", "PENDING");
        return ResponseEntity.ok(requests);
    }

    /**
     * Check user's status in a group
     */
    @GetMapping("/{id}/my-status")
    public ResponseEntity<?> getMyStatus(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        StudyGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        boolean isMember = group.getMembers().stream()
                .anyMatch(m -> m.getId().equals(currentUser.getId()));
        boolean isCreator = group.getCreator().getId().equals(currentUser.getId());
        boolean hasPendingRequest = requestRepository.existsPendingRequestForUser(group.getId(), currentUser.getId());

        String status;
        if (isMember) {
            status = "MEMBER";
        } else if (hasPendingRequest) {
            status = "PENDING";
        } else {
            status = "NOT_MEMBER";
        }

        return ResponseEntity.ok(Map.of(
            "status", status,
            "isMember", isMember,
            "isCreator", isCreator,
            "hasPendingRequest", hasPendingRequest,
            "visibility", group.getVisibility(),
            "canJoin", "open".equals(group.getVisibility()) && !isMember,
            "canRequestJoin", "approval".equals(group.getVisibility()) && !isMember && !hasPendingRequest,
            "canBeInvited", "private".equals(group.getVisibility()) && !isMember
        ));
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<?> leaveGroup(@PathVariable Long id) {
        User user = getCurrentUser();
        StudyGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Creator cannot leave their own group
        if (group.getCreator().getId().equals(user.getId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Group creator cannot leave. Transfer ownership or delete the group instead."));
        }

        user.getGroups().remove(group);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Left group successfully"));
    }

    @GetMapping("/my-groups")
    public ResponseEntity<List<Map<String, Object>>> getMyGroups() {
        User user = getCurrentUser();
        List<StudyGroup> groups = groupRepository.findGroupsByMemberId(user.getId());
        
        // Convert to safe DTO to avoid circular references
        List<Map<String, Object>> result = groups.stream().map(group -> {
            Map<String, Object> groupMap = new java.util.HashMap<>();
            groupMap.put("id", group.getId());
            groupMap.put("name", group.getName());
            groupMap.put("description", group.getDescription());
            groupMap.put("topic", group.getTopic());
            groupMap.put("maxSize", group.getMaxSize());
            groupMap.put("visibility", group.getVisibility());
            groupMap.put("isActive", group.getIsActive());
            groupMap.put("createdAt", group.getCreatedAt());
            groupMap.put("updatedAt", group.getUpdatedAt());
            
            // Safe course info
            if (group.getCourse() != null) {
                groupMap.put("course", Map.of(
                    "id", group.getCourse().getId(),
                    "code", group.getCourse().getCode(),
                    "name", group.getCourse().getName()
                ));
            }
            
            // Safe creator info
            if (group.getCreator() != null) {
                groupMap.put("creator", Map.of(
                    "id", group.getCreator().getId(),
                    "username", group.getCreator().getUsername(),
                    "fullName", group.getCreator().getFullName() != null ? group.getCreator().getFullName() : group.getCreator().getUsername()
                ));
            }
            
            // Member count only (not full member list)
            groupMap.put("memberCount", group.getMembers() != null ? group.getMembers().size() : 0);
            
            // Safe members list (minimal info)
            if (group.getMembers() != null) {
                groupMap.put("members", group.getMembers().stream().map(member -> Map.of(
                    "id", member.getId(),
                    "username", member.getUsername(),
                    "fullName", member.getFullName() != null ? member.getFullName() : member.getUsername()
                )).toList());
            }
            
            return groupMap;
        }).toList();
        
        return ResponseEntity.ok(result);
    }

    /**
     * Search users to invite (for group creators)
     */
    @GetMapping("/{id}/search-users")
    public ResponseEntity<?> searchUsersToInvite(@PathVariable Long id, @RequestParam String query) {
        User currentUser = getCurrentUser();
        StudyGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Only creator can search for users to invite
        if (!group.getCreator().getId().equals(currentUser.getId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Only the group creator can invite users"));
        }

        // Search users by name or email
        List<User> users = userRepository.findByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCase(query, query);
        
        // Filter out existing members and the creator
        users = users.stream()
                .filter(u -> !u.getId().equals(currentUser.getId()))
                .filter(u -> group.getMembers().stream().noneMatch(m -> m.getId().equals(u.getId())))
                .toList();

        // Return simplified user info
        var result = users.stream().map(u -> Map.of(
                "id", u.getId(),
                "fullName", u.getFullName() != null ? u.getFullName() : u.getUsername(),
                "email", u.getEmail(),
                "username", u.getUsername()
        )).toList();

        return ResponseEntity.ok(result);
    }

    /**
     * Get chat preview for a group (last message and unread count)
     */
    @GetMapping("/{id}/chat-preview")
    public ResponseEntity<?> getChatPreview(@PathVariable Long id) {
        User currentUser = getCurrentUser();
        StudyGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Check if user is a member using direct SQL query (more reliable)
        boolean isMember = groupRepository.isUserMemberOfGroup(id, currentUser.getId());

        if (!isMember) {
            return ResponseEntity.badRequest().body(Map.of("message", "Not a member of this group"));
        }

        // Get the most recent message
        List<Message> recentMessages = messageRepository.findRecentMessagesByGroup(id);
        Message lastMessage = recentMessages.isEmpty() ? null : recentMessages.get(0);

        // For unread count, we would need to track last read timestamp per user
        // For now, we'll return 0 (this could be enhanced later with a LastRead entity)
        int unreadCount = 0;

        Map<String, Object> response = new java.util.HashMap<>();
        
        if (lastMessage != null) {
            Map<String, Object> messageInfo = new java.util.HashMap<>();
            messageInfo.put("id", lastMessage.getId());
            messageInfo.put("content", lastMessage.getContent());
            messageInfo.put("createdAt", lastMessage.getCreatedAt());
            messageInfo.put("messageType", lastMessage.getMessageType());
            
            if (lastMessage.getSender() != null) {
                Map<String, Object> senderInfo = new java.util.HashMap<>();
                senderInfo.put("id", lastMessage.getSender().getId());
                senderInfo.put("username", lastMessage.getSender().getUsername());
                senderInfo.put("fullName", lastMessage.getSender().getFullName());
                messageInfo.put("sender", senderInfo);
            }
            
            response.put("lastMessage", messageInfo);
        } else {
            response.put("lastMessage", null);
        }
        
        response.put("unreadCount", unreadCount);
        response.put("totalMessages", recentMessages.size());

        return ResponseEntity.ok(response);
    }
}
