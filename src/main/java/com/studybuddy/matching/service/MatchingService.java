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
        
        // Calculate match scores using variance reduction
        List<MiniFeedDto.GroupRecommendation> recommendations = candidateGroups.stream()
                .map(group -> calculateMatchScore(group, studentProfile))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(MiniFeedDto.GroupRecommendation::getMatchPercentage).reversed())
                .limit(10)
                .collect(Collectors.toList());
        
        return recommendations;
    }
    
    /**
     * Calculate match score using cosine similarity with complementary vector.
     */
    private MiniFeedDto.GroupRecommendation calculateMatchScore(StudyGroup group, 
                                                                 CharacteristicProfile studentProfile) {
        try {
            // Get pre-computed group profile
            Optional<GroupCharacteristicProfile> groupProfileOpt = groupProfileRepository.findByGroupId(group.getId());
            
            if (groupProfileOpt.isEmpty() || groupProfileOpt.get().getMemberCount() == 0) {
                // New group - encourage joining
                return buildRecommendation(group, 0.75, "New group - be a founding member!");
            }
            
            GroupCharacteristicProfile groupProfile = groupProfileOpt.get();
            Map<RoleType, Double> currentAverages = groupProfile.getAverageRoleScores();
            
            // Calculate cosine similarity between student and group's complementary vector
            double cosineSimilarity = calculateCosineSimilarity(studentProfile, currentAverages);
            String matchReason = generateMatchReason(cosineSimilarity);
            
            return buildRecommendation(group, cosineSimilarity, matchReason);
            
        } catch (Exception e) {
            log.error("Error calculating match score for group {}: {}", group.getId(), e.getMessage());
            return null;
        }
    }
    
    /**
     * Calculate cosine similarity between student profile and group's complementary vector.
     * Complementary vector = (1.0 - avg_role1, 1.0 - avg_role2, ..., 1.0 - avg_role7)
     * 
     * This measures how well the student fills the gaps in the group.
     * High score = student excels in roles the group lacks
     * Low score = student overlaps with group's existing strengths
     */
    private double calculateCosineSimilarity(CharacteristicProfile studentProfile,
                                            Map<RoleType, Double> groupAverages) {
        // Build complementary vector: what the group is missing
        Map<RoleType, Double> complementaryVector = new HashMap<>();
        for (RoleType role : RoleType.values()) {
            double groupAvg = groupAverages.getOrDefault(role, 0.0);
            complementaryVector.put(role, 1.0 - groupAvg);
        }
        
        // Calculate dot product
        double dotProduct = 0.0;
        for (RoleType role : RoleType.values()) {
            double studentScore = studentProfile.getRoleScore(role);
            double complementaryScore = complementaryVector.get(role);
            dotProduct += studentScore * complementaryScore;
        }
        
        // Calculate magnitudes
        double studentMagnitude = 0.0;
        double complementaryMagnitude = 0.0;
        
        for (RoleType role : RoleType.values()) {
            double studentScore = studentProfile.getRoleScore(role);
            double complementaryScore = complementaryVector.get(role);
            studentMagnitude += studentScore * studentScore;
            complementaryMagnitude += complementaryScore * complementaryScore;
        }
        
        studentMagnitude = Math.sqrt(studentMagnitude);
        complementaryMagnitude = Math.sqrt(complementaryMagnitude);
        
        // Handle edge cases
        if (studentMagnitude == 0.0 || complementaryMagnitude == 0.0) {
            return 0.0;
        }
        
        // Cosine similarity: cos(θ) = (A·B) / (||A|| * ||B||)
        double cosineSim = dotProduct / (studentMagnitude * complementaryMagnitude);
        
        // Clamp to [0, 1] range (should already be in this range, but ensure it)
        return Math.max(0.0, Math.min(1.0, cosineSim));
    }
    
    /**
     * Generate match quality description based on cosine similarity score.
     */
    private String generateMatchReason(double cosineSimilarity) {
        if (cosineSimilarity >= 0.85) {
            return "Perfect fit - you complete this team!";
        } else if (cosineSimilarity >= 0.70) {
            return "Excellent match - fills key gaps in the group";
        } else if (cosineSimilarity >= 0.55) {
            return "Good match - complements team strengths";
        } else if (cosineSimilarity >= 0.40) {
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
        
        // Calculate match scores for all groups
        return filteredGroups.stream()
                .map(group -> calculateGroupMatchDto(group, student, studentProfile))
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
        
        return calculateGroupMatchDto(group, student, studentProfile);
    }
    
    /**
     * Calculate full GroupMatchDto with all details.
     */
    private GroupMatchDto calculateGroupMatchDto(StudyGroup group, User student, 
                                                  CharacteristicProfile studentProfile) {
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
                // Get pre-computed group profile
                Optional<GroupCharacteristicProfile> groupProfileOpt = 
                    groupProfileRepository.findByGroupId(group.getId());
                
                if (groupProfileOpt.isEmpty() || groupProfileOpt.get().getMemberCount() == 0) {
                    matchPercentage = 75;
                    matchReason = "New group - be a founding member!";
                } else {
                    GroupCharacteristicProfile groupProfile = groupProfileOpt.get();
                    Map<RoleType, Double> currentAverages = groupProfile.getAverageRoleScores();
                    
                    double cosineSimilarity = calculateCosineSimilarity(studentProfile, currentAverages);
                    matchPercentage = (int) Math.round(cosineSimilarity * 100);
                    matchReason = generateMatchReason(cosineSimilarity);
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
