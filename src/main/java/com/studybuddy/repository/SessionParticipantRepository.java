package com.studybuddy.repository;

import com.studybuddy.model.SessionParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for SessionParticipant entity
 */
@Repository
public interface SessionParticipantRepository extends JpaRepository<SessionParticipant, Long> {
    
    List<SessionParticipant> findBySessionId(Long sessionId);
    
    List<SessionParticipant> findByUserId(Long userId);
    
    Optional<SessionParticipant> findBySessionIdAndUserId(Long sessionId, Long userId);
    
    boolean existsBySessionIdAndUserId(Long sessionId, Long userId);
    
    long countBySessionId(Long sessionId);
    
    List<SessionParticipant> findBySessionIdAndStatus(Long sessionId, SessionParticipant.ParticipantStatus status);
    
    void deleteByUserId(Long userId);
}
