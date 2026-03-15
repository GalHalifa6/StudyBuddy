package com.studybuddy.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

/**
 * OAuth2 Failure Handler
 * Handles OAuth2 authentication failures and redirects to frontend with error details
 */
@Component
public class OAuth2FailureHandler extends SimpleUrlAuthenticationFailureHandler {

    private static final Logger logger = LoggerFactory.getLogger(OAuth2FailureHandler.class);

    @Value("${app.oauth2.redirect-uri:http://localhost:3000/auth/google/callback}")
    private String redirectUri;

    @Override
    public void onAuthenticationFailure(HttpServletRequest request, 
                                       HttpServletResponse response,
                                       AuthenticationException exception) throws IOException, ServletException {
        
        logger.error("OAuth2 authentication failed: {}", exception.getMessage());

        String errorCode = "authentication_failed";
        String errorMessage = "Authentication failed. Please try again.";

        // Extract error details from OAuth2AuthenticationException
        if (exception instanceof OAuth2AuthenticationException) {
            OAuth2AuthenticationException oauth2Exception = (OAuth2AuthenticationException) exception;
            OAuth2Error error = oauth2Exception.getError();
            
            if (error != null) {
                errorCode = error.getErrorCode();
                errorMessage = error.getDescription() != null ? error.getDescription() : errorMessage;
                
                logger.info("OAuth2 error code: {}, message: {}", errorCode, errorMessage);
            }
        }

        // Sanitize error message to remove invalid characters (CR/LF) for URL
        // Replace newlines and carriage returns with spaces, and trim
        if (errorMessage != null) {
            errorMessage = errorMessage.replaceAll("[\\r\\n]+", " ").trim();
            // Limit length to prevent URL length issues
            if (errorMessage.length() > 200) {
                errorMessage = errorMessage.substring(0, 197) + "...";
            }
        }

        // Redirect to frontend with error details
        String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
                .queryParam("error", errorCode)
                .queryParam("error_description", errorMessage)
                .build()
                .toUriString();

        logger.info("Redirecting OAuth2 failure to: {}", targetUrl);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}

