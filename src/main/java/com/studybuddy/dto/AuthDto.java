package com.studybuddy.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTOs for Authentication
 */
public class AuthDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterRequest {
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 20, message = "Username must be between 3 and 20 characters")
        private String username;

        @NotBlank(message = "Email is required")
        @Email(message = "Please provide a valid email address")
        private String email;

        @NotBlank(message = "Password is required")
        @Size(min = 6, max = 40, message = "Password must be between 6 and 40 characters")
        private String password;

        private String fullName;
        
        private String role; // USER, EXPERT, ADMIN
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        @NotBlank(message = "Username is required")
        private String username;

        @NotBlank(message = "Password is required")
        private String password;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JwtResponse {
        private String token;
        private String type = "Bearer";
        private UserInfo user;

        public JwtResponse(String token, UserInfo user) {
            this.token = token;
            this.user = user;
        }

        // Legacy constructor for backward compatibility
        public JwtResponse(String token, Long id, String username, String email, String role, String fullName) {
            this.token = token;
            this.user = new UserInfo(id, username, email, role, fullName, false, null);
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long id;
        private String username;
        private String email;
        private String role;
        private String fullName;
        private Boolean emailVerified;
        private String institutionName;
    }

    @Data
    @NoArgsConstructor
    public static class MessageResponse {
        private String message;
        private boolean success;
        private List<String> errors;
        private String errorCode; // For specific error codes like EMAIL_NOT_VERIFIED

        public MessageResponse(String message) {
            this.message = message;
            this.success = !message.toLowerCase().contains("error") && !message.toLowerCase().contains("failed");
            this.errors = null;
            this.errorCode = null;
        }
        
        public MessageResponse(String message, boolean success) {
            this.message = message;
            this.success = success;
            this.errors = null;
            this.errorCode = null;
        }
        
        public MessageResponse(String message, boolean success, List<String> errors) {
            this.message = message;
            this.success = success;
            this.errors = errors;
            this.errorCode = null;
        }

        public MessageResponse(String message, boolean success, List<String> errors, String errorCode) {
            this.message = message;
            this.success = success;
            this.errors = errors;
            this.errorCode = errorCode;
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserProfileRequest {
        private List<String> topicsOfInterest;
        private String proficiencyLevel;
        private List<String> preferredLanguages;
        private String availability;
        private String collaborationStyle;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserResponse {
        private Long id;
        private String username;
        private String email;
        private String fullName;
        private String role;
        private Boolean isActive;
        private Boolean emailVerified;
        private String googleSub; // Google OAuth identifier (null if not linked)
        private List<String> topicsOfInterest;
        private String proficiencyLevel;
        private List<String> preferredLanguages;
        private String availability;
        private String collaborationStyle;
        private java.time.LocalDateTime createdAt;
        private java.time.LocalDateTime updatedAt;

        public static UserResponse fromUser(com.studybuddy.model.User user) {
            return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole() != null ? user.getRole().name() : null,
                user.getIsActive(),
                user.getEmailVerified(),
                user.getGoogleSub(), // Expose googleSub to frontend
                user.getTopicsOfInterest(),
                user.getProficiencyLevel(),
                user.getPreferredLanguages(),
                user.getAvailability(),
                user.getCollaborationStyle(),
                user.getCreatedAt(),
                user.getUpdatedAt()
            );
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResendVerificationRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Please provide a valid email address")
        private String email;
    }
}
