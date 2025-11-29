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
        private Long id;
        private String username;
        private String email;
        private String role;
        private String fullName;

        public JwtResponse(String token, Long id, String username, String email, String role, String fullName) {
            this.token = token;
            this.id = id;
            this.username = username;
            this.email = email;
            this.role = role;
            this.fullName = fullName;
        }
    }

    @Data
    @NoArgsConstructor
    public static class MessageResponse {
        private String message;
        private boolean success;
        private List<String> errors;

        public MessageResponse(String message) {
            this.message = message;
            this.success = !message.toLowerCase().contains("error") && !message.toLowerCase().contains("failed");
            this.errors = null;
        }
        
        public MessageResponse(String message, boolean success) {
            this.message = message;
            this.success = success;
            this.errors = null;
        }
        
        public MessageResponse(String message, boolean success, List<String> errors) {
            this.message = message;
            this.success = success;
            this.errors = errors;
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
}
