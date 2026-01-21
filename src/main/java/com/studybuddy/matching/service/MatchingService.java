package com.studybuddy.matching.service;

import com.studybuddy.matching.dto.GroupMatchDto;
import com.studybuddy.feed.dto.MiniFeedDto;
import com.studybuddy.user.model.*;
import com.studybuddy.group.model.*;
import com.studybuddy.course.model.*;
import com.studybuddy.matching.model.*;
import com.studybuddy.matching.repository.CharacteristicProfileRepository;
import com.studybuddy.matching.repository.GroupCharacteristicProfileRepository;
import com.studybuddy.course.repository.CourseRepository;
import com.studybuddy.group.repository.StudyGroupRepository;
import com.studybuddy.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Matching Service implementing Cosine Similarity Algorithm with Complementary Vectors.
 * Matches students with groups based on gap-filling: students who excel in roles
 * the group lacks receive higher match scores.
 * Uses pre-computed GroupCharacteristicProfiles for efficient matching.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingService {
    
    // Per-role target composition for balanced teams
    private static final Map<RoleType, Double> TARGET = Map.of(
        RoleType.TEAM_PLAYER, 0.7,
        RoleType.COMMUNICATOR, 0.7,
        RoleType.PLANNER, 0.6,
        RoleType.EXPERT, 0.6,
        RoleType.LEADER, 0.55,
        RoleType.CREATIVE, 0.5,
        RoleType.CHALLENGER, 0.45
    );
    
    private final CharacteristicProfileRepository profileRepository;
    private final GroupCharacteristicProfileRepository groupProfileRepository;
    private final StudyGroupRepository groupRepository;
    
    /**
     * Find top matched groups using cosine similarity with complementary vectors.
     */
    @Transactional(readOnly = true)
    public List<MiniFeedDto.GroupRecommendation> getTopGroups(User student) {
        log.info("Finding best group matches for student: {}", student.getId());
        
        // Get student's profile
        CharacteristicProfile studentProfile = profileRepository.findByUserId(student.getId())
                .orElse(null);
        
        if (studentProfile == null) {
            log.info("Student {} has no profile yet, returning empty matches", student.getId());
            return Collections.emptyList();
        }
        
        // Get student's enrolled courses
        Set<Long> enrolledCourseIds = student.getCourses().stream()
                .map(Course::getId)
                .collect(Collectors.toSet());
        
        if (enrolledCourseIds.isEmpty()) {
            log.info("Student {} not enrolled in any courses", student.getId());
            return Collections.emptyList();
        }
        
        // Fetch groups with database-level filtering (hard filters applied)
        List<StudyGroup> candidateGroups = groupRepository.findMatchableGroups(enrolledCourseIds, student.getId());
        
        log.info("Found {} candidate groups after database filtering", candidateGroups.size());
        
        // Batch fetch group profiles to avoid N+1 queries
        List<Long> groupIds = candidateGroups.stream()
                .map(StudyGroup::getId)
                .collect(Collectors.toList());
        
        Map<Long, GroupCharacteristicProfile> profileMap = groupProfileRepository.findByGroupIdIn(groupIds)
                .stream()
                .collect(Collectors.toMap(GroupCharacteristicProfile::getGroupId, gp -> gp));
        
        log.info("Batch loaded {} group profiles", profileMap.size());
        
        // Calculate match scores
        List<MiniFeedDto.GroupRecommendation> recommendations = candidateGroups.stream()
                .map(group -> calculateMatchScore(group, studentProfile, profileMap))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(MiniFeedDto.GroupRecommendation::getMatchPercentage).reversed())
                .limit(10)
                .collect(Collectors.toList());
        
        return recommendations;
    }
    
    /**
     * Calculate match score using gap-filling algorithm.
     */
    private MiniFeedDto.GroupRecommendation calculateMatchScore(StudyGroup group, 
                                                                 CharacteristicProfile studentProfile,
                                                                 Map<Long, GroupCharacteristicProfile> profileMap) {
        try {
            // Get pre-computed group profile from batch map
            Optional<GroupCharacteristicProfile> groupProfileOpt = 
                    Optional.ofNullable(profileMap.get(group.getId()));
            
            if (groupProfileOpt.isEmpty() || groupProfileOpt.get().getMemberCount() == 0) {
                // New group - base score + availability boost
                return buildRecommendation(group, newGroupScore(group), 
                        "New group - be a founding member!");
            }
            
            GroupCharacteristicProfile groupProfile = groupProfileOpt.get();
            
            // Ensure all roles are present in averages (fix #1)
            Map<RoleType, Double> currentAverages = new EnumMap<>(RoleType.class);
            for (RoleType r : RoleType.values()) currentAverages.put(r, 0.0);
            currentAverages.putAll(groupProfile.getAverageRoleScores());
            
            // Debug logging
            log.info("MATCH_DEBUG groupId={} name='{}' memberCount={} avgs={}",
                group.getId(),
                group.getName(),
                groupProfile.getMemberCount(),
                currentAverages);
            
            // Calculate raw gap-filling score
            double rawScore = calculateGapFillScore(studentProfile, currentAverages);
            
            // Add variance boost based on role diversity
            double diversityBonus = calculateDiversityBonus(studentProfile, currentAverages);
            double adjustedScore = clamp01(rawScore + diversityBonus * 0.15);
            
            // Expand range dramatically: map 0.3-0.7 input to 40-90% output
            // Use linear transformation with amplification
            double normalized = (adjustedScore - 0.3) / 0.4;  // Normalize 0.3-0.7 to 0-1
            normalized = clamp01(normalized);
            double display = 0.40 + 0.50 * normalized;  // Map to 40-90%
            
            // Log detailed breakdown
            log.info(">>> Group '{}': raw={} diversity={} adjusted={} display={}", 
                    group.getName(), 
                    String.format("%.3f", rawScore),
                    String.format("%.3f", diversityBonus),
                    String.format("%.3f", adjustedScore),
                    String.format("%.0f%%", display * 100));
            
            String matchReason = generateMatchReason(display);
            
            return buildRecommendation(group, display, matchReason);
            
        } catch (Exception e) {
            log.error("Error calculating match score for group {}: {}", group.getId(), e.getMessage());
            return null;
        }
    }
    
    /**
     * Calculate gap-filling score using need-weighted contribution.
     * Simpler version focused on actual complementarity.
     */
    private double calculateGapFillScore(CharacteristicProfile studentProfile,
                                        Map<RoleType, Double> groupAverages) {
        double totalFit = 0.0;
        int roleCount = RoleType.values().length;
        
        for (RoleType role : RoleType.values()) {
            double studentScore = clamp01(studentProfile.getRoleScore(role));
            double groupAvg = groupAverages.get(role);  // Safe now - always present
            double target = TARGET.getOrDefault(role, 0.6);
            
            // Calculate gap and how well student fills it
            double gap = Math.max(0.0, target - groupAvg);
            double contribution = studentScore * gap;
            
            // Weight by importance (larger gaps matter more)
            totalFit += contribution * (1.0 + gap);
        }
        
        log.debug("Gap-fill totalFit={}", totalFit);
        return totalFit;  // Return unnormalized raw score for better differentiation
    }
    
    /**
     * Calculate diversity bonus - rewards having different strengths than the group.
     */
    private double calculateDiversityBonus(CharacteristicProfile studentProfile,
                                          Map<RoleType, Double> groupAverages) {
        double totalDifference = 0.0;
        
        for (RoleType role : RoleType.values()) {
            double studentScore = clamp01(studentProfile.getRoleScore(role));
            double groupAvg = groupAverages.get(role);  // Safe now - always present
            
            // Bonus if student is strong where group is weak
            if (studentScore > groupAvg + 0.15) {
                totalDifference += (studentScore - groupAvg);
            }
        }
        
        return totalDifference;  // Return unnormalized - no artificial compression
    }
    
    /**
     * Clamp value to [0, 1] range.
     */
    private static double clamp01(double x) {
        return Math.max(0.0, Math.min(1.0, x));
    }
    
    /**
     * Calculate consistent score for new/empty groups.
     */
    private double newGroupScore(StudyGroup group) {
        double base = 0.55;
        int currentSize = group.getMembers() != null ? group.getMembers().size() : 0;
        double availabilityBoost = group.getMaxSize() > 0
                ? 0.15 * (1.0 - (currentSize / (double) group.getMaxSize()))
                : 0.0;
        return clamp01(base + availabilityBoost);
    }
    
    /**
     * Generate match quality description based on gap-filling score.
     */
    private String generateMatchReason(double gapFillScore) {
        if (gapFillScore >= 0.80) {
            return "Perfect fit - you complete this team!";
        } else if (gapFillScore >= 0.65) {
            return "Excellent match - fills key gaps in the group";
        } else if (gapFillScore >= 0.50) {
            return "Good match - complements team strengths";
        } else if (gapFillScore >= 0.40) {
            return "Moderate match - some overlapping roles";
        } else {
            return "Different strengths - group already strong in your areas";
        }
    }
    
    /**
     * Build recommendation DTO.
     */
    private MiniFeedDto.GroupRecommendation buildRecommendation(StudyGroup group,
                                                                 double matchScore,
                                                                 String matchReason) {
        int currentSize = group.getMembers() != null ? group.getMembers().size() : 0;
        int matchPercentage = (int) Math.round(matchScore * 100);
        
        return MiniFeedDto.GroupRecommendation.builder()
                .groupId(group.getId())
                .groupName(group.getName())
                .courseName(group.getCourse() != null ? group.getCourse().getName() : "N/A")
                .currentSize(currentSize)
                .maxSize(group.getMaxSize())
                .matchPercentage(matchPercentage)
                .matchReason(matchReason)
                .build();
    }
    
    /**
     * Get all matched groups with filters (for browse page).
     */
    @Transactional(readOnly = true)
    public List<GroupMatchDto> getAllMatchedGroups(User student, Long courseId, 
                                                    String visibility, String availability) {
        log.info("Finding all group matches for student: {} with filters", student.getId());
        
        // Get student's profile
        CharacteristicProfile studentProfile = profileRepository.findByUserId(student.getId())
                .orElse(null);
        
        // Get student's enrolled courses
        Set<Long> enrolledCourseIds = student.getCourses().stream()
                .map(Course::getId)
                .collect(Collectors.toSet());
        
        if (enrolledCourseIds.isEmpty()) {
            log.info("Student {} not enrolled in any courses", student.getId());
            return Collections.emptyList();
        }
        
        // Get base matchable groups from database (applies core hard filters)
        List<StudyGroup> allGroups = groupRepository.findMatchableGroups(enrolledCourseIds, student.getId());
        
        // Apply additional optional filters in-memory
        List<StudyGroup> filteredGroups = allGroups.stream()
                .filter(group -> {
                    // Apply course filter if specified
                    if (courseId != null && !courseId.equals(group.getCourse().getId())) {
                        return false;
                    }
                    
                    // Apply visibility filter if specified
                    if (visibility != null && !visibility.equalsIgnoreCase("all")) {
                        if (!visibility.equalsIgnoreCase(group.getVisibility())) {
                            return false;
                        }
                    }
                    
                    // Apply availability filter if specified
                    if (availability != null && !availability.equalsIgnoreCase("all")) {
                        int currentSize = group.getMembers() != null ? group.getMembers().size() : 0;
                        boolean isFull = currentSize >= group.getMaxSize();
                        
                        if (availability.equalsIgnoreCase("available") && isFull) {
                            return false;
                        }
                        if (availability.equalsIgnoreCase("full") && !isFull) {
                            return false;
                        }
                    }
                    
                    return true;
                })
                .collect(Collectors.toList());
        
        log.info("Found {} groups after applying filters", filteredGroups.size());
        
        // Batch fetch group profiles to avoid N+1 queries
        List<Long> groupIds = filteredGroups.stream()
                .map(StudyGroup::getId)
                .collect(Collectors.toList());
        
        Map<Long, GroupCharacteristicProfile> profileMap = groupProfileRepository.findByGroupIdIn(groupIds)
                .stream()
                .collect(Collectors.toMap(GroupCharacteristicProfile::getGroupId, gp -> gp));
        
        log.info("Batch loaded {} group profiles", profileMap.size());
        
        // Calculate match scores for all groups
        return filteredGroups.stream()
                .map(group -> calculateGroupMatchDto(group, student, studentProfile, profileMap))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }
    
    /**
     * Get match score for a specific group.
     */
    @Transactional(readOnly = true)
    public GroupMatchDto getGroupMatchScore(User student, Long groupId) {
        StudyGroup group = groupRepository.findById(groupId).orElse(null);
        if (group == null) {
            return null;
        }
        
        CharacteristicProfile studentProfile = profileRepository.findByUserId(student.getId())
                .orElse(null);
        
        // Single lookup - no batch map
        return calculateGroupMatchDto(group, student, studentProfile, null);
    }
    
    /**
     * Calculate full GroupMatchDto with all details.
     * 
     * @param profileMap Optional batch-loaded profiles map. If null, will fetch individually.
     */
    private GroupMatchDto calculateGroupMatchDto(StudyGroup group, User student, 
                                                  CharacteristicProfile studentProfile,
                                                  Map<Long, GroupCharacteristicProfile> profileMap) {
        try {
            int currentSize = group.getMembers() != null ? group.getMembers().size() : 0;
            boolean isMember = group.getMembers() != null && 
                    group.getMembers().stream().anyMatch(m -> m.getId().equals(student.getId()));
            
            int matchPercentage;
            String matchReason;
            
            if (isMember) {
                matchPercentage = 100;
                matchReason = "You are a member of this group";
            } else if (studentProfile == null) {
                matchPercentage = 50;
                matchReason = "Complete your profile quiz for accurate matching";
            } else {
                // Get group profile - from batch map if available, otherwise fetch individually
                Optional<GroupCharacteristicProfile> groupProfileOpt;
                if (profileMap != null) {
                    groupProfileOpt = Optional.ofNullable(profileMap.get(group.getId()));
                } else {
                    groupProfileOpt = groupProfileRepository.findByGroupId(group.getId());
                }
                
                if (groupProfileOpt.isEmpty() || groupProfileOpt.get().getMemberCount() == 0) {
                    matchPercentage = (int) Math.round(newGroupScore(group) * 100);
                    matchReason = "New group - be a founding member!";
                } else {
                    GroupCharacteristicProfile groupProfile = groupProfileOpt.get();
                    Map<RoleType, Double> currentAverages = groupProfile.getAverageRoleScores();
                    
                    double gapFillScore = calculateGapFillScore(studentProfile, currentAverages);
                    
                    // Apply reliability-aware blending
                    double reliability = clamp01(studentProfile.getReliabilityPercentage() != null 
                            ? studentProfile.getReliabilityPercentage() : 0.0);
                    double neutralBase = 0.55;
                    double blended = neutralBase + reliability * (gapFillScore - neutralBase);
                    
                    // Apply display curve with floor (20%)
                    double display = 0.20 + 0.80 * Math.pow(blended, 0.75);
                    
                    matchPercentage = (int) Math.round(display * 100);
                    matchReason = generateMatchReason(display);
                }
            }
            
            return GroupMatchDto.builder()
                    .groupId(group.getId())
                    .groupName(group.getName())
                    .description(group.getDescription())
                    .topic(group.getTopic())
                    .visibility(group.getVisibility())
                    .courseId(group.getCourse() != null ? group.getCourse().getId() : null)
                    .courseName(group.getCourse() != null ? group.getCourse().getName() : null)
                    .courseCode(group.getCourse() != null ? group.getCourse().getCode() : null)
                    .currentSize(currentSize)
                    .maxSize(group.getMaxSize())
                    .matchPercentage(matchPercentage)
                    .matchReason(matchReason)
                    .isMember(isMember)
                    .hasPendingRequest(false) // TODO: Check pending requests
                    .createdAt(group.getCreatedAt() != null ? group.getCreatedAt().toString() : null)
                    .build();
                    
        } catch (Exception e) {
            log.error("Error calculating match for group {}: {}", group.getId(), e.getMessage());
            return null;
        }
    }
}
