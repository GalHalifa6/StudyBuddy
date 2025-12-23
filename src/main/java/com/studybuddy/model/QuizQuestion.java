package com.studybuddy.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quiz_questions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestion {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 500)
    private String questionText;
    
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<QuizOption> options = new ArrayList<>();
    
    @Column(nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;
    
    public void addOption(QuizOption option) {
        options.add(option);
        option.setQuestion(this);
    }
}
