package com.studybuddy.matching.model;

import com.studybuddy.user.model.RoleType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test to verify the role score storage refactoring works correctly.
 * Tests that the flat column approach maintains the same API semantics as the old Map-based approach.
 */
class RoleScoreRefactoringTest {

    @Test
    void testCharacteristicProfile_SetAndGet() {
        com.studybuddy.user.model.User user = new com.studybuddy.user.model.User();
        user.setId(1L);

        CharacteristicProfile profile = CharacteristicProfile.builder()
                .user(user)
                .build();

        // Test setting and getting all roles
        profile.setRoleScore(RoleType.LEADER, 0.8);
        profile.setRoleScore(RoleType.PLANNER, 0.6);
        profile.setRoleScore(RoleType.EXPERT, 0.9);
        profile.setRoleScore(RoleType.CREATIVE, 0.5);
        profile.setRoleScore(RoleType.COMMUNICATOR, 0.7);
        profile.setRoleScore(RoleType.TEAM_PLAYER, 0.4);
        profile.setRoleScore(RoleType.CHALLENGER, 0.3);

        assertEquals(0.8, profile.getRoleScore(RoleType.LEADER));
        assertEquals(0.6, profile.getRoleScore(RoleType.PLANNER));
        assertEquals(0.9, profile.getRoleScore(RoleType.EXPERT));
        assertEquals(0.5, profile.getRoleScore(RoleType.CREATIVE));
        assertEquals(0.7, profile.getRoleScore(RoleType.COMMUNICATOR));
        assertEquals(0.4, profile.getRoleScore(RoleType.TEAM_PLAYER));
        assertEquals(0.3, profile.getRoleScore(RoleType.CHALLENGER));
    }

    @Test
    void testCharacteristicProfile_Normalization() {
        com.studybuddy.user.model.User user = new com.studybuddy.user.model.User();
        user.setId(1L);

        CharacteristicProfile profile = CharacteristicProfile.builder()
                .user(user)
                .build();

        // Test values are normalized to [0.0, 1.0]
        profile.setRoleScore(RoleType.LEADER, 1.5);  // Too high
        profile.setRoleScore(RoleType.PLANNER, -0.3); // Too low

        assertEquals(1.0, profile.getRoleScore(RoleType.LEADER));
        assertEquals(0.0, profile.getRoleScore(RoleType.PLANNER));
    }

    @Test
    void testCharacteristicProfile_NullSafety() {
        com.studybuddy.user.model.User user = new com.studybuddy.user.model.User();
        user.setId(1L);

        CharacteristicProfile profile = CharacteristicProfile.builder()
                .user(user)
                .build();

        // Test null is treated as 0.0
        profile.setRoleScore(RoleType.LEADER, null);
        assertEquals(0.0, profile.getRoleScore(RoleType.LEADER));

        // Test getting uninitialized role returns 0.0
        CharacteristicProfile emptyProfile = CharacteristicProfile.builder()
                .user(user)
                .build();
        assertEquals(0.0, emptyProfile.getRoleScore(RoleType.EXPERT));
    }

    @Test
    void testCharacteristicProfile_GetDominantRole() {
        com.studybuddy.user.model.User user = new com.studybuddy.user.model.User();
        user.setId(1L);

        CharacteristicProfile profile = CharacteristicProfile.builder()
                .user(user)
                .build();

        profile.setRoleScore(RoleType.LEADER, 0.5);
        profile.setRoleScore(RoleType.PLANNER, 0.3);
        profile.setRoleScore(RoleType.EXPERT, 0.9);  // Highest
        profile.setRoleScore(RoleType.CREATIVE, 0.4);
        profile.setRoleScore(RoleType.COMMUNICATOR, 0.6);
        profile.setRoleScore(RoleType.TEAM_PLAYER, 0.7);
        profile.setRoleScore(RoleType.CHALLENGER, 0.2);

        assertEquals(RoleType.EXPERT, profile.getDominantRole());
    }

