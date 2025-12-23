package com.studybuddy.security;

import com.studybuddy.model.Role;
import com.studybuddy.model.User;
import com.studybuddy.repository.UserRepository;
import com.studybuddy.service.EmailDomainService;
import com.studybuddy.service.GoogleAccountLinkingService;
import com.studybuddy.service.OidcUserProcessingService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

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
    private GoogleAccountLinkingService linkingService;

    @Autowired
    private OidcUserProcessingService oidcUserProcessingService;

    @Autowired
    @Lazy
    private PasswordEncoder passwordEncoder;

    @Override
    public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
        OidcUser oidcUser = super.loadUser(userRequest);

        try {
            // Extract linking token from state parameter if present
            String linkingToken = extractLinkingTokenFromState();
            
            return processOidcUser(oidcUser, linkingToken);
        } catch (OAuth2AuthenticationException ex) {
            throw ex;
        } catch (Exception ex) {
            logger.error("Error processing OIDC user: {}", ex.getMessage());
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("processing_error", ex.getMessage(), null)
            );
        }
    }

    /**
     * Extract linking token from request
     * First tries to get it from request attribute (set by CustomOAuth2AuthorizationRequestResolver)
     * Falls back to extracting from state parameter if needed
     */
    private String extractLinkingTokenFromState() {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                
                // First, try to get from request attribute (most reliable)
                String linkToken = (String) request.getAttribute("googleLinkingToken");
                if (linkToken != null && !linkToken.isEmpty()) {
                    return linkToken;
                }
                
                // Fallback: try to extract from state parameter
                String state = request.getParameter("state");
                if (state != null && state.contains("|linkToken:")) {
                    String[] parts = state.split("\\|linkToken:");
                    if (parts.length == 2) {
                        return parts[1];
                    }
                }
            }
        } catch (Exception e) {
            logger.debug("Could not extract linking token: {}", e.getMessage());
        }
        return null;
    }

    private OidcUser processOidcUser(OidcUser oidcUser, String linkingToken) throws OAuth2AuthenticationException {
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
            oidcUserProcessingService.updateExistingOidcUser(user, name != null ? name : givenName);
        } else {
            // Check if email already exists
            Optional<User> existingUserByEmail = userRepository.findByEmail(email);
            if (existingUserByEmail.isPresent()) {
                User existingUser = existingUserByEmail.get();
                
                // If the existing user already has a different googleSub, this is a security issue
                if (existingUser.getGoogleSub() != null && !existingUser.getGoogleSub().equals(googleSub)) {
                    // Different Google account trying to use same email - reject
                    throw new OAuth2AuthenticationException(
                            new OAuth2Error("email_already_registered",
                                    "An account with this email already exists with a different Google account. Please log in with your password, or contact support if you need to link your Google account.",
                                    null)
                    );
                }
                
                // If the existing user has the same googleSub (re-authentication case)
                // This handles edge cases where findByGoogleSub didn't find the user but findByEmail did
                if (existingUser.getGoogleSub() != null && existingUser.getGoogleSub().equals(googleSub)) {
                    // Re-authentication: update existing user (same logic as the if block above)
                    user = existingUser;
                    oidcUserProcessingService.updateExistingOidcUser(user, name != null ? name : givenName);
                    logger.info("Re-authenticated existing OIDC user (found via email lookup): {}", email);
                }
                // Check if this is a linking request (user authenticated and has valid linking token)
                else if (linkingToken != null && existingUser.getGoogleSub() == null) {
                    GoogleAccountLinkingService.LinkingToken tokenData = linkingService.verifyAndConsumeToken(linkingToken);
                    if (tokenData != null && tokenData.getEmail().equalsIgnoreCase(email)) {
                        // Valid linking token - link the Google account
                        user = existingUser;
                        // Keep existing password so user can still log in with password
                        // Keep existing username, role, and other settings
                        oidcUserProcessingService.linkGoogleAccountToUser(user, googleSub, name != null ? name : givenName);
                    } else {
                        // Invalid or expired linking token
                        throw new OAuth2AuthenticationException(
                                new OAuth2Error("invalid_linking_token",
                                        "Invalid or expired linking token. Please try linking your Google account again from your profile settings.",
                                        null)
                        );
                    }
                } else if (existingUser.getGoogleSub() == null) {
                    // Email exists but googleSub is null (manually registered account)
                    // No valid linking token - require explicit linking after password authentication
                    throw new OAuth2AuthenticationException(
                            new OAuth2Error("email_already_registered",
                                    "An account with this email already exists. Please sign in with your password first, then link your Google account from your profile settings.",
                                    null)
                    );
                }
                // Note: If we reach here and user was set above (re-authentication case), we're done
            } else {
                // Create new user
                user = new User();
                user.setEmail(email);
                user.setGoogleSub(googleSub);
                user.setIsEmailVerified(true); // Google verified it
                user.setFullName(name != null ? name : givenName);
                user.setUsername(generateUsername(email));
                // Set a placeholder password that can't be used for login
                // OAuth users should only authenticate via OAuth, not password
                user.setPassword(passwordEncoder.encode("OAUTH_USER_PLACEHOLDER_" + googleSub));
                user.setRole(Role.USER);
                user.setIsActive(true);
                user.setTopicsOfInterest(new ArrayList<>());
                user.setPreferredLanguages(new ArrayList<>());

                userRepository.save(user);
                logger.info("Created new OIDC user: {}", email);
            }
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



