package com.studybuddy.matching.model;

import com.studybuddy.quiz.model.QuizStatus;
import com.studybuddy.user.model.RoleType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

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
    
    /**
     * Normalized scores (0.0 to 1.0) for each role.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "profile_role_scores",
                     joinColumns = @JoinColumn(name = "profile_id"))
    @MapKeyEnumerated(EnumType.STRING)
    @Column(name = "score")
    @Builder.Default
    private Map<RoleType, Double> roleScores = new HashMap<>();
    
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
        if (this.roleScores == null) {
            this.roleScores = new HashMap<>();
        }
        if (this.reliabilityPercentage == null) {
            updateReliability();
        }
    }
    
    @PostLoad
    protected void onLoad() {
        if (this.roleScores == null) {
            this.roleScores = new HashMap<>();
        }
        if (this.reliabilityPercentage == null) {
            this.reliabilityPercentage = 0.0;
        }
    }
    
    public void setRoleScore(RoleType role, Double score) {
        this.roleScores.put(role, Math.max(0.0, Math.min(1.0, score)));
        this.updatedAt = LocalDateTime.now();
    }
    
    public Double getRoleScore(RoleType role) {
        return roleScores.getOrDefault(role, 0.0);
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
        if (roleScores == null || roleScores.isEmpty()) {
            return RoleType.TEAM_PLAYER;
        }
        return roleScores.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(RoleType.TEAM_PLAYER);
    }
}
