package com.studybuddy.matching.service;

import com.studybuddy.group.model.StudyGroup;
import com.studybuddy.group.repository.StudyGroupRepository;
import com.studybuddy.matching.model.CharacteristicProfile;
import com.studybuddy.matching.model.GroupCharacteristicProfile;
import com.studybuddy.matching.repository.CharacteristicProfileRepository;
import com.studybuddy.matching.repository.GroupCharacteristicProfileRepository;
import com.studybuddy.user.model.RoleType;
import com.studybuddy.user.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Service for calculating and managing GroupCharacteristicProfiles.
 * Provides pre-computed group profiles for efficient matching.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GroupProfileCalculationService {

    private final GroupCharacteristicProfileRepository groupProfileRepository;
    private final StudyGroupRepository groupRepository;
    private final CharacteristicProfileRepository profileRepository;

    /**
     * Create initial group profile when a new group is created.
     * The creator is the only member at this point.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void createInitialGroupProfile(Long groupId, Long creatorId) {
        log.info("Creating initial profile for group {} with creator {}", groupId, creatorId);

        try {
            // Check if profile already exists
            if (groupProfileRepository.findByGroupId(groupId).isPresent()) {
                log.warn("Profile already exists for group {}, skipping creation", groupId);
                return;
            }

            // Get creator's profile
            Optional<CharacteristicProfile> creatorProfile = profileRepository.findByUserId(creatorId);
            
            GroupCharacteristicProfile groupProfile = GroupCharacteristicProfile.builder()
                .groupId(groupId)
                .currentVariance(0.0)
                .memberCount(creatorProfile.isPresent() ? 1 : 0)
                .lastUpdatedAt(LocalDateTime.now())
                .build();

            // Initialize with creator's scores if available
            if (creatorProfile.isPresent()) {
                CharacteristicProfile profile = creatorProfile.get();
                for (RoleType role : RoleType.values()) {
                    groupProfile.setAverageRoleScore(role, profile.getRoleScore(role));
                }
                // Variance is 0 for single member
                groupProfile.setCurrentVariance(0.0);
            } else {
                // No profile yet, initialize with zeros
                for (RoleType role : RoleType.values()) {
                    groupProfile.setAverageRoleScore(role, 0.0);
                }
                groupProfile.setCurrentVariance(0.0);
            }

            groupProfileRepository.save(groupProfile);
            log.info("Created initial profile for group {} with {} members", groupId, groupProfile.getMemberCount());
            
        } catch (Exception e) {
            log.error("Failed to create initial profile for group {}: {}", groupId, e.getMessage(), e);
        }
    }

    /**
     * Recalculate group profile based on current members.
     * Called when members join, leave, or update their profiles.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recalculateGroupProfile(Long groupId) {
        log.info("Recalculating profile for group {}", groupId);

        try {
            // Get the group with members
            Optional<StudyGroup> groupOpt = groupRepository.findById(groupId);
            if (groupOpt.isEmpty()) {
                log.warn("Group {} not found, cannot recalculate profile", groupId);
                return;
            }

            StudyGroup group = groupOpt.get();
            Set<User> members = group.getMembers();

            if (members == null || members.isEmpty()) {
                log.info("Group {} has no members, setting default profile", groupId);
                updateOrCreateProfile(groupId, new HashMap<>(), 0.0, 0);
                return;
            }

            // Get all member profiles
            List<CharacteristicProfile> memberProfiles = new ArrayList<>();
            for (User member : members) {
                profileRepository.findByUserId(member.getId()).ifPresent(memberProfiles::add);
            }

            if (memberProfiles.isEmpty()) {
                log.info("Group {} has no members with profiles, setting default profile", groupId);
                updateOrCreateProfile(groupId, new HashMap<>(), 0.0, 0);
                return;
            }

            // Calculate average scores for each role
            Map<RoleType, Double> averageScores = new HashMap<>();
            for (RoleType role : RoleType.values()) {
                double sum = 0.0;
                for (CharacteristicProfile profile : memberProfiles) {
                    sum += profile.getRoleScore(role);
                }
                averageScores.put(role, sum / memberProfiles.size());
            }

            // Calculate variance
            double variance = calculateVariance(memberProfiles, averageScores);

            // Update or create profile
            updateOrCreateProfile(groupId, averageScores, variance, memberProfiles.size());
            
            log.info("Recalculated profile for group {} with {} members, variance: {}", 
                    groupId, memberProfiles.size(), variance);
                    
        } catch (Exception e) {
            log.error("Failed to recalculate profile for group {}: {}", groupId, e.getMessage(), e);
        }
    }

    /**
     * Recalculate all groups that a user is a member of.
     * Called when a user's profile is updated.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recalculateGroupsForUser(Long userId) {
        log.info("Recalculating profiles for all groups of user {}", userId);

        try {
            List<GroupCharacteristicProfile> userGroupProfiles = groupProfileRepository.findByMemberUserId(userId);
            
            log.info("Found {} groups for user {}", userGroupProfiles.size(), userId);
            
            for (GroupCharacteristicProfile groupProfile : userGroupProfiles) {
                recalculateGroupProfile(groupProfile.getGroupId());
            }
            
        } catch (Exception e) {
            log.error("Failed to recalculate groups for user {}: {}", userId, e.getMessage(), e);
        }
    }

    /**
     * Calculate variance of role scores across members.
     * Lower variance = more balanced group.
     */
    private double calculateVariance(List<CharacteristicProfile> profiles, Map<RoleType, Double> averages) {
        if (profiles.size() <= 1) {
            return 0.0;
        }

        double totalVariance = 0.0;
        int roleCount = RoleType.values().length;

        for (RoleType role : RoleType.values()) {
            double mean = averages.get(role);
            double sumSquaredDiff = 0.0;

            for (CharacteristicProfile profile : profiles) {
                double diff = profile.getRoleScore(role) - mean;
                sumSquaredDiff += diff * diff;
            }

            totalVariance += sumSquaredDiff / profiles.size();
        }

        return totalVariance / roleCount;
    }

    /**
     * Update existing profile or create new one.
     */
    private void updateOrCreateProfile(Long groupId, Map<RoleType, Double> averageScores, 
                                      Double variance, Integer memberCount) {
        GroupCharacteristicProfile profile = groupProfileRepository.findByGroupId(groupId)
            .orElse(GroupCharacteristicProfile.builder()
                .groupId(groupId)
                .build());

        // Set each role score individually
        for (RoleType role : RoleType.values()) {
            profile.setAverageRoleScore(role, averageScores.getOrDefault(role, 0.0));
        }
        
        profile.setCurrentVariance(variance);
        profile.setMemberCount(memberCount);
        profile.setLastUpdatedAt(LocalDateTime.now());

        groupProfileRepository.save(profile);
    }
}
