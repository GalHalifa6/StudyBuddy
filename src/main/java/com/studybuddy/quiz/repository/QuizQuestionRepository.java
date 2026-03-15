package com.studybuddy.quiz.repository;

import com.studybuddy.quiz.model.QuizQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuizQuestionRepository extends JpaRepository<QuizQuestion, Long> {
    
    @Query("SELECT DISTINCT q FROM QuizQuestion q " +
           "LEFT JOIN FETCH q.options o " +
           "LEFT JOIN FETCH o.roleWeights " +
           "WHERE q.active = true " +
           "ORDER BY q.orderIndex")
    List<QuizQuestion> findAllActiveWithOptions();
    
    @Query("SELECT DISTINCT q FROM QuizQuestion q " +
           "LEFT JOIN FETCH q.options o " +
           "LEFT JOIN FETCH o.roleWeights " +
           "ORDER BY q.orderIndex")
    List<QuizQuestion> findAllWithOptions();
}
