package com.studybuddy.security;

import com.studybuddy.model.Role;
import com.studybuddy.model.User;
import com.studybuddy.repository.EmailVerificationTokenRepository;
import com.studybuddy.repository.UserRepository;
import com.studybuddy.service.EmailDomainService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Optional;

/**
 * Custom OIDC User Service for Google Sign-In (OpenID Connect).
 *
 * Ensures the user is created/updated in the database BEFORE the success handler runs.
 */
@Service
public class OidcUserServiceImpl extends OidcUserService {

    private static final Logger logger = LoggerFactory.getLogger(OidcUserServiceImpl.class);

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailDomainService emailDomainService;

    @Autowired
    private EmailVerificationTokenRepository emailVerificationTokenRepository;

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);

        try {
            return processOidcUser(oidcUser);
        } catch (OAuth2AuthenticationException ex) {
            throw ex;
        } catch (Exception ex) {
            logger.error("Error processing OIDC user: {}", ex.getMessage());
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("processing_error", ex.getMessage(), null)
            );
        }
    }

    private OidcUser processOidcUser(OidcUser oidcUser) throws OAuth2AuthenticationException {
        // Extract user info from Google ID Token / UserInfo
        String email = oidcUser.getAttribute("email");
        Boolean emailVerified = oidcUser.getAttribute("email_verified");
        String googleSub = oidcUser.getAttribute("sub");
        String name = oidcUser.getAttribute("name");
        String givenName = oidcUser.getAttribute("given_name");

        logger.info("Processing OIDC user: email={}, emailVerified={}, sub={}", email, emailVerified, googleSub);

        // Validate email is present
        if (email == null || email.isEmpty()) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("email_not_provided", "Email not provided by Google", null)
            );
        }

        // Validate sub is present
        if (googleSub == null || googleSub.isEmpty()) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("sub_not_provided", "Google subject (sub) not provided", null)
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
            user.setEmailVerified(true);
            if (user.getFullName() == null || user.getFullName().isEmpty()) {
                user.setFullName(name != null ? name : givenName);
            }
            
            // Since Google verified the email, delete any email verification tokens (no longer needed)
            emailVerificationTokenRepository.deleteByUserId(user.getId());
            
            userRepository.save(user);
            logger.info("Updated existing OIDC user: {}", email);
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
            user.setEmailVerified(true); // Google verified it
            user.setFullName(name != null ? name : givenName);
            user.setUsername(generateUsername(email));
            user.setPassword(null); // No password for OAuth users
            user.setRole(Role.USER);
            user.setIsActive(true);
            user.setTopicsOfInterest(new ArrayList<>());
            user.setPreferredLanguages(new ArrayList<>());

            userRepository.save(user);
            logger.info("Created new OIDC user: {}", email);
        }

        // Return the OIDC user for the authentication to proceed
        return oidcUser;
    }

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



