package com.studybuddy.quiz.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * QuizAnswer Entity - Stores individual user answers to quiz questions
 */
@Entity
@Table(name = "quiz_answers", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "question_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizAnswer {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private com.studybuddy.user.model.User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private com.studybuddy.quiz.model.QuizQuestion question;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "option_id", nullable = false)
    private com.studybuddy.quiz.model.QuizOption selectedOption;
    
    @Column(nullable = false, updatable = false)
    private LocalDateTime answeredAt;
    
    @PrePersist
    protected void onCreate() {
        answeredAt = LocalDateTime.now();
    }
}
