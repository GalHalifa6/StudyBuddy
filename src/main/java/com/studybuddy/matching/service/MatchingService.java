package com.studybuddy.matching.service;

import com.studybuddy.matching.dto.GroupMatchDto;
import com.studybuddy.feed.dto.MiniFeedDto;
import com.studybuddy.user.model.*;
import com.studybuddy.group.model.*;
import com.studybuddy.course.model.*;
import com.studybuddy.matching.model.*;
import com.studybuddy.matching.repository.CharacteristicProfileRepository;
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
 * Matching Service implementing Variance Reduction Algorithm
 * for psychological safety optimization.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MatchingService {
    
    private final CharacteristicProfileRepository profileRepository;
    private final StudyGroupRepository groupRepository;
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    
    /**
     * Find top matched groups using variance reduction algorithm.
     * 
     * Steps:
     * 1. Hard filters (course, availability, language)
     * 2. Calculate variance reduction for each candidate group
     * 3. Rank by lowest projected variance (most balanced team)
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
        
        // STEP 1: Hard Filters
        List<StudyGroup> candidateGroups = groupRepository.findAll().stream()
                .filter(group -> applyHardFilters(group, student, enrolledCourseIds))
                .collect(Collectors.toList());
        
        log.info("Found {} candidate groups after hard filters", candidateGroups.size());
        
        // STEP 2: Calculate match scores using variance reduction
        List<MiniFeedDto.GroupRecommendation> recommendations = candidateGroups.stream()
                .map(group -> calculateMatchScore(group, studentProfile))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(MiniFeedDto.GroupRecommendation::getMatchPercentage).reversed())
                .limit(10)
                .collect(Collectors.toList());
        
        return recommendations;
    }
    
    /**
     * Apply hard filters for group eligibility.
     */
    private boolean applyHardFilters(StudyGroup group, User student, Set<Long> enrolledCourseIds) {
        // Must be in same course
        if (group.getCourse() == null || !enrolledCourseIds.contains(group.getCourse().getId())) {
            return false;
        }
        
        // Must have capacity
        int currentSize = group.getMembers() != null ? group.getMembers().size() : 0;
        if (currentSize >= group.getMaxSize()) {
            return false;
        }
        
        // Student must not already be a member
        if (group.getMembers() != null && group.getMembers().stream()
                .anyMatch(m -> m.getId().equals(student.getId()))) {
            return false;
        }
        
        // Must be open or approval-based (not private)
        if ("PRIVATE".equals(group.getVisibility())) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Calculate match score using Variance Reduction Algorithm.
     */
    private MiniFeedDto.GroupRecommendation calculateMatchScore(StudyGroup group, 
                                                                 CharacteristicProfile studentProfile) {
        try {
            // Get profiles of all current members
            List<CharacteristicProfile> memberProfiles = group.getMembers().stream()
                    .map(member -> profileRepository.findByUserId(member.getId()))
                    .filter(Optional::isPresent)
                    .map(Optional::get)
                    .collect(Collectors.toList());
            
            if (memberProfiles.isEmpty()) {
                // New group, no variance yet
                return buildRecommendation(group, studentProfile, 0.0, 0.0, 0.5, 
                        "New group - be a founding member!");
            }
            
            // Calculate current group variance
            Map<RoleType, Double> currentGroupProfile = calculateAverageProfile(memberProfiles);
            double currentVariance = calculateVariance(currentGroupProfile);
            
            // Calculate projected variance with student added
            List<CharacteristicProfile> projectedProfiles = new ArrayList<>(memberProfiles);
            projectedProfiles.add(studentProfile);
            Map<RoleType, Double> projectedGroupProfile = calculateAverageProfile(projectedProfiles);
            double projectedVariance = calculateVariance(projectedGroupProfile);
            
            // Calculate match score
            double varianceReduction = currentVariance - projectedVariance;
            double matchScore = calculateMatchScoreFromVariance(varianceReduction, currentVariance);
            String matchReason = generateMatchReason(studentProfile, currentGroupProfile, varianceReduction);
            
            return buildRecommendation(group, studentProfile, currentVariance, 
                    projectedVariance, matchScore, matchReason);
            
        } catch (Exception e) {
            log.error("Error calculating match score for group {}: {}", group.getId(), e.getMessage());
            return null;
        }
    }
    
    /**
     * Calculate average profile across all members.
     */
    private Map<RoleType, Double> calculateAverageProfile(List<CharacteristicProfile> profiles) {
        Map<RoleType, Double> average = new HashMap<>();
        
        for (RoleType role : RoleType.values()) {
            double sum = profiles.stream()
                    .mapToDouble(p -> p.getRoleScore(role))
                    .sum();
            average.put(role, sum / profiles.size());
        }
        
        return average;
    }
    
    /**
     * Calculate variance (standard deviation) of profile.
     * Lower variance = more balanced/uniform team.
     */
    private double calculateVariance(Map<RoleType, Double> profile) {
        double mean = profile.values().stream()
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
        
        double variance = profile.values().stream()
                .mapToDouble(score -> Math.pow(score - mean, 2))
                .average()
                .orElse(0.0);
        
        return Math.sqrt(variance); // Standard deviation
    }
    
    /**
     * Convert variance reduction to match score (0.0 to 1.0).
     */
    private double calculateMatchScoreFromVariance(double varianceReduction, double currentVariance) {
        if (currentVariance == 0.0) {
            return 0.5; // Neutral
        }
        
        double normalizedReduction = varianceReduction / currentVariance;
        double score = 0.5 + (normalizedReduction * 0.5);
        
        return Math.max(0.0, Math.min(1.0, score));
    }
    
    /**
     * Generate match quality description based on score.
     */
    private String generateMatchReason(CharacteristicProfile studentProfile, 
                                       Map<RoleType, Double> groupProfile,
                                       double varianceReduction) {
        if (varianceReduction > 0.05) {
            return "Highly compatible - complements team strengths";
        } else if (varianceReduction > 0) {
            return "Good compatibility - maintains team balance";
        } else if (varianceReduction > -0.05) {
            return "Moderate compatibility";
        } else {
            return "Lower compatibility - overlapping profiles";
        }
    }
    
    /**
     * Build recommendation DTO.
     */
    private MiniFeedDto.GroupRecommendation buildRecommendation(StudyGroup group,
                                                                 CharacteristicProfile studentProfile,
                                                                 double currentVariance,
                                                                 double projectedVariance,
                                                                 double matchScore,
                                                                 String matchReason) {
        int currentSize = group.getMembers() != null ? group.getMembers().size() : 0;
        
        // Convert match score (0.0-1.0) to percentage (0-100)
        int matchPercentage = (int) Math.round(matchScore * 100);
        
        return MiniFeedDto.GroupRecommendation.builder()
                .groupId(group.getId())
                .groupName(group.getName())
                .courseName(group.getCourse() != null ? group.getCourse().getName() : "N/A")
                .currentSize(currentSize)
                .maxSize(group.getMaxSize())
                .matchPercentage(matchPercentage)
                .matchReason(matchReason)
                .currentVariance(currentVariance)
                .projectedVariance(projectedVariance)
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
        
        // Get all groups from enrolled courses
        List<StudyGroup> allGroups = groupRepository.findAll().stream()
                .filter(group -> {
                    // Must be in enrolled course
                    if (group.getCourse() == null || !enrolledCourseIds.contains(group.getCourse().getId())) {
                        return false;
                    }
                    
                    // Exclude groups where user is already a member
                    if (group.getMembers() != null && 
                        group.getMembers().stream().anyMatch(member -> member.getId().equals(student.getId()))) {
                        return false;
                    }
                    
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
        
        log.info("Found {} groups after applying filters", allGroups.size());
        
        // Calculate match scores for all groups
        return allGroups.stream()
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
            
            // Calculate match percentage
            int matchPercentage = 50; // Default
            String matchReason = "Standard compatibility";
            Double currentVariance = null;
            Double projectedVariance = null;
            
            if (studentProfile != null && !isMember) {
                // Get profiles of all current members
                List<CharacteristicProfile> memberProfiles = group.getMembers().stream()
                        .map(member -> profileRepository.findByUserId(member.getId()))
                        .filter(Optional::isPresent)
                        .map(Optional::get)
                        .collect(Collectors.toList());
                
                if (memberProfiles.isEmpty()) {
                    // New group
                    matchPercentage = 75;
                    matchReason = "New group - be a founding member!";
                } else {
                    // Calculate variance-based score
                    Map<RoleType, Double> currentGroupProfile = calculateAverageProfile(memberProfiles);
                    currentVariance = calculateVariance(currentGroupProfile);
                    
                    List<CharacteristicProfile> projectedProfiles = new ArrayList<>(memberProfiles);
                    projectedProfiles.add(studentProfile);
                    Map<RoleType, Double> projectedGroupProfile = calculateAverageProfile(projectedProfiles);
                    projectedVariance = calculateVariance(projectedGroupProfile);
                    
                    double varianceReduction = currentVariance - projectedVariance;
                    double matchScore = calculateMatchScoreFromVariance(varianceReduction, currentVariance);
                    matchPercentage = (int) Math.round(matchScore * 100);
                    matchReason = generateMatchReason(studentProfile, currentGroupProfile, varianceReduction);
                }
            } else if (isMember) {
                matchPercentage = 100;
                matchReason = "You are a member of this group";
            }
            
            // Apply adjustments based on group characteristics
            matchPercentage = applyGroupCharacteristicAdjustments(matchPercentage, group, currentSize, isMember);
            
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
                    .currentVariance(currentVariance)
                    .projectedVariance(projectedVariance)
                    .createdAt(group.getCreatedAt() != null ? group.getCreatedAt().toString() : null)
                    .build();
                    
        } catch (Exception e) {
            log.error("Error calculating match for group {}: {}", group.getId(), e.getMessage());
            return null;
        }
    }
    
    /**
     * Apply adjustments based on group characteristics.
     */
    private int applyGroupCharacteristicAdjustments(int baseScore, StudyGroup group, 
                                                     int currentSize, boolean isMember) {
        int adjustedScore = baseScore;
        
        // If already a member, cap at 100
        if (isMember) {
            return 100;
        }
        
        // Availability adjustment
        double fillPercentage = (double) currentSize / group.getMaxSize();
        if (fillPercentage >= 1.0) {
            adjustedScore -= 30; // Full groups less appealing
        } else if (fillPercentage > 0.8) {
            adjustedScore -= 10; // Almost full
        } else if (fillPercentage < 0.3 && currentSize > 0) {
            adjustedScore += 5; // Plenty of space
        }
        
        // Visibility adjustment
        if ("OPEN".equalsIgnoreCase(group.getVisibility())) {
            adjustedScore += 5; // Easy to join
        } else if ("PRIVATE".equalsIgnoreCase(group.getVisibility())) {
            adjustedScore -= 20; // Hard to join
        }
        
        // Size preference adjustment
        if (group.getMaxSize() <= 6) {
            adjustedScore += 5; // Intimate groups
        } else if (group.getMaxSize() > 15) {
            adjustedScore -= 5; // Very large groups
        }
        
        return Math.max(10, Math.min(100, adjustedScore));
    }
}
