package com.studybuddy.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service for managing Google account linking tokens
 * Stores temporary tokens that allow authenticated users to link their Google accounts
 */
@Service
public class GoogleAccountLinkingService {

    private static final Logger logger = LoggerFactory.getLogger(GoogleAccountLinkingService.class);
    
    // In-memory storage for linking tokens (expires after 10 minutes)
    private static final long TOKEN_EXPIRATION_MINUTES = 10;
    private final Map<String, LinkingToken> tokens = new ConcurrentHashMap<>();

    /**
     * Generate a linking token for an authenticated user
     * @param userId The ID of the authenticated user
     * @param email The email of the user (to verify during OAuth callback)
     * @return The linking token
     */
    public String generateLinkingToken(Long userId, String email) {
        String token = UUID.randomUUID().toString();
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(TOKEN_EXPIRATION_MINUTES);
        
        tokens.put(token, new LinkingToken(userId, email, expiresAt));
        
        logger.info("Generated linking token for user ID: {}, email: {}", userId, email);
        return token;
    }

    /**
     * Verify and consume a linking token
     * @param token The linking token
     * @return The linking token data if valid, null otherwise
     */
    public LinkingToken verifyAndConsumeToken(String token) {
        LinkingToken linkingToken = tokens.get(token);
        
        if (linkingToken == null) {
            logger.warn("Invalid linking token: {}", token);
            return null;
        }
        
        if (linkingToken.isExpired()) {
            tokens.remove(token);
            logger.warn("Expired linking token: {}", token);
            return null;
        }
        
        // Consume token (remove it so it can't be used again)
        tokens.remove(token);
        logger.info("Verified and consumed linking token for user ID: {}", linkingToken.getUserId());
        return linkingToken;
    }

    /**
     * Clean up expired tokens (called periodically)
     */
    public void cleanupExpiredTokens() {
        tokens.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }

    /**
     * Internal class to store linking token data
     */
    public static class LinkingToken {
        private final Long userId;
        private final String email;
        private final LocalDateTime expiresAt;

        public LinkingToken(Long userId, String email, LocalDateTime expiresAt) {
            this.userId = userId;
            this.email = email;
            this.expiresAt = expiresAt;
        }

        public Long getUserId() {
            return userId;
        }

        public String getEmail() {
            return email;
        }

        public boolean isExpired() {
            return LocalDateTime.now().isAfter(expiresAt);
        }
    }
}

