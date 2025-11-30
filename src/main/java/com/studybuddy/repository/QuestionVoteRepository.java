package com.studybuddy.repository;

import com.studybuddy.model.QuestionVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QuestionVoteRepository extends JpaRepository<QuestionVote, Long> {
    
    Optional<QuestionVote> findByQuestionIdAndUserId(Long questionId, Long userId);
    
    boolean existsByQuestionIdAndUserId(Long questionId, Long userId);
    
    void deleteByQuestionIdAndUserId(Long questionId, Long userId);
}
