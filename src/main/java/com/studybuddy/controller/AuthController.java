package com.studybuddy.controller;

import com.studybuddy.dto.AuthDto;
import com.studybuddy.model.Role;
import com.studybuddy.model.User;
import com.studybuddy.repository.UserRepository;
import com.studybuddy.security.JwtUtils;
import com.studybuddy.service.EmailDomainService;
import com.studybuddy.service.EmailVerificationService;
import com.studybuddy.service.GoogleAccountLinkingService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Authentication Controller
 * Handles user registration and login
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private EmailDomainService emailDomainService;

    @Autowired
    private EmailVerificationService emailVerificationService;

    @Autowired
    private GoogleAccountLinkingService linkingService;

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody AuthDto.RegisterRequest request, BindingResult bindingResult) {
        // Collect validation errors
        List<String> errors = new ArrayList<>();
        
        if (bindingResult.hasErrors()) {
            errors.addAll(bindingResult.getFieldErrors().stream()
                    .map(FieldError::getDefaultMessage)
                    .collect(Collectors.toList()));
        }

        // Validate email domain against allowed domains
        if (!emailDomainService.isEmailDomainAllowed(request.getEmail())) {
            String domain = emailDomainService.extractDomain(request.getEmail());
            errors.add("Email domain '" + domain + "' is not authorized. Please use your academic institution email.");
        }

        // Check for existing username
        if (userRepository.existsByUsername(request.getUsername())) {
            errors.add("Username '" + request.getUsername() + "' is already taken");
        }

        // Check for existing email
        if (userRepository.existsByEmail(request.getEmail())) {
            errors.add("Email '" + request.getEmail() + "' is already registered");
        }

        // Validate role
        Role role = Role.USER; // Default role
        if (request.getRole() != null && !request.getRole().isEmpty()) {
            try {
                role = Role.valueOf(request.getRole().toUpperCase());
            } catch (IllegalArgumentException e) {
                errors.add("Invalid role. Must be one of: USER, EXPERT, ADMIN");
            }
        }

        // If there are errors, return them all
        if (!errors.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(
                            "Registration failed: " + String.join("; ", errors),
                            false,
                            errors
                    ));
        }

        // Create new user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setFullName(request.getFullName());
        user.setRole(role);
        user.setIsActive(true);
        user.setEmailVerified(false); // Email not verified yet
        user.setTopicsOfInterest(new ArrayList<>());
        user.setPreferredLanguages(new ArrayList<>());

        userRepository.save(user);

        // Send verification email
        try {
            emailVerificationService.createAndSendVerificationToken(user);
            logger.info("Verification email sent to user: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Failed to send verification email to {}: {}", user.getEmail(), e.getMessage());
            // Continue with registration even if email fails
        }

        return ResponseEntity.ok(new AuthDto.MessageResponse(
                "User registered successfully! Please check your email to verify your account.", 
                true
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody AuthDto.LoginRequest request, BindingResult bindingResult) {
        // Check for validation errors
        if (bindingResult.hasErrors()) {
            List<String> errors = bindingResult.getFieldErrors().stream()
                    .map(FieldError::getDefaultMessage)
                    .collect(Collectors.toList());
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse("Login failed: " + String.join("; ", errors), false, errors));
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();

            User user = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Check if email is verified (only for manual registration users)
            if (!user.getEmailVerified() && user.getGoogleSub() == null) {
                List<String> errors = List.of("Please verify your email address before logging in. Check your inbox for the verification link.");
                return ResponseEntity.status(403)
                        .body(new AuthDto.MessageResponse(
                                "Email not verified",
                                false,
                                errors,
                                "EMAIL_NOT_VERIFIED"
                        ));
            }

            // Generate JWT token
            String jwt = jwtUtils.generateToken(userDetails);

            // Get institution name from email domain
            String institutionName = emailDomainService.getInstitutionName(user.getEmail());

            // Create user info response
            AuthDto.UserInfo userInfo = new AuthDto.UserInfo(
                    user.getId(),
                    user.getUsername(),
            // Check if user can login (not banned, suspended, deleted, or inactive)
            if (!user.canLogin()) {
                String errorMessage = "Account is not active";
                if (user.isBanned()) {
                    errorMessage = "Account has been banned";
                } else if (user.isSuspended()) {
                    errorMessage = "Account is suspended until " + user.getSuspendedUntil();
                } else if (user.getIsDeleted()) {
                    errorMessage = "Account has been deleted";
                }
                return ResponseEntity.status(403)
                        .body(new AuthDto.MessageResponse("Login failed: " + errorMessage, false, List.of(errorMessage)));
            }

            // Update last login timestamp
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);

            return ResponseEntity.ok(new AuthDto.JwtResponse(
                    jwt, 
                    user.getId(), 
                    user.getUsername(), 
                    user.getEmail(),
                    user.getRole().name(),
                    user.getFullName(),
                    user.getEmailVerified(),
                    institutionName
            );

            return ResponseEntity.ok(new AuthDto.JwtResponse(jwt, userInfo));
        } catch (BadCredentialsException e) {
            List<String> errors = List.of("Invalid username or password");
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse("Login failed: Invalid username or password", false, errors));
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody AuthDto.UserProfileRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getTopicsOfInterest() != null) {
            user.setTopicsOfInterest(request.getTopicsOfInterest());
        }
        if (request.getProficiencyLevel() != null) {
            user.setProficiencyLevel(request.getProficiencyLevel());
        }
        if (request.getPreferredLanguages() != null) {
            user.setPreferredLanguages(request.getPreferredLanguages());
        }
        if (request.getAvailability() != null) {
            user.setAvailability(request.getAvailability());
        }
        if (request.getCollaborationStyle() != null) {
            user.setCollaborationStyle(request.getCollaborationStyle());
        }

        userRepository.save(user);

        return ResponseEntity.ok(new AuthDto.MessageResponse("Profile updated successfully!", true));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(AuthDto.UserResponse.fromUser(user));
    }

    /**
     * Verify email with token
     */
    @GetMapping("/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestParam String token) {
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse("Verification token is required", false));
        }

        boolean verified = emailVerificationService.verifyEmail(token);
        
        if (verified) {
            return ResponseEntity.ok(new AuthDto.MessageResponse(
                    "Email verified successfully! You can now log in.", 
                    true
            ));
        } else {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(
                            "Invalid or expired verification token. Please request a new verification email.", 
                            false
                    ));
        }
    }

    /**
     * Resend verification email
     */
    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerification(@Valid @RequestBody AuthDto.ResendVerificationRequest request, 
                                                 BindingResult bindingResult) {
        if (bindingResult.hasErrors()) {
            List<String> errors = bindingResult.getFieldErrors().stream()
                    .map(FieldError::getDefaultMessage)
                    .collect(Collectors.toList());
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse("Invalid request", false, errors));
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElse(null);

        if (user == null) {
            // Don't reveal if email exists or not for security
            return ResponseEntity.ok(new AuthDto.MessageResponse(
                    "If an account with this email exists and is not verified, a verification email has been sent.", 
                    true
            ));
        }

        // Check if already verified
        if (user.getEmailVerified()) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(
                            "This email is already verified. You can log in directly.", 
                            false
                    ));
        }

        // Check if user is a Google OAuth user
        if (user.getGoogleSub() != null) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(
                            "This account uses Google Sign-In and doesn't require email verification.", 
                            false
                    ));
        }

        // Send new verification email
        try {
            emailVerificationService.createAndSendVerificationToken(user);
            logger.info("Resent verification email to: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Failed to resend verification email to {}: {}", user.getEmail(), e.getMessage());
            return ResponseEntity.status(500)
                    .body(new AuthDto.MessageResponse(
                            "Failed to send verification email. Please try again later.", 
                            false
                    ));
        }

        return ResponseEntity.ok(new AuthDto.MessageResponse(
                "If an account with this email exists and is not verified, a verification email has been sent.", 
                true
        ));
    }

    /**
     * Initiate Google account linking
     * Requires user to be authenticated (logged in with password)
     * Returns OAuth URL with linking token
     */
    @PostMapping("/link-google")
    public ResponseEntity<?> initiateGoogleLinking() {
        // Get authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401)
                    .body(new AuthDto.MessageResponse(
                            "Authentication required. Please log in first.",
                            false,
                            List.of("You must be logged in to link your Google account.")
                    ));
        }

        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Check if Google account is already linked
        if (user.getGoogleSub() != null) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse(
                            "Google account is already linked to this account.",
                            false,
                            List.of("Your Google account is already linked.")
                    ));
        }

        // Generate linking token
        String linkingToken = linkingService.generateLinkingToken(user.getId(), user.getEmail());

        // Build OAuth URL with linking token
        // The frontend will redirect to this URL
        String oauthUrl = "/oauth2/authorization/google?linkToken=" + linkingToken;

        logger.info("Generated linking token for user: {} (ID: {})", username, user.getId());

        return ResponseEntity.ok(Map.of(
                "oauthUrl", oauthUrl,
                "message", "Redirect to the provided OAuth URL to complete Google account linking."
        ));
    }
}
