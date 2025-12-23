package com.studybuddy.service;

import com.studybuddy.model.User;
import com.studybuddy.repository.EmailVerificationTokenRepository;
import com.studybuddy.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for processing OIDC user database operations
 * Handles transactional operations for Google OAuth user linking and updates
 */
@Service
public class OidcUserProcessingService {

    private static final Logger logger = LoggerFactory.getLogger(OidcUserProcessingService.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    /**
     * Link Google account to existing user and clean up email verification tokens
     * This method is transactional to ensure atomicity of delete + save operations
     * 
     * @param user The user to update
     * @param googleSub The Google sub identifier to link
     * @param fullName The full name from Google (used if user's name is missing)
     */
    @Transactional
    public void linkGoogleAccountToUser(User user, String googleSub, String fullName) {
        logger.info("Linking Google account (sub: {}) to user ID: {} (linking flow)", googleSub, user.getId());
        
        // Link Google account
        user.setGoogleSub(googleSub);
        user.setEmailVerified(true); // Google verified the email
        
        // Update name if missing
        if (user.getFullName() == null || user.getFullName().isEmpty()) {
            user.setFullName(fullName);
        }
        
        // Since Google verified the email, delete any email verification tokens
        logger.info("Deleting email verification tokens for user ID: {} (linking flow)", user.getId());
        emailVerificationTokenRepository.deleteByUserId(user.getId());
        logger.info("Successfully deleted email verification tokens for user ID: {} (linking flow)", user.getId());
        
        // Save the updated user
        userRepository.save(user);
        logger.info("Linked Google account to existing manually registered user via linking token: {}", user.getEmail());
    }

    /**
     * Update existing OIDC user (re-authentication case)
     * This method is transactional to ensure atomicity of delete + save operations
     * 
     * @param user The user to update
     * @param fullName The full name from Google (used if user's name is missing)
     */
    @Transactional
    public void updateExistingOidcUser(User user, String fullName) {
        logger.info("Updating existing OIDC user: {}", user.getEmail());
        
        user.setEmailVerified(true);
        if (user.getFullName() == null || user.getFullName().isEmpty()) {
            user.setFullName(fullName);
        }
        
        // Since Google verified the email, delete any email verification tokens (no longer needed)
        emailVerificationTokenRepository.deleteByUserId(user.getId());
        
        userRepository.save(user);
        logger.info("Updated existing OIDC user: {}", user.getEmail());
    }
}

