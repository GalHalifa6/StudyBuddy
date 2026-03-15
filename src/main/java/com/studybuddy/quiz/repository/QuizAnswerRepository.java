package com.studybuddy.quiz.repository;

import com.studybuddy.quiz.model.QuizAnswer;
import com.studybuddy.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuizAnswerRepository extends JpaRepository<QuizAnswer, Long> {
    
    @Query("SELECT a FROM QuizAnswer a " +
           "JOIN FETCH a.question " +
           "JOIN FETCH a.selectedOption " +
           "WHERE a.user.id = :userId")
    List<QuizAnswer> findByUserId(@Param("userId") Long userId);
    
    Optional<QuizAnswer> findByUserIdAndQuestionId(Long userId, Long questionId);
    
    void deleteByUser(User user);
}
