package com.studybuddy.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.HashMap;
import java.util.Map;

@Entity
@Table(name = "quiz_options")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizOption {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    @ToString.Exclude
    private QuizQuestion question;
    
    @Column(nullable = false, length = 300)
    private String optionText;
    
    @Column(nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;
    
    /**
     * Weighted scoring: Each option can contribute to multiple roles.
     * Key = RoleType, Value = weight (0.0 to 1.0)
     * This allows nuanced profiling where one answer impacts multiple dimensions.
     */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "quiz_option_role_weights", 
                     joinColumns = @JoinColumn(name = "option_id"))
    @MapKeyEnumerated(EnumType.STRING)
    @Column(name = "weight")
    @Builder.Default
    private Map<RoleType, Double> roleWeights = new HashMap<>();
    
    public void setRoleWeight(RoleType role, Double weight) {
        this.roleWeights.put(role, weight);
    }
}
