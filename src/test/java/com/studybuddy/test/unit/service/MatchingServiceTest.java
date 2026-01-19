package com.studybuddy.test.unit.service;

import com.studybuddy.course.model.Course;
import com.studybuddy.feed.dto.MiniFeedDto;
import com.studybuddy.group.model.StudyGroup;
import com.studybuddy.group.repository.StudyGroupRepository;
import com.studybuddy.matching.dto.GroupMatchDto;
import com.studybuddy.matching.model.CharacteristicProfile;
import com.studybuddy.matching.model.GroupCharacteristicProfile;
import com.studybuddy.matching.repository.CharacteristicProfileRepository;
import com.studybuddy.matching.repository.GroupCharacteristicProfileRepository;
import com.studybuddy.matching.service.MatchingService;
import com.studybuddy.user.model.RoleType;
import com.studybuddy.user.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for MatchingService.
 * Tests the cosine similarity algorithm with complementary vectors.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("MatchingService - Cosine Similarity Tests")
class MatchingServiceTest {

    @Mock
    private CharacteristicProfileRepository profileRepository;

    @Mock
    private GroupCharacteristicProfileRepository groupProfileRepository;

    @Mock
    private StudyGroupRepository groupRepository;

    @InjectMocks
    private MatchingService matchingService;

    @BeforeEach
    void setUp() {
        // Fresh setup for each test
    }

    /**
     * Test 1: Student with no profile returns empty recommendations
     */
    @Test
    @DisplayName("Should return empty list when student has no profile")
    void shouldReturnEmptyWhenNoProfile() {
        // Given
        User student = new User();
        student.setId(1L);
        student.setCourses(new HashSet<>());
        
        when(profileRepository.findByUserId(1L)).thenReturn(Optional.empty());
        
        // When
        List<MiniFeedDto.GroupRecommendation> result = matchingService.getTopGroups(student);
        
        // Then
        assertThat(result).isEmpty();
        verify(profileRepository).findByUserId(1L);
        verifyNoInteractions(groupRepository);
    }
    
    /**
     * Test 2: Student with no enrolled courses returns empty
     */
    @Test
    @DisplayName("Should return empty list when student has no courses")
    void shouldReturnEmptyWhenNoCourses() {
        // Given
        User student = new User();
        student.setId(1L);
        student.setCourses(new HashSet<>()); // No courses
        
        CharacteristicProfile profile = new CharacteristicProfile();
        profile.setUser(student);
        
        when(profileRepository.findByUserId(1L)).thenReturn(Optional.of(profile));
        
        // When
        List<MiniFeedDto.GroupRecommendation> result = matchingService.getTopGroups(student);
        
        // Then
        assertThat(result).isEmpty();
        verify(profileRepository).findByUserId(1L);
        verifyNoInteractions(groupRepository);
    }
    
