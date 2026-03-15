package com.studybuddy.matching.model;

import com.studybuddy.user.model.RoleType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Pre-computed characteristic profile for a study group.
 * Stores average role scores and variance for efficient matching calculations.
 * Updated asynchronously via events when group membership or member profiles change.
 */
@Entity
@Table(name = "group_characteristic_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupCharacteristicProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private Long groupId;

    // Direct average role score columns for efficient querying (0.0 to 1.0)
    @Column(name = "avg_leader")
    @Builder.Default
    private Double avgLeader = 0.0;

    @Column(name = "avg_planner")
    @Builder.Default
    private Double avgPlanner = 0.0;

    @Column(name = "avg_expert")
    @Builder.Default
    private Double avgExpert = 0.0;

    @Column(name = "avg_creative")
    @Builder.Default
    private Double avgCreative = 0.0;

    @Column(name = "avg_communicator")
    @Builder.Default
    private Double avgCommunicator = 0.0;

    @Column(name = "avg_team_player")
    @Builder.Default
    private Double avgTeamPlayer = 0.0;

    @Column(name = "avg_challenger")
    @Builder.Default
    private Double avgChallenger = 0.0;

    /**
     * Current variance of the group (lower is better for matching).
     * Represents how balanced the group is across different roles.
     */
    @Column(nullable = false)
    private Double currentVariance;

    /**
     * Number of members with valid characteristic profiles.
     * Used for calculating averages and determining reliability.
     */
    @Column(nullable = false)
    private Integer memberCount;

    /**
     * Last time this profile was calculated.
     * Helps track freshness and debugging.
     */
    @Column(nullable = false)
    private LocalDateTime lastUpdatedAt;

    /**
     * Set average score for a specific role.
     */
    public void setAverageRoleScore(RoleType roleType, Double score) {
        double normalizedScore = score == null ? 0.0 : Math.max(0.0, Math.min(1.0, score));
        switch (roleType) {
            case LEADER -> this.avgLeader = normalizedScore;
            case PLANNER -> this.avgPlanner = normalizedScore;
            case EXPERT -> this.avgExpert = normalizedScore;
            case CREATIVE -> this.avgCreative = normalizedScore;
            case COMMUNICATOR -> this.avgCommunicator = normalizedScore;
            case TEAM_PLAYER -> this.avgTeamPlayer = normalizedScore;
            case CHALLENGER -> this.avgChallenger = normalizedScore;
        }
    }

    /**
     * Get average score for a specific role.
     */
    public Double getAverageRoleScore(RoleType roleType) {
        Double score = switch (roleType) {
            case LEADER -> this.avgLeader;
            case PLANNER -> this.avgPlanner;
            case EXPERT -> this.avgExpert;
            case CREATIVE -> this.avgCreative;
            case COMMUNICATOR -> this.avgCommunicator;
            case TEAM_PLAYER -> this.avgTeamPlayer;
            case CHALLENGER -> this.avgChallenger;
        };
        return score == null ? 0.0 : score;
    }

    /**
     * Get all average role scores as a Map for backward compatibility.
     */
    public java.util.Map<RoleType, Double> getAverageRoleScores() {
        java.util.Map<RoleType, Double> scores = new java.util.HashMap<>();
        for (RoleType role : RoleType.values()) {
            scores.put(role, getAverageRoleScore(role));
        }
        return scores;
    }

    @PrePersist
    @PreUpdate
    protected void updateTimestamp() {
        this.lastUpdatedAt = LocalDateTime.now();
    }
}
