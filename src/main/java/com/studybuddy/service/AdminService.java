package com.studybuddy.service;

import com.studybuddy.model.AdminAuditLog;
import com.studybuddy.model.Course;
import com.studybuddy.model.Role;
import com.studybuddy.model.StudyGroup;
import com.studybuddy.model.User;
import com.studybuddy.repository.AdminAuditLogRepository;
import com.studybuddy.repository.CourseRepository;
import com.studybuddy.repository.StudyGroupRepository;
import com.studybuddy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Admin Service
 * Handles admin operations with safety checks and audit logging
 */
@Service
public class AdminService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private StudyGroupRepository studyGroupRepository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    /**
     * Get current admin user from security context
     */
    private User getCurrentAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("Admin user not found"));
    }

    /**
     * Check if user is trying to modify themselves (prevent self-lockout)
     */
    private void checkSelfModification(Long targetUserId, String action) {
        User currentAdmin = getCurrentAdmin();
        if (currentAdmin.getId().equals(targetUserId)) {
            throw new IllegalArgumentException("Cannot " + action + " your own account");
        }
    }

    /**
     * Check if trying to modify last admin account
     */
    private void checkLastAdmin(Long targetUserId) {
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (targetUser.getRole() == Role.ADMIN) {
            long adminCount = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.ADMIN && !u.getIsDeleted())
                    .count();
            
            if (adminCount <= 1) {
                throw new IllegalArgumentException("Cannot modify the last admin account");
            }
        }
    }

    /**
     * Create audit log entry
     */
    private void logAction(String actionType, String targetType, Long targetId, String reason, Map<String, Object> metadata) {
        User admin = getCurrentAdmin();
        AdminAuditLog log = new AdminAuditLog();
        log.setAdminUserId(admin.getId());
        log.setActionType(actionType);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setReason(reason);
        
        if (metadata != null && !metadata.isEmpty()) {
            // Simple JSON-like string (for MVP, can use proper JSON library later)
            log.setMetadata(metadata.toString());
        }
        
        auditLogRepository.save(log);
    }

    /**
     * Suspend a user
     */
    @Transactional
    public User suspendUser(Long userId, LocalDateTime suspendedUntil, String reason) {
        checkSelfModification(userId, "suspend");
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setSuspendedUntil(suspendedUntil);
        user.setSuspensionReason(reason);
        user.setIsActive(false); // Disable login while suspended
        
        User savedUser = userRepository.save(user);
        
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("suspendedUntil", suspendedUntil.toString());
        logAction("SUSPEND", "USER", userId, reason, metadata);
        
        return savedUser;
    }

    /**
     * Ban a user
     */
    @Transactional
    public User banUser(Long userId, String reason) {
        checkSelfModification(userId, "ban");
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setBannedAt(LocalDateTime.now());
        user.setBanReason(reason);
        user.setIsActive(false);
        
        User savedUser = userRepository.save(user);
        
        logAction("BAN", "USER", userId, reason, null);
        
        return savedUser;
    }

    /**
     * Remove suspension from a user
     */
    @Transactional
    public User unsuspendUser(Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setSuspendedUntil(null);
        user.setSuspensionReason(null);
        // Only enable login if not banned
        if (!user.isBanned()) {
            user.setIsActive(true);
        }
        
        User savedUser = userRepository.save(user);
        
        logAction("UNSUSPEND", "USER", userId, reason, null);
        
        return savedUser;
    }

    /**
     * Unban a user
     */
    @Transactional
    public User unbanUser(Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setBannedAt(null);
        user.setBanReason(null);
        // Only enable login if not suspended
        if (!user.isSuspended()) {
            user.setIsActive(true);
        }
        
        User savedUser = userRepository.save(user);
        
        logAction("UNBAN", "USER", userId, reason, null);
        
        return savedUser;
    }

    /**
     * Soft delete a user
     */
    @Transactional
    public User softDeleteUser(Long userId, String reason) {
        checkSelfModification(userId, "delete");
        checkLastAdmin(userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setIsDeleted(true);
        user.setDeletedAt(LocalDateTime.now());
        user.setIsActive(false);
        
        User savedUser = userRepository.save(user);
        
        logAction("SOFT_DELETE", "USER", userId, reason, null);
        
        return savedUser;
    }

    /**
     * Restore a soft-deleted user
     */
    @Transactional
    public User restoreUser(Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (!user.getIsDeleted()) {
            throw new IllegalArgumentException("User is not deleted");
        }
        
        user.setIsDeleted(false);
        user.setDeletedAt(null);
        // Only enable login if not banned or suspended
        if (!user.isBanned() && !user.isSuspended()) {
            user.setIsActive(true);
        }
        
        User savedUser = userRepository.save(user);
        
        logAction("RESTORE", "USER", userId, reason, null);
        
        return savedUser;
    }

    /**
     * Permanently delete a user (only if already soft deleted)
     */
    @Transactional
    public void permanentDeleteUser(Long userId, String reason) {
        checkSelfModification(userId, "permanently delete");
        checkLastAdmin(userId);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (!user.getIsDeleted()) {
            throw new IllegalArgumentException("User must be soft deleted before permanent deletion");
        }
        
        // Check if soft deleted more than 30 days ago
        if (user.getDeletedAt() != null && user.getDeletedAt().isAfter(LocalDateTime.now().minusDays(30))) {
            throw new IllegalArgumentException("Cannot permanently delete user until 30 days after soft deletion");
        }
        
        logAction("PERMANENT_DELETE", "USER", userId, reason, null);
        userRepository.delete(user);
    }

    /**
     * Update user role with safety checks
     */
    @Transactional
    public User updateUserRole(Long userId, Role newRole, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Prevent removing own admin role
        User currentAdmin = getCurrentAdmin();
        if (currentAdmin.getId().equals(userId) && user.getRole() == Role.ADMIN && newRole != Role.ADMIN) {
            throw new IllegalArgumentException("Cannot remove your own admin role");
        }
        
        // Check if trying to modify last admin
        if (user.getRole() == Role.ADMIN && newRole != Role.ADMIN) {
            checkLastAdmin(userId);
        }
        
        Role oldRole = user.getRole();
        user.setRole(newRole);
        User savedUser = userRepository.save(user);
        
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("oldRole", oldRole.name());
        metadata.put("newRole", newRole.name());
        logAction("ROLE_CHANGE", "USER", userId, reason, metadata);
        
        return savedUser;
    }

    /**
     * Disable login without suspension/ban
     */
    @Transactional
    public User disableLogin(Long userId, String reason) {
        checkSelfModification(userId, "disable login for");
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setIsActive(false);
        User savedUser = userRepository.save(user);
        
        logAction("DISABLE_LOGIN", "USER", userId, reason, null);
        
        return savedUser;
    }

    /**
     * Enable login
     * If user is suspended, automatically unsuspend them as well (admin override)
     */
    @Transactional
    public User enableLogin(Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Don't enable if banned
        if (user.isBanned()) {
            throw new IllegalArgumentException("Cannot enable login for banned user. Unban first.");
        }
        
        // If suspended, automatically unsuspend (admin can override suspension)
        if (user.isSuspended()) {
            user.setSuspendedUntil(null);
            user.setSuspensionReason(null);
        }
        
        user.setIsActive(true);
        User savedUser = userRepository.save(user);
        
        logAction("ENABLE_LOGIN", "USER", userId, reason, null);
        
        return savedUser;
    }

    /**
     * Update course details
     */
    @Transactional
    public Course updateCourse(Long courseId, String name, String description, String reason) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found"));
        
        Map<String, Object> metadata = new HashMap<>();
        if (name != null && !name.equals(course.getName())) {
            metadata.put("oldName", course.getName());
            metadata.put("newName", name);
            course.setName(name);
        }
        if (description != null && !description.equals(course.getDescription())) {
            metadata.put("oldDescription", course.getDescription());
            metadata.put("newDescription", description);
            course.setDescription(description);
        }
        
        Course savedCourse = courseRepository.save(course);
        logAction("COURSE_UPDATE", "COURSE", courseId, reason, metadata);
        
        return savedCourse;
    }

    /**
     * Archive a course
     */
    @Transactional
    public Course archiveCourse(Long courseId, String reason) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found"));
        
        if (course.getIsArchived() != null && course.getIsArchived()) {
            throw new IllegalArgumentException("Course is already archived");
        }
        
        course.setIsArchived(true);
        course.setArchivedAt(LocalDateTime.now());
        Course savedCourse = courseRepository.save(course);
        
        logAction("COURSE_ARCHIVE", "COURSE", courseId, reason, null);
        
        return savedCourse;
    }

    /**
     * Unarchive a course
     */
    @Transactional
    public Course unarchiveCourse(Long courseId, String reason) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found"));
        
        if (course.getIsArchived() == null || !course.getIsArchived()) {
            throw new IllegalArgumentException("Course is not archived");
        }
        
        course.setIsArchived(false);
        course.setArchivedAt(null);
        Course savedCourse = courseRepository.save(course);
        
        logAction("COURSE_UNARCHIVE", "COURSE", courseId, reason, null);
        
        return savedCourse;
    }

    /**
     * Permanently delete a course
     */
    @Transactional
    public void deleteCourse(Long courseId, String reason) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found"));
        
        // Check if course has active groups
        if (!course.getGroups().isEmpty()) {
            long activeGroups = course.getGroups().stream()
                    .filter(g -> g.getIsActive() != null && g.getIsActive())
                    .count();
            if (activeGroups > 0) {
                throw new IllegalArgumentException("Cannot delete course with active study groups. Archive the course instead.");
            }
        }
        
        logAction("COURSE_DELETE", "COURSE", courseId, reason, null);
        courseRepository.delete(course);
    }

    /**
     * Remove a user from a course
     */
    @Transactional
    public void removeUserFromCourse(Long courseId, Long userId, String reason) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (!course.getStudents().contains(user)) {
            throw new IllegalArgumentException("User is not enrolled in this course");
        }
        
        course.getStudents().remove(user);
        user.getCourses().remove(course);
        
        courseRepository.save(course);
        userRepository.save(user);
        
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("userId", userId);
        metadata.put("username", user.getUsername());
        logAction("COURSE_REMOVE_MEMBER", "COURSE", courseId, reason, metadata);
    }

    /**
     * Delete a study group
     */
    @Transactional
    public void deleteGroup(Long groupId, String reason) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));
        
        logAction("GROUP_DELETE", "GROUP", groupId, reason, null);
        studyGroupRepository.delete(group);
    }
}

