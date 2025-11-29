package com.studybuddy.repository;

import com.studybuddy.model.ChatSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for ChatSummary entity
 */
@Repository
public interface ChatSummaryRepository extends JpaRepository<ChatSummary, Long> {
    
    List<ChatSummary> findByGroupIdOrderByCreatedAtDesc(Long groupId);
    
    List<ChatSummary> findTop5ByGroupIdOrderByCreatedAtDesc(Long groupId);
}
