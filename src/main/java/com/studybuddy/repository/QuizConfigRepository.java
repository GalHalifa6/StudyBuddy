package com.studybuddy.repository;

import com.studybuddy.model.QuizConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QuizConfigRepository extends JpaRepository<QuizConfig, Long> {
    
    Optional<QuizConfig> findByConfigKey(String configKey);
    
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

