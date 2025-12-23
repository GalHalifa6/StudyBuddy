package com.studybuddy.repository;

import com.studybuddy.model.SafetyFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SafetyFeedbackRepository extends JpaRepository<SafetyFeedback, Long> {
    
    List<SafetyFeedback> findByStudentIdOrderBySubmittedAtDesc(Long studentId);
    
    boolean existsByStudentIdAndGroupIdAndSessionId(Long studentId, Long groupId, Long sessionId);
}
