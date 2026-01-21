package com.studybuddy.quiz.repository;

import com.studybuddy.quiz.model.QuizConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface QuizConfigRepository extends JpaRepository<QuizConfig, Long> {
    
    Optional<QuizConfig> findByConfigKey(String configKey);
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    default QuizConfig getDefaultConfig() {
        return findByConfigKey("DEFAULT")
                .orElseGet(() -> {
                    QuizConfig config = QuizConfig.builder()
                            .configKey("DEFAULT")
                            .selectedQuestionIds(new java.util.ArrayList<>()) // empty means show all
                            .build();
                    return save(config);
                });
    }
}