    /**
     * Test 3: Perfect complementary match - group lacks what student has
     * Group: (1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0) - missing CHALLENGER
     * Student: (0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0) - strong CHALLENGER
     * Complementary: (0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0)
     * Cosine similarity = 1.0 → 100% match
     */
    @Test
    @DisplayName("Should give 100% match for perfect complementary student")
    void shouldGive100PercentForPerfectComplement() {
        // Given
        User student = new User();
        student.setId(1L);
        
        Course course = new Course();
        course.setId(1L);
        course.setName("CS101");
        student.setCourses(Set.of(course));
        
        // Student profile: specialist in CHALLENGER (last role)
        CharacteristicProfile studentProfile = new CharacteristicProfile();
        studentProfile.setUser(student);
        studentProfile.setRoleScore(RoleType.LEADER, 0.0);
        studentProfile.setRoleScore(RoleType.PLANNER, 0.0);
        studentProfile.setRoleScore(RoleType.EXPERT, 0.0);
        studentProfile.setRoleScore(RoleType.CREATIVE, 0.0);
        studentProfile.setRoleScore(RoleType.COMMUNICATOR, 0.0);
        studentProfile.setRoleScore(RoleType.TEAM_PLAYER, 0.0);
        studentProfile.setRoleScore(RoleType.CHALLENGER, 1.0);
        
        // Group profile: saturated in all roles except CHALLENGER
        GroupCharacteristicProfile groupProfile = new GroupCharacteristicProfile();
        groupProfile.setGroupId(1L);
        groupProfile.setMemberCount(5);
        groupProfile.setAverageRoleScore(RoleType.LEADER, 1.0);
        groupProfile.setAverageRoleScore(RoleType.PLANNER, 1.0);
        groupProfile.setAverageRoleScore(RoleType.EXPERT, 1.0);
        groupProfile.setAverageRoleScore(RoleType.CREATIVE, 1.0);
        groupProfile.setAverageRoleScore(RoleType.COMMUNICATOR, 1.0);
        groupProfile.setAverageRoleScore(RoleType.TEAM_PLAYER, 1.0);
        groupProfile.setAverageRoleScore(RoleType.CHALLENGER, 0.0);
        
        StudyGroup group = new StudyGroup();
        group.setId(1L);
        group.setName("Perfect Group");
        group.setCourse(course);
        group.setMaxSize(10);
        group.setMembers(new HashSet<>());
        
        when(profileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        when(groupRepository.findMatchableGroups(Set.of(1L), 1L))
            .thenReturn(List.of(group));
        when(groupProfileRepository.findByGroupId(1L))
            .thenReturn(Optional.of(groupProfile));
        
        // When
        List<MiniFeedDto.GroupRecommendation> result = matchingService.getTopGroups(student);
        
        // Then
        assertThat(result).hasSize(1);
        MiniFeedDto.GroupRecommendation recommendation = result.get(0);
        assertThat(recommendation.getMatchPercentage()).isEqualTo(100);
        assertThat(recommendation.getMatchReason()).contains("Perfect fit");
    }
    
    /**
     * Test 4: Zero match when student overlaps with group strengths
     * Group: (1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0) - all LEADERS
     * Student: (1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0) - also LEADER
     * Complementary: (0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0)
     * Cosine similarity ≈ 0 → low match
     */
    @Test
    @DisplayName("Should give low match when student overlaps with group")
    void shouldGiveLowMatchForOverlap() {
        // Given
        User student = new User();
        student.setId(1L);
        
        Course course = new Course();
        course.setId(1L);
        course.setName("CS101");
        student.setCourses(Set.of(course));
        
        // Student profile: all LEADER
        CharacteristicProfile studentProfile = new CharacteristicProfile();
        studentProfile.setUser(student);
        studentProfile.setRoleScore(RoleType.LEADER, 1.0);
        studentProfile.setRoleScore(RoleType.PLANNER, 0.0);
        studentProfile.setRoleScore(RoleType.EXPERT, 0.0);
        studentProfile.setRoleScore(RoleType.CREATIVE, 0.0);
        studentProfile.setRoleScore(RoleType.COMMUNICATOR, 0.0);
        studentProfile.setRoleScore(RoleType.TEAM_PLAYER, 0.0);
        studentProfile.setRoleScore(RoleType.CHALLENGER, 0.0);
        
        // Group profile: also saturated in LEADER
        GroupCharacteristicProfile groupProfile = new GroupCharacteristicProfile();
        groupProfile.setGroupId(1L);
        groupProfile.setMemberCount(3);
        groupProfile.setAverageRoleScore(RoleType.LEADER, 1.0);
        groupProfile.setAverageRoleScore(RoleType.PLANNER, 0.0);
        groupProfile.setAverageRoleScore(RoleType.EXPERT, 0.0);
        groupProfile.setAverageRoleScore(RoleType.CREATIVE, 0.0);
        groupProfile.setAverageRoleScore(RoleType.COMMUNICATOR, 0.0);
        groupProfile.setAverageRoleScore(RoleType.TEAM_PLAYER, 0.0);
        groupProfile.setAverageRoleScore(RoleType.CHALLENGER, 0.0);
        
        StudyGroup group = new StudyGroup();
        group.setId(1L);
        group.setName("Leader Group");
        group.setCourse(course);
        group.setMaxSize(10);
        group.setMembers(new HashSet<>());
        
        when(profileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        when(groupRepository.findMatchableGroups(Set.of(1L), 1L))
            .thenReturn(List.of(group));
        when(groupProfileRepository.findByGroupId(1L))
            .thenReturn(Optional.of(groupProfile));
        
        // When
        List<MiniFeedDto.GroupRecommendation> result = matchingService.getTopGroups(student);
        
        // Then
        assertThat(result).hasSize(1);
        MiniFeedDto.GroupRecommendation recommendation = result.get(0);
        assertThat(recommendation.getMatchPercentage()).isLessThan(40);
        assertThat(recommendation.getMatchReason()).contains("already strong in your areas");
    }
    
    /**
     * Test 5: New group with no members gets 75% match
     */
    @Test
    @DisplayName("Should give 75% match for new groups")
    void shouldGive75PercentForNewGroups() {
        // Given
        User student = new User();
        student.setId(1L);
        
        Course course = new Course();
        course.setId(1L);
        course.setName("CS101");
        student.setCourses(Set.of(course));
        
        CharacteristicProfile studentProfile = new CharacteristicProfile();
        studentProfile.setUser(student);
        
        StudyGroup newGroup = new StudyGroup();
        newGroup.setId(1L);
        newGroup.setName("New Group");
        newGroup.setCourse(course);
        newGroup.setMaxSize(10);
        newGroup.setMembers(new HashSet<>());
        
        when(profileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        when(groupRepository.findMatchableGroups(Set.of(1L), 1L))
            .thenReturn(List.of(newGroup));
        when(groupProfileRepository.findByGroupId(1L))
            .thenReturn(Optional.empty()); // No profile yet
        
        // When
        List<MiniFeedDto.GroupRecommendation> result = matchingService.getTopGroups(student);
        
        // Then
        assertThat(result).hasSize(1);
        MiniFeedDto.GroupRecommendation recommendation = result.get(0);
        assertThat(recommendation.getMatchPercentage()).isEqualTo(75);
        assertThat(recommendation.getMatchReason()).contains("founding member");
    }
    
    /**
     * Test 6: getGroupMatchScore returns 100% when student is already a member
     */
    @Test
    @DisplayName("Should return 100% match when student is already a member")
    void shouldReturn100PercentWhenAlreadyMember() {
        // Given
        User student = new User();
        student.setId(1L);
        
        Course course = new Course();
        course.setId(1L);
        course.setName("CS101");
        
        StudyGroup group = new StudyGroup();
        group.setId(1L);
        group.setName("My Group");
        group.setCourse(course);
        group.setMaxSize(10);
        group.setMembers(Set.of(student)); // Student is member
        
        CharacteristicProfile studentProfile = new CharacteristicProfile();
        studentProfile.setUser(student);
        
        when(groupRepository.findById(1L)).thenReturn(Optional.of(group));
        when(profileRepository.findByUserId(1L)).thenReturn(Optional.of(studentProfile));
        
        // When
        GroupMatchDto result = matchingService.getGroupMatchScore(student, 1L);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.getMatchPercentage()).isEqualTo(100);
        assertThat(result.getMatchReason()).contains("member of this group");
        assertThat(result.getIsMember()).isTrue();
    }
}
