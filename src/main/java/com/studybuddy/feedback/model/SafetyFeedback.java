package com.studybuddy.feedback.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Immutable;

import java.time.LocalDateTime;

/**
 * Immutable ground truth data for future ML model training.
 * Once created, this data cannot be modified to preserve data integrity.
 */
@Entity
@Table(name = "safety_feedback")
@Immutable
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SafetyFeedback {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    @ToString.Exclude
    private com.studybuddy.user.model.User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    @ToString.Exclude
    private com.studybuddy.group.model.StudyGroup group;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    @ToString.Exclude
    private com.studybuddy.expert.model.ExpertSession session;
    
    /**
     * Psychological Safety Score (1-10).
     * How safe did the student feel in this group?
     */
    @Column(nullable = false)
    private Integer psScore;
    
    @Column(length = 1000)
    private String verbalFeedback;
    
    /**
     * Additional ML features.
     */
    @Column
    private String participationLevel; // LOW, MEDIUM, HIGH
    
    @Column
    private String conflictLevel; // NONE, LOW, MEDIUM, HIGH
    
    @Column
    private Boolean wouldRecommend;
    
    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime submittedAt = LocalDateTime.now();
}
