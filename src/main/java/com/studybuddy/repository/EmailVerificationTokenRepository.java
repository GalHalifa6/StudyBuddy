package com.studybuddy.repository;

import com.studybuddy.model.EmailVerificationToken;
import com.studybuddy.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for EmailVerificationToken entity
 */
@Repository
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {
    
    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);
    
    List<EmailVerificationToken> findByUser(User user);
    
    void deleteByExpiresAtBefore(LocalDateTime dateTime);
    
    void deleteByUser(User user);
    
    void deleteByUserId(Long userId);
    
    /**
     * Find all tokens that are not expired and not used
     * Used for optimization in token verification to avoid checking expired/used tokens
     */
    @Query("SELECT t FROM EmailVerificationToken t WHERE t.expiresAt > :now AND t.used = false")
    List<EmailVerificationToken> findValidTokens(@Param("now") LocalDateTime now);
}
