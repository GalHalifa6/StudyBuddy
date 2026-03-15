package com.studybuddy.expert.repository;

import com.studybuddy.expert.model.SessionMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SessionMessageRepository extends JpaRepository<SessionMessage, Long> {
    
    List<SessionMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);
    
    List<SessionMessage> findBySessionIdAndCreatedAtAfterOrderByCreatedAtAsc(Long sessionId, java.time.LocalDateTime after);
}



