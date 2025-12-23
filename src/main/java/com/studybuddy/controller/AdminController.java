package com.studybuddy.controller;

import com.studybuddy.dto.AuditLogDto;
import com.studybuddy.dto.AuthDto;
import com.studybuddy.dto.UserAdminDto;
import com.studybuddy.model.AdminAuditLog;
import com.studybuddy.model.Course;
import com.studybuddy.model.ExpertProfile;
import com.studybuddy.model.Role;
import com.studybuddy.model.StudyGroup;
import com.studybuddy.model.User;
import com.studybuddy.repository.*;
import com.studybuddy.repository.AdminAuditLogRepository;
import com.studybuddy.repository.CourseRepository;
import com.studybuddy.repository.ExpertProfileRepository;
import com.studybuddy.repository.StudyGroupRepository;
import com.studybuddy.repository.UserRepository;
import com.studybuddy.service.AdminService;
import com.studybuddy.service.AdminStatsService;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Admin Controller
 * Handles admin-only operations
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminController {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private EmailVerificationTokenRepository emailVerificationTokenRepository;
    
    @Autowired
    private NotificationRepository notificationRepository;
    
    @Autowired
    private GroupMemberRequestRepository groupMemberRequestRepository;
    
    @Autowired
    private QuestionVoteRepository questionVoteRepository;
    
    @Autowired
    private SessionParticipantRepository sessionParticipantRepository;
    
    @Autowired
    private ExpertProfileRepository expertProfileRepository;

    @Autowired
    private AdminService adminService;

    @Autowired
    private AdminStatsService statsService;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private StudyGroupRepository studyGroupRepository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private ExpertProfileRepository expertProfileRepository;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStatistics() {
        Map<String, Object> stats = statsService.getAdminStatistics();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/activity")
    public ResponseEntity<List<Map<String, Object>>> getRecentActivity() {
        List<Map<String, Object>> activities = new java.util.ArrayList<>();
        
        // Get recent users (last 10, ordered by creation date)
        List<User> recentUsers = userRepository.findAll().stream()
                .filter(user -> user.getCreatedAt() != null && !user.getIsDeleted())
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(5)
                .collect(Collectors.toList());
        
        for (User user : recentUsers) {
            Map<String, Object> activity = new HashMap<>();
            activity.put("type", "USER_REGISTERED");
            activity.put("message", "New user registered: " + (user.getFullName() != null && !user.getFullName().isEmpty() ? user.getFullName() : user.getUsername()));
            activity.put("timestamp", user.getCreatedAt());
            activity.put("icon", "CheckCircle");
            activity.put("color", "green");
            activities.add(activity);
        }
        
        // Get recent courses (last 5, ordered by creation date)
        List<Course> recentCourses = courseRepository.findAll().stream()
                .filter(course -> course.getCreatedAt() != null && (course.getIsArchived() == null || !course.getIsArchived()))
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(3)
                .collect(Collectors.toList());
        
        for (Course course : recentCourses) {
            Map<String, Object> activity = new HashMap<>();
            activity.put("type", "COURSE_ADDED");
            activity.put("message", "Course added: " + course.getCode());
            activity.put("timestamp", course.getCreatedAt());
            activity.put("icon", "GraduationCap");
            activity.put("color", "purple");
            activities.add(activity);
        }
        
        // Get recent study groups (last 5, ordered by creation date)
        List<StudyGroup> recentGroups = studyGroupRepository.findAll().stream()
                .filter(group -> group.getCreatedAt() != null && (group.getIsActive() == null || group.getIsActive()))
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(3)
                .collect(Collectors.toList());
        
        for (StudyGroup group : recentGroups) {
            Map<String, Object> activity = new HashMap<>();
            activity.put("type", "GROUP_CREATED");
            activity.put("message", "Study group created: " + group.getName());
            activity.put("timestamp", group.getCreatedAt());
            activity.put("icon", "BookOpen");
            activity.put("color", "blue");
            activities.add(activity);
        }
        
        // Sort all activities by timestamp (most recent first) and limit to 10
        activities.sort((a, b) -> {
            LocalDateTime timeA = (LocalDateTime) a.get("timestamp");
            LocalDateTime timeB = (LocalDateTime) b.get("timestamp");
            return timeB.compareTo(timeA);
        });
        
        return ResponseEntity.ok(activities.stream().limit(10).collect(Collectors.toList()));
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserAdminDto>> getAllUsers(@RequestParam(required = false) Boolean includeDeleted) {
        // Include deleted users if requested, otherwise filter them out
        List<UserAdminDto> users = userRepository.findAll().stream()
                .filter(user -> {
                    if (includeDeleted != null && includeDeleted) {
                        return true; // Include all users when explicitly requested
                    }
                    return !Boolean.TRUE.equals(user.getIsDeleted()); // Otherwise, exclude deleted users
                })
                .map(UserAdminDto::fromUser)
                .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserAdminDto> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(UserAdminDto::fromUser)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> updateUserRole(@PathVariable Long id, @RequestBody RoleUpdateRequest request) {
        try {
            if (request.getRole() == null || request.getRole().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new AuthDto.MessageResponse("Role cannot be null or empty", false));
            }
            Role newRole = Role.valueOf(request.getRole().toUpperCase());
            adminService.updateUserRole(id, newRole, request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse(
                    "User role updated to " + newRole.getDisplayName(), true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<?> updateUserStatus(@PathVariable Long id, @RequestBody StatusUpdateRequest request) {
        try {
            if (request.isActive()) {
                adminService.enableLogin(id, request.getReason());
            } else {
                adminService.disableLogin(id, request.getReason());
            }
            return ResponseEntity.ok(new AuthDto.MessageResponse(
                    "User status updated to " + (request.isActive() ? "active" : "inactive"), true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/users/{id}/suspend")
    public ResponseEntity<?> suspendUser(@PathVariable Long id, @RequestBody SuspendRequest request) {
        try {
            LocalDateTime suspendedUntil;
            if (request.getDays() == null || request.getDays() <= 0) {
                // Indefinite suspension
                suspendedUntil = LocalDateTime.now().plusYears(100);
            } else {
                suspendedUntil = LocalDateTime.now().plusDays(request.getDays());
            }
            
            adminService.suspendUser(id, suspendedUntil, request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse(
                    "User suspended until " + suspendedUntil.toLocalDate(), true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/users/{id}/ban")
    public ResponseEntity<?> banUser(@PathVariable Long id, @RequestBody BanRequest request) {
        try {
            adminService.banUser(id, request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("User banned successfully", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/users/{id}/unsuspend")
    public ResponseEntity<?> unsuspendUser(@PathVariable Long id, @RequestBody UnsuspendRequest request) {
        try {
            adminService.unsuspendUser(id, request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("User suspension removed successfully", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/users/{id}/unban")
    public ResponseEntity<?> unbanUser(@PathVariable Long id, @RequestBody UnbanRequest request) {
        try {
            adminService.unbanUser(id, request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("User unbanned successfully", true));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/users/{id}/soft-delete")
    public ResponseEntity<?> softDeleteUser(@PathVariable Long id, @RequestBody DeleteRequest request) {
        try {
            adminService.softDeleteUser(id, request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("User soft deleted successfully", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/users/{id}/restore")
    public ResponseEntity<?> restoreUser(@PathVariable Long id, @RequestBody RestoreRequest request) {
        try {
            adminService.restoreUser(id, request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("User restored successfully", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/users/{id}")
    @Transactional
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        User user = userOpt.get();
        
        // Delete all child records that reference this user to avoid foreign key constraint violations
        // Order matters: delete records that might have their own dependencies first
        
        // 1. Delete email verification tokens (by ID to avoid entity state issues)
        emailVerificationTokenRepository.deleteByUserId(id);
        
        // 2. Delete notifications
        notificationRepository.deleteByUserId(id);
        
        // 3. Delete group member requests (join requests and invites)
        // Delete where user is the requester/invited user
        groupMemberRequestRepository.deleteByUserId(id);
        // Delete where user is the inviter
        groupMemberRequestRepository.deleteByInvitedById(id);
        // Delete where user is the responder
        groupMemberRequestRepository.deleteByRespondedById(id);
        
        // 4. Delete question votes
        questionVoteRepository.deleteByUserId(id);
        
        // 5. Delete session participants
        sessionParticipantRepository.deleteByUserId(id);
        
        // 6. Delete expert profile (if exists)
        expertProfileRepository.deleteByUserId(id);
        
        // 7. Finally, delete the user
        // Note: Other relationships like messages, files, createdGroups are handled by cascade delete
        // Many-to-many relationships (courses, groups) will be automatically removed when user is deleted
        userRepository.delete(user);
        
        return ResponseEntity.ok(new AuthDto.MessageResponse("User deleted successfully", true));
    public ResponseEntity<?> permanentDeleteUser(@PathVariable Long id, @RequestBody DeleteRequest request) {
        try {
            adminService.permanentDeleteUser(id, request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("User permanently deleted successfully", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Request DTOs
    public static class RoleUpdateRequest {
        private String role;
        private String reason;
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class StatusUpdateRequest {
        private boolean active;
        private String reason;
        public boolean isActive() { return active; }
        public void setActive(boolean active) { this.active = active; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class SuspendRequest {
        private Integer days;
        private String reason;
        public Integer getDays() { return days; }
        public void setDays(Integer days) { this.days = days; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class BanRequest {
        private String reason;
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class UnsuspendRequest {
        private String reason;
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class UnbanRequest {
        private String reason;
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class DeleteRequest {
        private String reason;
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class RestoreRequest {
        private String reason;
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    // ========== Course Management Endpoints ==========

    @GetMapping("/courses")
    public ResponseEntity<List<Map<String, Object>>> getAllCourses(@RequestParam(required = false) Boolean includeArchived) {
        List<Course> courses;
        try {
            if (includeArchived != null && includeArchived) {
                courses = courseRepository.findAll();
            } else {
                courses = courseRepository.findByIsArchivedFalse();
            }
        } catch (Exception e) {
            // Fallback: if query fails (e.g., column doesn't exist), get all and filter manually
            courses = courseRepository.findAll();
            // Always apply filtering in fallback to respect includeArchived parameter
            if (includeArchived == null || !includeArchived) {
                courses = courses.stream()
                        .filter(c -> c.getIsArchived() == null || !c.getIsArchived())
                        .collect(Collectors.toList());
            }
            // If includeArchived is true, courses already contains all courses (including archived)
        }
        
        List<Map<String, Object>> result = courses.stream().map(course -> {
            Map<String, Object> courseMap = new HashMap<>();
            courseMap.put("id", course.getId());
            courseMap.put("code", course.getCode());
            courseMap.put("name", course.getName());
            courseMap.put("description", course.getDescription());
            courseMap.put("faculty", course.getFaculty());
            courseMap.put("semester", course.getSemester());
            courseMap.put("createdAt", course.getCreatedAt());
            courseMap.put("isArchived", course.getIsArchived() != null ? course.getIsArchived() : false);
            courseMap.put("archivedAt", course.getArchivedAt());
            
            // Get stats
            int groupCount = studyGroupRepository.findByCourseIdAndIsActiveTrue(course.getId()).size();
            int memberCount = course.getStudents() != null ? course.getStudents().size() : 0;
            
            courseMap.put("groupCount", groupCount);
            courseMap.put("memberCount", memberCount);
            
            // Get last activity (most recent group update or creation)
            LocalDateTime lastActivity = course.getCreatedAt();
            if (course.getGroups() != null && !course.getGroups().isEmpty()) {
                lastActivity = course.getGroups().stream()
                        .filter(g -> g.getUpdatedAt() != null)
                        .map(StudyGroup::getUpdatedAt)
                        .max(LocalDateTime::compareTo)
                        .orElse(course.getCreatedAt());
            }
            courseMap.put("lastActivity", lastActivity);
            
            return courseMap;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/courses/{id}")
    public ResponseEntity<Map<String, Object>> getCourseDetails(@PathVariable Long id) {
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Course not found"));
        
        Map<String, Object> courseMap = new HashMap<>();
        courseMap.put("id", course.getId());
        courseMap.put("code", course.getCode());
        courseMap.put("name", course.getName());
        courseMap.put("description", course.getDescription());
        courseMap.put("faculty", course.getFaculty());
        courseMap.put("semester", course.getSemester());
        courseMap.put("createdAt", course.getCreatedAt());
        courseMap.put("isArchived", course.getIsArchived() != null ? course.getIsArchived() : false);
        courseMap.put("archivedAt", course.getArchivedAt());
        
        // Get groups
        List<StudyGroup> groups = studyGroupRepository.findByCourseId(course.getId());
        List<Map<String, Object>> groupsList = groups.stream().map(group -> {
            Map<String, Object> groupMap = new HashMap<>();
            groupMap.put("id", group.getId());
            groupMap.put("name", group.getName());
            groupMap.put("description", group.getDescription());
            groupMap.put("topic", group.getTopic());
            groupMap.put("maxSize", group.getMaxSize());
            groupMap.put("visibility", group.getVisibility());
            groupMap.put("isActive", group.getIsActive());
            groupMap.put("createdAt", group.getCreatedAt());
            groupMap.put("updatedAt", group.getUpdatedAt());
            groupMap.put("memberCount", group.getMembers() != null ? group.getMembers().size() : 0);
            if (group.getCreator() != null) {
                groupMap.put("creator", Map.of(
                    "id", group.getCreator().getId(),
                    "username", group.getCreator().getUsername(),
                    "fullName", group.getCreator().getFullName() != null ? group.getCreator().getFullName() : ""
                ));
            }
            return groupMap;
        }).collect(Collectors.toList());
        courseMap.put("groups", groupsList);
        
        // Get enrolled users with activity status
        List<Map<String, Object>> studentsList = course.getStudents() != null ? course.getStudents().stream().map(user -> {
            Map<String, Object> userMap = new HashMap<>();
            userMap.put("id", user.getId());
            userMap.put("username", user.getUsername());
            userMap.put("fullName", user.getFullName());
            userMap.put("email", user.getEmail());
            userMap.put("role", user.getRole() != null ? user.getRole().name() : "USER");
            userMap.put("isActive", user.getIsActive());
            userMap.put("lastLoginAt", user.getLastLoginAt());
            userMap.put("isEmailVerified", user.getIsEmailVerified());
            return userMap;
        }).collect(Collectors.toList()) : List.of();
        courseMap.put("students", studentsList);
        
        courseMap.put("memberCount", studentsList.size());
        courseMap.put("groupCount", groupsList.size());
        
        return ResponseEntity.ok(courseMap);
    }

    @PutMapping("/courses/{id}")
    public ResponseEntity<?> updateCourse(@PathVariable Long id, @RequestBody CourseUpdateRequest request) {
        try {
            adminService.updateCourse(id, request.getName(), request.getDescription(), request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("Course updated successfully", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/courses/{id}/archive")
    public ResponseEntity<?> archiveCourse(@PathVariable Long id, @RequestBody ArchiveRequest request) {
        try {
            adminService.archiveCourse(id, request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("Course archived successfully", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/courses/{id}/unarchive")
    public ResponseEntity<?> unarchiveCourse(@PathVariable Long id, @RequestBody ArchiveRequest request) {
        try {
            adminService.unarchiveCourse(id, request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("Course unarchived successfully", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/courses/{id}")
    public ResponseEntity<?> deleteCourse(@PathVariable Long id, @RequestBody DeleteRequest request) {
        try {
            adminService.deleteCourse(id, request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("Course deleted successfully", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/courses/{courseId}/members/{userId}")
    public ResponseEntity<?> removeUserFromCourse(@PathVariable Long courseId, @PathVariable Long userId, @RequestBody DeleteRequest request) {
        try {
            adminService.removeUserFromCourse(courseId, userId, request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("User removed from course successfully", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Course management request DTOs
    public static class CourseUpdateRequest {
        private String name;
        private String description;
        private String reason;
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class ArchiveRequest {
        private String reason;
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    // ========== Group Management Endpoints ==========

    @GetMapping("/groups")
    public ResponseEntity<List<Map<String, Object>>> getAllGroups() {
        List<StudyGroup> allGroups = studyGroupRepository.findAll();
        
        List<Map<String, Object>> result = allGroups.stream().map(group -> {
            Map<String, Object> groupMap = new HashMap<>();
            groupMap.put("id", group.getId());
            groupMap.put("name", group.getName());
            groupMap.put("description", group.getDescription());
            groupMap.put("topic", group.getTopic());
            groupMap.put("maxSize", group.getMaxSize());
            groupMap.put("visibility", group.getVisibility());
            groupMap.put("isActive", group.getIsActive());
            groupMap.put("createdAt", group.getCreatedAt());
            groupMap.put("updatedAt", group.getUpdatedAt());
            
            // Course info
            if (group.getCourse() != null) {
                Map<String, Object> courseMap = new HashMap<>();
                courseMap.put("id", group.getCourse().getId());
                courseMap.put("code", group.getCourse().getCode());
                courseMap.put("name", group.getCourse().getName());
                groupMap.put("course", courseMap);
            }
            
            // Creator info
            if (group.getCreator() != null) {
                Map<String, Object> creatorMap = new HashMap<>();
                creatorMap.put("id", group.getCreator().getId());
                creatorMap.put("username", group.getCreator().getUsername());
                creatorMap.put("fullName", group.getCreator().getFullName());
                groupMap.put("creator", creatorMap);
            }
            
            // Member count - try to get it safely, default to 0 if lazy loading fails
            int memberCount = 0;
            try {
                if (group.getMembers() != null) {
                    memberCount = group.getMembers().size();
                }
            } catch (Exception e) {
                // Lazy loading failed, use 0
                memberCount = 0;
            }
            groupMap.put("memberCount", memberCount);
            groupMap.put("members", List.of()); // Empty array for list view, details will load separately
            
            return groupMap;
        }).collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    @GetMapping("/groups/{id}")
    public ResponseEntity<Map<String, Object>> getGroupDetails(@PathVariable Long id) {
        // Fetch group with members eagerly loaded to avoid lazy loading issues
        StudyGroup group = studyGroupRepository.findByIdWithMembers(id)
                .orElseThrow(() -> new RuntimeException("Group not found"));
        
        Map<String, Object> groupMap = new HashMap<>();
        groupMap.put("id", group.getId());
        groupMap.put("name", group.getName());
        groupMap.put("description", group.getDescription());
        groupMap.put("topic", group.getTopic());
        groupMap.put("maxSize", group.getMaxSize());
        groupMap.put("visibility", group.getVisibility());
        groupMap.put("isActive", group.getIsActive());
        groupMap.put("createdAt", group.getCreatedAt());
        groupMap.put("updatedAt", group.getUpdatedAt());
        
        // Course info
        if (group.getCourse() != null) {
            Map<String, Object> courseMap = new HashMap<>();
            courseMap.put("id", group.getCourse().getId());
            courseMap.put("code", group.getCourse().getCode());
            courseMap.put("name", group.getCourse().getName());
            groupMap.put("course", courseMap);
        }
        
        // Creator info
        if (group.getCreator() != null) {
            Map<String, Object> creatorMap = new HashMap<>();
            creatorMap.put("id", group.getCreator().getId());
            creatorMap.put("username", group.getCreator().getUsername());
            creatorMap.put("fullName", group.getCreator().getFullName());
            creatorMap.put("email", group.getCreator().getEmail());
            groupMap.put("creator", creatorMap);
        }
        
        // Members list
        List<Map<String, Object>> membersList = group.getMembers() != null ? group.getMembers().stream().map(member -> {
            Map<String, Object> memberMap = new HashMap<>();
            memberMap.put("id", member.getId());
            memberMap.put("username", member.getUsername());
            memberMap.put("fullName", member.getFullName());
            memberMap.put("email", member.getEmail());
            memberMap.put("role", member.getRole() != null ? member.getRole().name() : "USER");
            memberMap.put("isActive", member.getIsActive());
            memberMap.put("lastLoginAt", member.getLastLoginAt());
            return memberMap;
        }).collect(Collectors.toList()) : List.of();
        groupMap.put("members", membersList);
        groupMap.put("memberCount", membersList.size());
        
        return ResponseEntity.ok(groupMap);
    }

    @DeleteMapping("/groups/{id}")
    public ResponseEntity<?> deleteGroup(@PathVariable Long id, @RequestBody DeleteRequest request) {
        try {
            adminService.deleteGroup(id, request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("Group deleted successfully", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ========== Audit Log Endpoints ==========

    @GetMapping("/audit-logs")
    public ResponseEntity<Map<String, Object>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String targetType,
            @RequestParam(required = false) Long adminUserId,
            @RequestParam(required = false) Long targetId,
            @RequestParam(required = false) String fromDate,
            @RequestParam(required = false) String toDate,
            @RequestParam(required = false) String search) {
        
        try {
            // Create pageable with sorting by createdAt desc
            Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
            
            // Build specification for filtering
            Specification<AdminAuditLog> spec = buildAuditLogSpecification(
                    actionType, targetType, adminUserId, targetId, fromDate, toDate, search);
            
            // Fetch paginated results
            Page<AdminAuditLog> auditLogPage = auditLogRepository.findAll(spec, pageable);
            
            // Convert to DTOs
            List<AuditLogDto> logs = auditLogPage.getContent().stream()
                    .map(AuditLogDto::fromAuditLog)
                    .collect(Collectors.toList());
            
            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("content", logs);
            response.put("totalElements", auditLogPage.getTotalElements());
            response.put("totalPages", auditLogPage.getTotalPages());
            response.put("currentPage", auditLogPage.getNumber());
            response.put("size", auditLogPage.getSize());
            response.put("hasNext", auditLogPage.hasNext());
            response.put("hasPrevious", auditLogPage.hasPrevious());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Error fetching audit logs: " + e.getMessage()));
        }
    }

    private Specification<AdminAuditLog> buildAuditLogSpecification(
            String actionType, String targetType, Long adminUserId, Long targetId,
            String fromDate, String toDate, String search) {
        
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // Filter by actionType
            if (actionType != null && !actionType.trim().isEmpty()) {
                predicates.add(cb.equal(cb.lower(root.get("actionType")), actionType.toLowerCase()));
            }
            
            // Filter by targetType
            if (targetType != null && !targetType.trim().isEmpty()) {
                predicates.add(cb.equal(cb.lower(root.get("targetType")), targetType.toLowerCase()));
            }
            
            // Filter by adminUserId
            if (adminUserId != null) {
                predicates.add(cb.equal(root.get("adminUserId"), adminUserId));
            }
            
            // Filter by targetId
            if (targetId != null) {
                predicates.add(cb.equal(root.get("targetId"), targetId));
            }
            
            // Filter by date range
            // Accept both ISO format and datetime-local format (YYYY-MM-DDTHH:mm)
            if (fromDate != null && !fromDate.trim().isEmpty()) {
                try {
                    LocalDateTime from;
                    if (fromDate.contains("T") && fromDate.length() == 16) {
                        // datetime-local format: YYYY-MM-DDTHH:mm
                        from = LocalDateTime.parse(fromDate + ":00");
                    } else {
                        // ISO format or other
                        from = LocalDateTime.parse(fromDate.replace("Z", "").replace("+00:00", ""));
                    }
                    predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from));
                } catch (Exception e) {
                    // Invalid date format, ignore
                }
            }
            
            if (toDate != null && !toDate.trim().isEmpty()) {
                try {
                    LocalDateTime to;
                    if (toDate.contains("T") && toDate.length() == 16) {
                        // datetime-local format: YYYY-MM-DDTHH:mm
                        to = LocalDateTime.parse(toDate + ":00");
                    } else {
                        // ISO format or other
                        to = LocalDateTime.parse(toDate.replace("Z", "").replace("+00:00", ""));
                    }
                    predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), to));
                } catch (Exception e) {
                    // Invalid date format, ignore
                }
            }
            
            // Search in reason and metadata
            if (search != null && !search.trim().isEmpty()) {
                String searchPattern = "%" + search.toLowerCase() + "%";
                Predicate reasonPredicate = cb.like(cb.lower(root.get("reason")), searchPattern);
                Predicate metadataPredicate = cb.like(cb.lower(root.get("metadata")), searchPattern);
                predicates.add(cb.or(reasonPredicate, metadataPredicate));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    // ========== Expert Management Endpoints ==========

    @GetMapping("/experts")
    public ResponseEntity<Map<String, Object>> getExperts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status, // PENDING or VERIFIED
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String institution,
            @RequestParam(required = false) String specialization) {
        
        try {
            // Get all users with EXPERT role
            List<User> expertUsers = userRepository.findAll().stream()
                    .filter(user -> user.getRole() == Role.EXPERT)
                    .collect(Collectors.toList());
            
            // Build list of expert DTOs (with or without profiles)
            List<Map<String, Object>> allExperts = new ArrayList<>();
            
            for (User expertUser : expertUsers) {
                ExpertProfile profile = expertProfileRepository.findByUser(expertUser).orElse(null);
                
                // If no profile exists, create a DTO for the user without profile
                if (profile == null) {
                    // Only include active users who are not deleted
                    if (expertUser.getIsActive() != null && expertUser.getIsActive() 
                            && (expertUser.getIsDeleted() == null || !expertUser.getIsDeleted())) {
                    Map<String, Object> expertDto = new HashMap<>();
                    // Use userId as id when no profile exists (for frontend compatibility)
                    expertDto.put("id", expertUser.getId()); // Use userId as identifier
                    expertDto.put("userId", expertUser.getId());
                    expertDto.put("username", expertUser.getUsername());
                    expertDto.put("fullName", expertUser.getFullName() != null ? expertUser.getFullName() : expertUser.getUsername());
                    expertDto.put("email", expertUser.getEmail());
                    expertDto.put("isVerified", false);
                    expertDto.put("isActive", expertUser.getIsActive() != null ? expertUser.getIsActive() : true);
                    expertDto.put("hasProfile", false);
                    expertDto.put("createdAt", expertUser.getCreatedAt() != null ? expertUser.getCreatedAt() : LocalDateTime.now());
                    expertDto.put("title", null);
                    expertDto.put("institution", null);
                    expertDto.put("bio", null);
                    expertDto.put("qualifications", null);
                    expertDto.put("specializations", new ArrayList<>());
                    expertDto.put("skills", new ArrayList<>());
                    expertDto.put("yearsOfExperience", 0);
                    expertDto.put("averageRating", 0.0);
                    expertDto.put("totalRatings", 0);
                    expertDto.put("totalSessions", 0);
                    expertDto.put("totalQuestionsAnswered", 0);
                    allExperts.add(expertDto);
                    }
                } else {
                    // Profile exists, use existing DTO conversion
                    // Include all profiles (active check is done in filtering)
                    allExperts.add(toExpertAdminDto(profile));
                }
            }
            
            // Apply filters
            List<Map<String, Object>> filteredExperts = allExperts.stream()
                    .filter(expert -> {
                        // Filter by status
                        if (status != null && !status.trim().isEmpty()) {
                            Boolean isVerified = (Boolean) expert.get("isVerified");
                            if ("PENDING".equalsIgnoreCase(status)) {
                                if (isVerified == null || !isVerified) {
                                    return true; // Pending
                                }
                                return false;
                            } else if ("VERIFIED".equalsIgnoreCase(status)) {
                                return isVerified != null && isVerified; // Verified
                            }
                        }
                        return true; // No status filter
                    })
                    .filter(expert -> {
                        // Filter by isActive
                        Boolean isActive = (Boolean) expert.get("isActive");
                        return isActive != null && isActive;
                    })
                    .filter(expert -> {
                        // Filter by search
                        if (search != null && !search.trim().isEmpty()) {
                            String searchLower = search.toLowerCase();
                            String fullName = (String) expert.get("fullName");
                            String email = (String) expert.get("email");
                            String bio = (String) expert.get("bio");
                            return (fullName != null && fullName.toLowerCase().contains(searchLower)) ||
                                   (email != null && email.toLowerCase().contains(searchLower)) ||
                                   (bio != null && bio.toLowerCase().contains(searchLower));
                        }
                        return true;
                    })
                    .filter(expert -> {
                        // Filter by institution
                        if (institution != null && !institution.trim().isEmpty()) {
                            String expertInstitution = (String) expert.get("institution");
                            return expertInstitution != null && 
                                   expertInstitution.toLowerCase().contains(institution.toLowerCase());
                        }
                        return true;
                    })
                    .filter(expert -> {
                        // Filter by specialization
                        if (specialization != null && !specialization.trim().isEmpty()) {
                            @SuppressWarnings("unchecked")
                            List<String> specializations = (List<String>) expert.get("specializations");
                            if (specializations == null || specializations.isEmpty()) {
                                return false;
                            }
                            return specializations.stream()
                                    .anyMatch(s -> s.toLowerCase().contains(specialization.toLowerCase()));
                        }
                        return true;
                    })
                    .sorted((a, b) -> {
                        // Sort by createdAt descending (nulls last)
                        LocalDateTime dateA = (LocalDateTime) a.get("createdAt");
                        LocalDateTime dateB = (LocalDateTime) b.get("createdAt");
                        if (dateA == null && dateB == null) return 0;
                        if (dateA == null) return 1; // nulls go to end
                        if (dateB == null) return -1; // nulls go to end
                        return dateB.compareTo(dateA); // newest first
                    })
                    .collect(Collectors.toList());
            
            // Apply pagination
            int totalElements = filteredExperts.size();
            int totalPages = (int) Math.ceil((double) totalElements / size);
            int start = page * size;
            int end = Math.min(start + size, totalElements);
            List<Map<String, Object>> paginatedExperts = start < totalElements 
                    ? filteredExperts.subList(start, end) 
                    : new ArrayList<>();
            
            Map<String, Object> response = new HashMap<>();
            response.put("content", paginatedExperts);
            response.put("totalElements", totalElements);
            response.put("totalPages", totalPages);
            response.put("currentPage", page);
            response.put("size", size);
            response.put("hasNext", page < totalPages - 1);
            response.put("hasPrevious", page > 0);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Error fetching experts: " + e.getMessage()));
        }
    }

    @GetMapping("/experts/{expertId}")
    public ResponseEntity<Map<String, Object>> getExpertDetails(@PathVariable Long expertId) {
        try {
            // Try to find by profile ID first
            ExpertProfile profile = expertProfileRepository.findById(expertId).orElse(null);
            
            if (profile != null) {
                return ResponseEntity.ok(toExpertAdminDto(profile));
            }
            
            // If not found, try to find by userId (for experts without profiles)
            User expertUser = userRepository.findById(expertId)
                    .orElseThrow(() -> new RuntimeException("Expert not found"));
            
            if (expertUser.getRole() != Role.EXPERT) {
                return ResponseEntity.badRequest()
                        .body(Map.of("message", "User is not an expert"));
            }
            
            // Create DTO for user without profile
            Map<String, Object> expertDto = new HashMap<>();
            expertDto.put("id", null);
            expertDto.put("userId", expertUser.getId());
            expertDto.put("username", expertUser.getUsername());
            expertDto.put("fullName", expertUser.getFullName());
            expertDto.put("email", expertUser.getEmail());
            expertDto.put("isVerified", false);
            expertDto.put("isActive", true);
            expertDto.put("hasProfile", false);
            expertDto.put("createdAt", expertUser.getCreatedAt());
            expertDto.put("title", null);
            expertDto.put("institution", null);
            expertDto.put("bio", null);
            expertDto.put("qualifications", null);
            expertDto.put("specializations", new ArrayList<>());
            expertDto.put("yearsOfExperience", 0);
            
            return ResponseEntity.ok(expertDto);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/experts/{expertId}/verify")
    public ResponseEntity<?> verifyExpert(@PathVariable Long expertId, @RequestBody VerifyRequest request) {
        try {
            // Try to find profile by ID first
            ExpertProfile profile = expertProfileRepository.findById(expertId).orElse(null);
            
            if (profile == null) {
                // Try to find by userId and create a basic profile if needed
                User expertUser = userRepository.findById(expertId)
                        .orElseThrow(() -> new RuntimeException("Expert not found"));
                
                if (expertUser.getRole() != Role.EXPERT) {
                    return ResponseEntity.badRequest()
                            .body(new AuthDto.MessageResponse("User is not an expert", false));
                }
                
                // Create a basic profile for the expert
                profile = new ExpertProfile();
                profile.setUser(expertUser);
                profile.setIsActive(true);
                profile.setIsVerified(false);
                profile = expertProfileRepository.save(profile);
            }
            
            adminService.verifyExpert(profile.getId(), request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("Expert verified successfully", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/experts/{expertId}/reject")
    public ResponseEntity<?> rejectExpert(@PathVariable Long expertId, @RequestBody RejectRequest request) {
        try {
            if (request.getReason() == null || request.getReason().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new AuthDto.MessageResponse("Reason is required for rejecting an expert", false));
            }
            
            // Try to find profile by ID first
            ExpertProfile profile = expertProfileRepository.findById(expertId).orElse(null);
            
            if (profile == null) {
                // Try to find by userId (for experts without profiles)
                User expertUser = userRepository.findById(expertId)
                        .orElseThrow(() -> new RuntimeException("Expert not found"));
                
                if (expertUser.getRole() != Role.EXPERT) {
                    return ResponseEntity.badRequest()
                            .body(new AuthDto.MessageResponse("User is not an expert", false));
                }
                
                // Create a basic profile for the expert if it doesn't exist
                profile = expertProfileRepository.findByUser(expertUser).orElse(null);
                if (profile == null) {
                    profile = new ExpertProfile();
                    profile.setUser(expertUser);
                    profile.setIsActive(true);
                    profile.setIsVerified(false);
                    profile = expertProfileRepository.save(profile);
                }
            }
            
            adminService.rejectExpert(profile.getId(), request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("Expert rejected successfully. User role changed to regular user.", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse("Failed to reject expert: " + e.getMessage(), false));
        }
    }

    @PostMapping("/experts/{expertId}/revoke")
    public ResponseEntity<?> revokeExpertVerification(@PathVariable Long expertId, @RequestBody RevokeRequest request) {
        try {
            if (request.getReason() == null || request.getReason().trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new AuthDto.MessageResponse("Reason is required for revoking expert verification", false));
            }
            
            // Try to find profile by ID first
            ExpertProfile profile = expertProfileRepository.findById(expertId).orElse(null);
            
            if (profile == null) {
                // Try to find by userId (for experts without profiles)
                User expertUser = userRepository.findById(expertId)
                        .orElseThrow(() -> new RuntimeException("Expert not found"));
                
                if (expertUser.getRole() != Role.EXPERT) {
                    return ResponseEntity.badRequest()
                            .body(new AuthDto.MessageResponse("User is not an expert", false));
                }
                
                // Find existing profile or return error (can't revoke if no profile exists)
                profile = expertProfileRepository.findByUser(expertUser)
                        .orElseThrow(() -> new RuntimeException("Expert profile not found"));
            }
            
            adminService.revokeExpertVerification(profile.getId(), request.getReason());
            return ResponseEntity.ok(new AuthDto.MessageResponse("Expert verification revoked successfully", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(e.getMessage(), false));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse("Failed to revoke expert verification: " + e.getMessage(), false));
        }
    }

    private Specification<ExpertProfile> buildExpertSpecification(
            String status, String search, String institution, String specialization) {
        
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // Only show active experts
            predicates.add(cb.equal(root.get("isActive"), true));
            
            // Filter by verification status
            if (status != null && !status.trim().isEmpty()) {
                if ("PENDING".equalsIgnoreCase(status)) {
                    // Pending = not verified (isVerified is false or null)
                    predicates.add(cb.or(
                        cb.equal(root.get("isVerified"), false),
                        cb.isNull(root.get("isVerified"))
                    ));
                } else if ("VERIFIED".equalsIgnoreCase(status)) {
                    // Verified = isVerified is explicitly true
                    predicates.add(cb.equal(root.get("isVerified"), true));
                }
            }
            
            // Filter by institution
            if (institution != null && !institution.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("institution")), 
                        "%" + institution.toLowerCase() + "%"));
            }
            
            // Filter by specialization
            if (specialization != null && !specialization.trim().isEmpty()) {
                Join<ExpertProfile, String> specializationsJoin = root.join("specializations", JoinType.LEFT);
                predicates.add(cb.like(cb.lower(specializationsJoin), 
                        "%" + specialization.toLowerCase() + "%"));
            }
            
            // Search in name, email, bio
            if (search != null && !search.trim().isEmpty()) {
                String searchPattern = "%" + search.toLowerCase() + "%";
                Join<ExpertProfile, User> userJoin = root.join("user", JoinType.INNER);
                Predicate namePredicate = cb.like(cb.lower(userJoin.get("fullName")), searchPattern);
                Predicate emailPredicate = cb.like(cb.lower(userJoin.get("email")), searchPattern);
                Predicate bioPredicate = cb.like(cb.lower(root.get("bio")), searchPattern);
                predicates.add(cb.or(namePredicate, emailPredicate, bioPredicate));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Map<String, Object> toExpertAdminDto(ExpertProfile profile) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", profile.getId());
        dto.put("userId", profile.getUser().getId());
        dto.put("username", profile.getUser().getUsername());
        dto.put("fullName", profile.getUser().getFullName());
        dto.put("email", profile.getUser().getEmail());
        dto.put("title", profile.getTitle());
        dto.put("institution", profile.getInstitution());
        dto.put("bio", profile.getBio());
        dto.put("qualifications", profile.getQualifications());
        dto.put("yearsOfExperience", profile.getYearsOfExperience());
        dto.put("specializations", profile.getSpecializations());
        dto.put("skills", profile.getSkills());
        dto.put("isVerified", profile.getIsVerified());
        dto.put("isActive", profile.getIsActive());
        dto.put("verifiedAt", profile.getVerifiedAt());
        dto.put("verifiedBy", profile.getVerifiedBy());
        dto.put("averageRating", profile.getAverageRating());
        dto.put("totalRatings", profile.getTotalRatings());
        dto.put("totalSessions", profile.getTotalSessions());
        dto.put("totalQuestionsAnswered", profile.getTotalQuestionsAnswered());
        dto.put("weeklyAvailability", profile.getWeeklyAvailability());
        dto.put("maxSessionsPerWeek", profile.getMaxSessionsPerWeek());
        dto.put("sessionDurationMinutes", profile.getSessionDurationMinutes());
        dto.put("acceptingNewStudents", profile.getAcceptingNewStudents());
        dto.put("offersGroupConsultations", profile.getOffersGroupConsultations());
        dto.put("offersOneOnOne", profile.getOffersOneOnOne());
        dto.put("offersAsyncQA", profile.getOffersAsyncQA());
        dto.put("typicalResponseHours", profile.getTypicalResponseHours());
        dto.put("isAvailableNow", profile.getIsAvailableNow());
        dto.put("helpfulAnswers", profile.getHelpfulAnswers());
        dto.put("hasProfile", true); // Profile exists
        dto.put("studentsHelped", profile.getStudentsHelped());
        dto.put("linkedInUrl", profile.getLinkedInUrl());
        dto.put("personalWebsite", profile.getPersonalWebsite());
        dto.put("createdAt", profile.getCreatedAt());
        dto.put("updatedAt", profile.getUpdatedAt());
        
        // Add expertise courses
        if (profile.getExpertiseCourses() != null) {
            List<Map<String, Object>> courses = profile.getExpertiseCourses().stream()
                    .map(course -> {
                        Map<String, Object> courseMap = new HashMap<>();
                        courseMap.put("id", course.getId());
                        courseMap.put("code", course.getCode());
                        courseMap.put("name", course.getName());
                        return courseMap;
                    })
                    .collect(Collectors.toList());
            dto.put("expertiseCourses", courses);
        }
        
        return dto;
    }

    // Request DTOs for expert actions
    public static class VerifyRequest {
        private String reason;
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class RejectRequest {
        private String reason;
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }

    public static class RevokeRequest {
        private String reason;
        public String getReason() { return reason; }
        public void setReason(String reason) { this.reason = reason; }
    }
}
