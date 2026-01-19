package com.studybuddy.matching.model;

import com.studybuddy.quiz.model.QuizStatus;
import com.studybuddy.user.model.RoleType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "characteristic_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CharacteristicProfile {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @ToString.Exclude
    private com.studybuddy.user.model.User user;
    
    // Direct role score columns for efficient querying (0.0 to 1.0)
    @Column(name = "score_leader")
    @Builder.Default
    private Double scoreLeader = 0.0;

    @Column(name = "score_planner")
    @Builder.Default
    private Double scorePlanner = 0.0;

    @Column(name = "score_expert")
    @Builder.Default
    private Double scoreExpert = 0.0;

    @Column(name = "score_creative")
    @Builder.Default
    private Double scoreCreative = 0.0;

    @Column(name = "score_communicator")
    @Builder.Default
    private Double scoreCommunicator = 0.0;

    @Column(name = "score_team_player")
    @Builder.Default
    private Double scoreTeamPlayer = 0.0;

    @Column(name = "score_challenger")
    @Builder.Default
    private Double scoreChallenger = 0.0;
    
    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    /**
     * Track quiz completion status.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private QuizStatus quizStatus = QuizStatus.NOT_STARTED;
    
    @Column
    private Integer totalQuestions;
    
    @Column
    private Integer answeredQuestions;
    
    /**
     * Reliability percentage based on quiz completion (0.0 to 1.0).
     * 0% if skipped or not started, 50% for half completed, 100% for fully completed.
     */
    @Column
    @Builder.Default
    private Double reliabilityPercentage = 0.0;
    
    /**
     * Version counter for quiz retakes.
     */
    @Version
    private Long version;
    
    @PrePersist
    @PreUpdate
    protected void onSave() {
        this.updatedAt = LocalDateTime.now();
        if (this.reliabilityPercentage == null) {
            updateReliability();
        }
    }
    
    @PostLoad
    protected void onLoad() {
        if (this.reliabilityPercentage == null) {
            this.reliabilityPercentage = 0.0;
        }
    }
    
    public void setRoleScore(RoleType role, Double score) {
        double normalizedScore = score == null ? 0.0 : Math.max(0.0, Math.min(1.0, score));
        switch (role) {
            case LEADER -> this.scoreLeader = normalizedScore;
            case PLANNER -> this.scorePlanner = normalizedScore;
            case EXPERT -> this.scoreExpert = normalizedScore;
            case CREATIVE -> this.scoreCreative = normalizedScore;
            case COMMUNICATOR -> this.scoreCommunicator = normalizedScore;
            case TEAM_PLAYER -> this.scoreTeamPlayer = normalizedScore;
            case CHALLENGER -> this.scoreChallenger = normalizedScore;
        }
        this.updatedAt = LocalDateTime.now();
    }
    
    public Double getRoleScore(RoleType role) {
        Double score = switch (role) {
            case LEADER -> this.scoreLeader;
            case PLANNER -> this.scorePlanner;
            case EXPERT -> this.scoreExpert;
            case CREATIVE -> this.scoreCreative;
            case COMMUNICATOR -> this.scoreCommunicator;
            case TEAM_PLAYER -> this.scoreTeamPlayer;
            case CHALLENGER -> this.scoreChallenger;
        };
        return score == null ? 0.0 : score;
    }
    
    /**
     * Check if user requires onboarding to complete/skip quiz.
     */
    public boolean requiresOnboarding() {
        return quizStatus == null || quizStatus == QuizStatus.NOT_STARTED;
    }
    
    /**
     * Calculate and update reliability percentage based on completion.
     */
    public void updateReliability() {
        if (quizStatus == null || quizStatus == QuizStatus.SKIPPED || quizStatus == QuizStatus.NOT_STARTED) {
            this.reliabilityPercentage = 0.0;
        } else if (quizStatus == QuizStatus.COMPLETED) {
            this.reliabilityPercentage = 1.0;
        } else if (quizStatus == QuizStatus.IN_PROGRESS && totalQuestions != null && totalQuestions > 0 && answeredQuestions != null) {
            this.reliabilityPercentage = (double) answeredQuestions / totalQuestions;
        } else {
            // Fallback for any edge cases
            this.reliabilityPercentage = 0.0;
        }
    }
    
    /**
     * Get the dominant (highest scoring) role.
     */
    public RoleType getDominantRole() {
        RoleType dominant = RoleType.TEAM_PLAYER;
        double maxScore = getRoleScore(RoleType.TEAM_PLAYER);

        for (RoleType role : RoleType.values()) {
            double score = getRoleScore(role);
            if (score > maxScore) {
                maxScore = score;
                dominant = role;
            }
        }

        return dominant;
    }
}
