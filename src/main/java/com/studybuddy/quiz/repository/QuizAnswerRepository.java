package com.studybuddy.quiz.repository;

import com.studybuddy.quiz.model.QuizAnswer;
import com.studybuddy.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuizAnswerRepository extends JpaRepository<QuizAnswer, Long> {
    
    List<QuizAnswer> findByUserId(Long userId);
    
    Optional<QuizAnswer> findByUserIdAndQuestionId(Long userId, Long questionId);
    
    void deleteByUser(User user);
}
