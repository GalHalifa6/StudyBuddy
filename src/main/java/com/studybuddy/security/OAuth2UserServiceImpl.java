package com.studybuddy.security;

import com.studybuddy.user.model.Role;
import com.studybuddy.user.model.User;
import com.studybuddy.user.repository.UserRepository;
import com.studybuddy.email.service.EmailDomainService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Optional;

/**
 * Custom OAuth2 User Service for Google Sign-In
 * Validates email domain and creates/updates users
 */
@Service
public class OAuth2UserServiceImpl extends DefaultOAuth2UserService {

    private static final Logger logger = LoggerFactory.getLogger(OAuth2UserServiceImpl.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailDomainService emailDomainService;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oauth2User = super.loadUser(userRequest);

        try {
            return processOAuth2User(userRequest, oauth2User);
        } catch (Exception ex) {
            logger.error("Error processing OAuth2 user: {}", ex.getMessage());
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("processing_error", ex.getMessage(), null)
            );
        }
    }

    private OAuth2User processOAuth2User(OAuth2UserRequest userRequest, OAuth2User oauth2User) 
            throws OAuth2AuthenticationException {
        
        // Extract user info from Google
        String email = oauth2User.getAttribute("email");
        Boolean emailVerified = oauth2User.getAttribute("email_verified");
        String googleSub = oauth2User.getAttribute("sub");
        String name = oauth2User.getAttribute("name");
        String givenName = oauth2User.getAttribute("given_name");

        logger.info("Processing OAuth2 user: email={}, emailVerified={}, sub={}", email, emailVerified, googleSub);

        // Validate email is present
        if (email == null || email.isEmpty()) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("email_not_provided", "Email not provided by Google", null)
            );
        }

        // Validate email is verified by Google
        if (emailVerified == null || !emailVerified) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("email_not_verified", 
                            "Your Google email is not verified. Please verify your email with Google first.", 
                            null)
            );
        }

        // Validate email domain is allowed
        if (!emailDomainService.isEmailDomainAllowed(email)) {
            String domain = emailDomainService.extractDomain(email);
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("domain_not_allowed", 
                            "Email domain '" + domain + "' is not authorized. Please use your academic institution email.", 
                            null)
            );
        }

        // Find user by Google sub (only secure match)
        Optional<User> userOptional = userRepository.findByGoogleSub(googleSub);

        User user;
        if (userOptional.isPresent()) {
            // Existing user with matching googleSub - update and verify
            user = userOptional.get();
            user.setIsEmailVerified(true);
            if (user.getFullName() == null || user.getFullName().isEmpty()) {
                user.setFullName(name != null ? name : givenName);
            }
            userRepository.save(user);
            logger.info("Updated existing OAuth2 user: {}", email);
        } else {
            // Check if email already exists (security check)
            Optional<User> existingUserByEmail = userRepository.findByEmail(email);
            if (existingUserByEmail.isPresent()) {
                // Email exists but googleSub doesn't match - security issue
                // Do not link accounts automatically - reject with clear error
                throw new OAuth2AuthenticationException(
                        new OAuth2Error("email_already_registered",
                                "An account with this email already exists. Please log in with your password, or contact support if you need to link your Google account.",
                                null)
                );
            }
            
            // Create new user
            user = new User();
            user.setEmail(email);
            user.setGoogleSub(googleSub);
            user.setIsEmailVerified(true); // Google verified it
            user.setFullName(name != null ? name : givenName);
            user.setUsername(generateUsername(email));
            user.setPassword(null); // No password for OAuth users
            user.setRole(Role.USER);
            user.setIsActive(true);
            user.setIsDeleted(false); // Explicitly set required field
            user.setOnboardingCompleted(false); // Explicitly set required field
            user.setTopicsOfInterest(new ArrayList<>());
            user.setPreferredLanguages(new ArrayList<>());

            userRepository.save(user);
            logger.info("Created new OAuth2 user: {}", email);
        }

        return oauth2User;
    }

    /**
     * Generates a unique username from email
     */
    private String generateUsername(String email) {
        String baseUsername = email.substring(0, email.indexOf("@")).toLowerCase();
        String username = baseUsername;
        int counter = 1;

        while (userRepository.existsByUsername(username)) {
            username = baseUsername + counter;
            counter++;
        }

        return username;
    }
}





