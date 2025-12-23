package com.studybuddy.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

/**
 * Custom OAuth2 Authorization Request Resolver
 * Adds prompt=select_account to force Google to show account selection screen
 * Also handles linking tokens for account linking flow
 */
public class CustomOAuth2AuthorizationRequestResolver implements OAuth2AuthorizationRequestResolver {

    private final OAuth2AuthorizationRequestResolver defaultResolver;

    public CustomOAuth2AuthorizationRequestResolver(ClientRegistrationRepository clientRegistrationRepository) {
        this.defaultResolver = new DefaultOAuth2AuthorizationRequestResolver(
                clientRegistrationRepository, "/oauth2/authorization");
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request) {
        OAuth2AuthorizationRequest authorizationRequest = defaultResolver.resolve(request);
        return customizeAuthorizationRequest(request, authorizationRequest);
    }

    @Override
    public OAuth2AuthorizationRequest resolve(HttpServletRequest request, String clientRegistrationId) {
        OAuth2AuthorizationRequest authorizationRequest = defaultResolver.resolve(request, clientRegistrationId);
        return customizeAuthorizationRequest(request, authorizationRequest);
    }

    private OAuth2AuthorizationRequest customizeAuthorizationRequest(HttpServletRequest request, 
                                                                     OAuth2AuthorizationRequest authorizationRequest) {
        if (authorizationRequest == null) {
            return null;
        }

        // Check for linking token in request parameter
        String linkToken = request.getParameter("linkToken");
        
        // Store linking token in request attribute for later retrieval
        if (linkToken != null && !linkToken.isEmpty()) {
            request.setAttribute("googleLinkingToken", linkToken);
        }
        
        // Add prompt=select_account to force Google account selection
        OAuth2AuthorizationRequest.Builder builder = OAuth2AuthorizationRequest.from(authorizationRequest)
                .additionalParameters(additionalParams -> {
                    additionalParams.put("prompt", "select_account");
                });
        
        // If linking token is present, append it to the state parameter
        // Format: originalState|linkToken:tokenValue
        // This allows us to extract it later even if state is modified by Spring
        if (linkToken != null && !linkToken.isEmpty()) {
            String originalState = authorizationRequest.getState();
            String modifiedState = originalState + "|linkToken:" + linkToken;
            builder.state(modifiedState);
        }
        
        return builder.build();
    }
}

