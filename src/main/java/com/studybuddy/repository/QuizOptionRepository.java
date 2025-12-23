package com.studybuddy.repository;

import com.studybuddy.model.QuizOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizOptionRepository extends JpaRepository<QuizOption, Long> {
}