    @Test
    void testCharacteristicProfile_GetDominantRole_DefaultsToTeamPlayer() {
        com.studybuddy.user.model.User user = new com.studybuddy.user.model.User();
        user.setId(1L);

        CharacteristicProfile profile = CharacteristicProfile.builder()
                .user(user)
                .build();
        
        // All scores are 0.0, should default to TEAM_PLAYER
        assertEquals(RoleType.TEAM_PLAYER, profile.getDominantRole());
    }

    @Test
    void testGroupCharacteristicProfile_SetAndGet() {
        GroupCharacteristicProfile profile = GroupCharacteristicProfile.builder()
                .groupId(1L)
                .build();

        // Test setting and getting all roles
        profile.setAverageRoleScore(RoleType.LEADER, 0.75);
        profile.setAverageRoleScore(RoleType.PLANNER, 0.55);
        profile.setAverageRoleScore(RoleType.EXPERT, 0.85);
        profile.setAverageRoleScore(RoleType.CREATIVE, 0.45);
        profile.setAverageRoleScore(RoleType.COMMUNICATOR, 0.65);
        profile.setAverageRoleScore(RoleType.TEAM_PLAYER, 0.35);
        profile.setAverageRoleScore(RoleType.CHALLENGER, 0.25);

        assertEquals(0.75, profile.getAverageRoleScore(RoleType.LEADER));
        assertEquals(0.55, profile.getAverageRoleScore(RoleType.PLANNER));
        assertEquals(0.85, profile.getAverageRoleScore(RoleType.EXPERT));
        assertEquals(0.45, profile.getAverageRoleScore(RoleType.CREATIVE));
        assertEquals(0.65, profile.getAverageRoleScore(RoleType.COMMUNICATOR));
        assertEquals(0.35, profile.getAverageRoleScore(RoleType.TEAM_PLAYER));
        assertEquals(0.25, profile.getAverageRoleScore(RoleType.CHALLENGER));
    }

    @Test
    void testGroupCharacteristicProfile_Normalization() {
        GroupCharacteristicProfile profile = GroupCharacteristicProfile.builder()
                .groupId(1L)
                .build();

        // Test values are normalized to [0.0, 1.0]
        profile.setAverageRoleScore(RoleType.LEADER, 2.0);  // Too high
        profile.setAverageRoleScore(RoleType.PLANNER, -1.0); // Too low

        assertEquals(1.0, profile.getAverageRoleScore(RoleType.LEADER));
        assertEquals(0.0, profile.getAverageRoleScore(RoleType.PLANNER));
    }

    @Test
    void testGroupCharacteristicProfile_NullSafety() {
        GroupCharacteristicProfile profile = GroupCharacteristicProfile.builder()
                .groupId(1L)
                .build();

        // Test null is treated as 0.0
        profile.setAverageRoleScore(RoleType.LEADER, null);
        assertEquals(0.0, profile.getAverageRoleScore(RoleType.LEADER));

        // Test getting uninitialized role returns 0.0
        GroupCharacteristicProfile emptyProfile = GroupCharacteristicProfile.builder()
                .groupId(2L)
                .build();
        assertEquals(0.0, emptyProfile.getAverageRoleScore(RoleType.EXPERT));
    }

    @Test
    void testGroupCharacteristicProfile_BackwardCompatibilityMap() {
        GroupCharacteristicProfile profile = GroupCharacteristicProfile.builder()
                .groupId(1L)
                .build();

        // Set average scores
        profile.setAverageRoleScore(RoleType.LEADER, 0.7);
        profile.setAverageRoleScore(RoleType.EXPERT, 0.8);
        profile.setAverageRoleScore(RoleType.TEAM_PLAYER, 0.5);

        // Verify backward compatibility Map getter
        var scoresMap = profile.getAverageRoleScores();
        assertEquals(7, scoresMap.size()); // All 7 roles
        assertEquals(0.7, scoresMap.get(RoleType.LEADER));
        assertEquals(0.8, scoresMap.get(RoleType.EXPERT));
        assertEquals(0.5, scoresMap.get(RoleType.TEAM_PLAYER));
    }
}
