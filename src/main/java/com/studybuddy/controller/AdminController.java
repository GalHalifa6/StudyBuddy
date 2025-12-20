package com.studybuddy.controller;

import com.studybuddy.dto.AuthDto;
import com.studybuddy.dto.UserAdminDto;
import com.studybuddy.model.Course;
import com.studybuddy.model.Role;
import com.studybuddy.model.StudyGroup;
import com.studybuddy.model.User;
import com.studybuddy.repository.CourseRepository;
import com.studybuddy.repository.StudyGroupRepository;
import com.studybuddy.repository.UserRepository;
import com.studybuddy.service.AdminService;
import com.studybuddy.service.AdminStatsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
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
    private AdminService adminService;

    @Autowired
    private AdminStatsService statsService;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private StudyGroupRepository studyGroupRepository;

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
                .filter(user -> includeDeleted != null && includeDeleted || !user.getIsDeleted())
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
            if (includeArchived == null || !includeArchived) {
                courses = courses.stream()
                        .filter(c -> c.getIsArchived() == null || !c.getIsArchived())
                        .collect(Collectors.toList());
            }
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
            StudyGroup group = studyGroupRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Group not found"));
            
            studyGroupRepository.delete(group);
            return ResponseEntity.ok(new AuthDto.MessageResponse("Group deleted successfully", true));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
