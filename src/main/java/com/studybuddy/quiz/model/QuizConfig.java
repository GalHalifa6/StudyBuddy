package com.studybuddy.quiz.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Quiz Configuration Entity
 * Stores system-wide quiz settings
 */
@Entity
@Table(name = "quiz_config")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizConfig {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /**
     * Selected question IDs to show to users on first login.
     * If null or empty, all active questions will be shown.
     * Questions are shown in the order specified in this list.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "quiz_config_selected_questions", 
                     joinColumns = @JoinColumn(name = "config_id"))
    @Column(name = "question_id")
    @Builder.Default
    private List<Long> selectedQuestionIds = new ArrayList<>();
    
    /**
     * Since we only need one config record, we'll use a singleton pattern.
     * This field ensures only one config exists.
     */
    @Column(unique = true, nullable = false)
    @Builder.Default
    private String configKey = "DEFAULT";
}

