package com.studybuddy.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studybuddy.model.AdminAuditLog;
import com.studybuddy.model.Course;
import com.studybuddy.model.ExpertProfile;
import com.studybuddy.model.Role;
import com.studybuddy.model.StudyGroup;
import com.studybuddy.model.User;
import com.studybuddy.repository.AdminAuditLogRepository;
import com.studybuddy.repository.CharacteristicProfileRepository;
import com.studybuddy.repository.CourseRepository;
import com.studybuddy.repository.ExpertProfileRepository;
import com.studybuddy.repository.StudyGroupRepository;
import com.studybuddy.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
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
    private ExpertProfileRepository expertProfileRepository;

    @Autowired
    private CharacteristicProfileRepository characteristicProfileRepository;

    @Autowired
    private AdminAuditLogRepository auditLogRepository;

    @Autowired
    private EntityManager entityManager;

    private final ObjectMapper objectMapper = new ObjectMapper();

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
            // Count functional admins (not deleted and not banned)
            long adminCount = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.ADMIN 
                            && !Boolean.TRUE.equals(u.getIsDeleted())
                            && u.getBannedAt() == null)
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
            try {
                // Serialize metadata to valid JSON format
                log.setMetadata(objectMapper.writeValueAsString(metadata));
            } catch (JsonProcessingException e) {
                // Fallback to string representation if JSON serialization fails
                log.setMetadata(metadata.toString());
            }
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
        // Don't modify isActive - rely on isSuspended() check in canLogin()
        // This allows automatic re-enablement when suspension expires
        
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
        checkLastAdmin(userId);
        
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
     * Only removes suspension flags, does not modify isActive.
     * If user was disabled via disableLogin(), they remain disabled.
     */
    @Transactional
    public User unsuspendUser(Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setSuspendedUntil(null);
        user.setSuspensionReason(null);
        // Don't modify isActive - let canLogin() check handle the logic
        // If user was disabled via disableLogin(), they should remain disabled
        
        User savedUser = userRepository.save(user);
        
        logAction("UNSUSPEND", "USER", userId, reason, null);
        
        return savedUser;
    }

    /**
     * Unban a user
     * Only removes ban flags, does not modify isActive.
     * If user was disabled via disableLogin(), they remain disabled.
     */
    @Transactional
    public User unbanUser(Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        user.setBannedAt(null);
        user.setBanReason(null);
        // Don't modify isActive - let canLogin() check handle the logic
        // If user was disabled via disableLogin(), they should remain disabled
        
        User savedUser = userRepository.save(user);
        
        logAction("UNBAN", "USER", userId, reason, null);
        
        return savedUser;
    }

    /**
     * Soft delete a user
     * 
     * IMPORTANT: This is a temporary removal with grace period for recovery.
     * 
     * Behavior:
     * - Sets user.isDeleted = true
     * - Sets user.isActive = false
     * - Sets user.deletedAt = current timestamp
     * 
     * Does NOT:
     * - Delete ExpertProfile (preserved for audit/recovery)
     * - Change user role (preserved for restore)
     * - Remove verification status (preserved for audit)
     * 
     * Purpose:
     * - Temporary account suspension
     * - 30-day grace period before permanent deletion
     * - Allows restoration with all data intact
     * - Maintains audit trail and expert history
     * 
     * To permanently remove: Use permanentDeleteUser() after grace period
     * To reject expert: Use rejectExpert() (deletes profile, changes role)
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
        
        // NOTE: ExpertProfile is intentionally NOT deleted here
        // This allows recovery and maintains audit trail during grace period
        
        User savedUser = userRepository.save(user);
        
        logAction("SOFT_DELETE", "USER", userId, reason, null);
        
        return savedUser;
    }

    /**
     * Restore a soft-deleted user
     * 
     * IMPORTANT: This restores a user from soft deletion, preserving all data.
     * 
     * Behavior:
     * - Sets user.isDeleted = false
     * - Clears user.deletedAt
     * - Sets user.isActive = true (if not banned/suspended)
     * 
     * Preserves:
     * - ExpertProfile (if exists) - remains intact with all data
     * - User role (EXPERT/USER) - unchanged
     * - Verification status - unchanged
     * - All user data and relationships
     * 
     * Purpose:
     * - Reverse a soft deletion
     * - Restore user access during grace period
     * - Maintains all expert data if user was an expert
     * 
     * This is why soft delete doesn't touch ExpertProfile - it allows
     * complete restoration with all expert data intact.
     * 
     * Audit: Logs RESTORE action
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
        
        // NOTE: ExpertProfile (if exists) remains intact and is automatically
        // accessible again since the user is restored
        
        User savedUser = userRepository.save(user);
        
        logAction("RESTORE", "USER", userId, reason, null);
        
        return savedUser;
    }

    /**
     * Permanently delete a user (only if already soft deleted)
     * 
     * IMPORTANT: This is a permanent, irreversible deletion.
     * 
     * Prerequisites:
     * - User must be soft-deleted first
     * - Admin can bypass 30-day grace period (admin override)
     * 
     * Behavior:
     * 1. FIRST: Delete ExpertProfile (if exists) to avoid foreign key constraint
     * 2. THEN: Permanently delete User from database
     * 
     * This ensures:
     * - No orphaned ExpertProfile records
     * - No foreign key constraint violations
     * - Complete data removal
     * 
     * Purpose:
     * - Admin can immediately permanently delete if needed
     * - Grace period is informational only (can be bypassed by admin)
     * - GDPR compliance (right to be forgotten)
     * - Complete data removal
     * 
     * Note: The 30-day grace period is a recommendation, not a hard requirement.
     * Admins can permanently delete immediately after soft deletion if needed.
     * 
     * Audit: Logs USER_PERMANENT_DELETE action
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
        
        // NOTE: 30-day grace period check removed - admins can permanently delete
        // immediately after soft deletion if needed. The grace period is informational
        // and can be bypassed by admin action.
        
        // STEP 1: Delete ExpertProfile FIRST to avoid foreign key constraint violation
        // This must happen before user deletion
        expertProfileRepository.deleteByUserId(userId);
        entityManager.flush(); // Force immediate commit of profile deletion
        
        // STEP 1.5: Delete CharacteristicProfile to avoid foreign key constraint violation
        // This must happen before user deletion
        characteristicProfileRepository.findByUserId(userId).ifPresent(characteristicProfileRepository::delete);
        entityManager.flush(); // Force immediate commit of characteristic profile deletion
        
        // STEP 2: Delete study groups created by the user
        // First, find all study groups created by this user
        List<StudyGroup> groupsCreatedByUser = studyGroupRepository.findByCreatorId(userId);
        
        if (!groupsCreatedByUser.isEmpty()) {
            // For each group, delete group_members entries (join table)
            // This must happen before deleting the groups
            for (StudyGroup group : groupsCreatedByUser) {
                // Delete from group_members join table using native query
                entityManager.createNativeQuery(
                    "DELETE FROM group_members WHERE group_id = :groupId"
                ).setParameter("groupId", group.getId()).executeUpdate();
            }
            entityManager.flush(); // Ensure group_members deletions are committed
            
            // Now delete the study groups themselves
            // Messages, files, and room shares will be cascade deleted
            for (StudyGroup group : groupsCreatedByUser) {
                studyGroupRepository.delete(group);
            }
            entityManager.flush(); // Ensure study group deletions are committed
        }
        
        logAction("PERMANENT_DELETE", "USER", userId, reason, null);
        
        // STEP 3: Permanently delete User from database
        userRepository.delete(user);
        entityManager.flush(); // Force immediate commit of user deletion
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
     * Only sets isActive to true. Does not modify suspension status.
     * Use unsuspendUser() separately if suspension should be removed.
     */
    @Transactional
    public User enableLogin(Long userId, String reason) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Don't enable if banned
        if (user.isBanned()) {
            throw new IllegalArgumentException("Cannot enable login for banned user. Unban first.");
        }
        
        // Don't enable if suspended - suspension must be removed explicitly
        if (user.isSuspended()) {
            throw new IllegalArgumentException("Cannot enable login for suspended user. Unsuspend first.");
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

    // ========== Expert Management Methods ==========

    /**
     * Verify an expert profile
     * 
     * Behavior:
     * - Sets ExpertProfile.isVerified = true
     * - Sets verifiedAt and verifiedBy fields
     * - Expert gains access to expert features
     * - User role remains EXPERT
     * 
     * Purpose:
     * - Admin approval of expert application
     * - Grants expert privileges
     * - Expert can now use expert features
     * 
     * Audit: Logs EXPERT_VERIFY action with metadata
     */
    @Transactional
    public ExpertProfile verifyExpert(Long expertId, String reason) {
        ExpertProfile profile = expertProfileRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Expert profile not found"));
        
        Boolean previousStatus = profile.getIsVerified();
        profile.setIsVerified(true);
        profile.setVerifiedAt(LocalDateTime.now());
        profile.setVerifiedBy(getCurrentAdmin().getUsername());
        
        ExpertProfile savedProfile = expertProfileRepository.save(profile);
        
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("previousStatus", previousStatus);
        metadata.put("newStatus", true);
        metadata.put("expertUserId", profile.getUser().getId());
        metadata.put("expertUsername", profile.getUser().getUsername());
        logAction("EXPERT_VERIFY", "EXPERT", expertId, reason, metadata);
        
        return savedProfile;
    }

    /**
     * Reject an expert profile - delete the profile and change user role to USER
     * 
     * IMPORTANT: This is an expert management action, NOT a user deletion.
     * 
     * Behavior:
     * 1. Deletes ExpertProfile completely (removes expert status)
     * 2. Changes user role from EXPERT → USER
     * 3. Keeps user active (isDeleted = false, isActive = true)
     * 
     * Purpose:
     * - User is not qualified as expert
     * - User remains a normal user in the system
     * - Can still use student features
     * - Expert profile is removed (not just deactivated)
     * 
     * Difference from Soft Delete:
     * - Soft Delete: User temporarily removed, expert data preserved
     * - Reject Expert: Expert status removed, user remains active
     * 
     * Audit: Logs EXPERT_REJECT action with metadata
     */
    @Transactional
    public void rejectExpert(Long expertId, String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("Reason is required for rejecting an expert");
        }
        
        ExpertProfile profile = expertProfileRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Expert profile not found"));
        
        // Get user info before deleting profile
        User expertUser = profile.getUser();
        Long expertUserId = expertUser.getId();
        String expertUsername = expertUser.getUsername();
        Boolean previousStatus = profile.getIsVerified();
        
        // STEP 1: Delete ExpertProfile completely
        // This removes expert status and all expert-related data
        expertProfileRepository.deleteById(profile.getId());
        entityManager.flush(); // Force immediate commit of deletion
        entityManager.clear(); // Clear persistence context
        
        // STEP 2: Change user role from EXPERT to USER
        // User remains active and can use system as regular user
        User managedUser = userRepository.findById(expertUserId)
                .orElseThrow(() -> new RuntimeException("User not found after profile deletion"));
        
        managedUser.setRole(Role.USER);
        // NOTE: User remains active (isDeleted = false, isActive = true)
        userRepository.save(managedUser);
        entityManager.flush(); // Ensure role change is committed
        
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("previousStatus", previousStatus);
        metadata.put("newStatus", "REJECTED");
        metadata.put("expertUserId", expertUserId);
        metadata.put("expertUsername", expertUsername);
        metadata.put("action", "REJECTED");
        metadata.put("roleChanged", "EXPERT -> USER");
        logAction("EXPERT_REJECT", "EXPERT", expertId, reason, metadata);
    }

    /**
     * Revoke verification from an expert
     * 
     * IMPORTANT: This removes verification but keeps the expert profile.
     * 
     * Behavior:
     * 1. Sets ExpertProfile.isVerified = false
     * 2. Clears verifiedAt and verifiedBy fields
     * 3. Keeps ExpertProfile record (for audit/history)
     * 4. User role remains EXPERT (but loses verified status)
     * 5. User remains active
     * 
     * Purpose:
     * - Expert loses verified status
     * - Expert profile history is preserved
     * - Expert can be re-verified later
     * - Maintains audit trail
     * 
     * Difference from Reject Expert:
     * - Revoke: Removes verification, keeps profile and EXPERT role
     * - Reject: Deletes profile, changes role to USER
     * 
     * Difference from Soft Delete:
     * - Revoke: Expert loses verification, account remains active
     * - Soft Delete: Account temporarily removed, expert data preserved
     * 
     * Audit: Logs EXPERT_REVOKE action with metadata
     */
    @Transactional
    public ExpertProfile revokeExpertVerification(Long expertId, String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new IllegalArgumentException("Reason is required for revoking expert verification");
        }
        
        ExpertProfile profile = expertProfileRepository.findById(expertId)
                .orElseThrow(() -> new RuntimeException("Expert profile not found"));
        
        if (!profile.getIsVerified()) {
            throw new IllegalArgumentException("Expert is not verified");
        }
        
        Boolean previousStatus = profile.getIsVerified();
        
        // Remove verification status but keep profile record
        profile.setIsVerified(false);
        profile.setVerifiedAt(null);
        profile.setVerifiedBy(null);
        
        // NOTE: ExpertProfile record is preserved for audit/history
        // NOTE: User role remains EXPERT (but isVerified = false)
        // NOTE: User remains active (isDeleted = false)
        
        ExpertProfile savedProfile = expertProfileRepository.save(profile);
        
        Map<String, Object> metadata = new HashMap<>();
        metadata.put("previousStatus", previousStatus);
        metadata.put("newStatus", false);
        metadata.put("expertUserId", profile.getUser().getId());
        metadata.put("expertUsername", profile.getUser().getUsername());
        metadata.put("action", "REVOKED");
        logAction("EXPERT_REVOKE", "EXPERT", expertId, reason, metadata);
        
        return savedProfile;
    }
}

