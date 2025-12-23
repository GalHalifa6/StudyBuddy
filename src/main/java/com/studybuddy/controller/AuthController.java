package com.studybuddy.controller;

import com.studybuddy.dto.AuthDto;
import com.studybuddy.model.Role;
import com.studybuddy.model.User;
import com.studybuddy.repository.UserRepository;
import com.studybuddy.security.JwtUtils;
import jakarta.validation.Valid;
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
import java.util.HashMap;
import java.util.LinkedHashMap;
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

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    private User resolveCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            throw new RuntimeException("User not authenticated");
        }

        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found in database"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody AuthDto.RegisterRequest request, BindingResult bindingResult) {
        // Collect validation errors
        List<String> errors = new ArrayList<>();
        
        if (bindingResult.hasErrors()) {
            errors.addAll(bindingResult.getFieldErrors().stream()
                    .map(FieldError::getDefaultMessage)
                    .collect(Collectors.toList()));
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
                Role requestedRole = Role.valueOf(request.getRole().toUpperCase());
                if (requestedRole == Role.ADMIN) {
                    errors.add("Administrator accounts can only be created by the platform team.");
                } else {
                    role = requestedRole;
                }
            } catch (IllegalArgumentException e) {
                errors.add("Invalid role. Must be USER or EXPERT");
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
        user.setTopicsOfInterest(new ArrayList<>());
        user.setPreferredLanguages(new ArrayList<>());
        user.setQuestionnaireResponses(new HashMap<>());

        boolean isStudent = role == Role.USER;
        user.setOnboardingCompleted(!isStudent);
        user.setOnboardingCompletedAt(isStudent ? null : LocalDateTime.now());

        userRepository.save(user);

        return ResponseEntity.ok(new AuthDto.MessageResponse("User registered successfully as " + role.getDisplayName() + "!", true));
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
            String jwt = jwtUtils.generateToken(userDetails);

            User user = userRepository.findByUsername(userDetails.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            return ResponseEntity.ok(new AuthDto.JwtResponse(
                    jwt, 
                    user.getId(), 
                    user.getUsername(), 
                    user.getEmail(),
                    user.getRole().name(),
                    user.getFullName()
            ));
        } catch (BadCredentialsException e) {
            List<String> errors = List.of("Invalid username or password");
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse("Login failed: Invalid username or password", false, errors));
        }
    }

    @PostMapping("/onboarding")
    public ResponseEntity<?> submitOnboarding(@RequestBody AuthDto.OnboardingRequest request) {
        User user = resolveCurrentUser();

        if (request == null) {
            return ResponseEntity.badRequest()
                    .body(new AuthDto.MessageResponse("Invalid onboarding payload", false));
        }

        if (request.isSkip()) {
            user.setQuestionnaireResponses(new LinkedHashMap<>());
        } else if (request.getResponses() != null) {
            Map<String, String> responsesMap = request.getResponses().stream()
                    .filter(answer -> answer.getQuestionKey() != null && answer.getAnswer() != null)
                    .collect(Collectors.toMap(
                            AuthDto.QuestionnaireAnswer::getQuestionKey,
                            AuthDto.QuestionnaireAnswer::getAnswer,
                            (existing, replacement) -> replacement,
                            LinkedHashMap::new
                    ));
            user.setQuestionnaireResponses(responsesMap);
        }

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

        user.setOnboardingCompleted(true);
        user.setOnboardingCompletedAt(LocalDateTime.now());

        userRepository.save(user);

        return ResponseEntity.ok(new AuthDto.MessageResponse("Onboarding responses saved successfully", true));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@Valid @RequestBody AuthDto.UserProfileRequest request) {
        User user = resolveCurrentUser();

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
        if (request.getQuestionnaireResponses() != null) {
            user.setQuestionnaireResponses(new LinkedHashMap<>(request.getQuestionnaireResponses()));
        }

        userRepository.save(user);

        return ResponseEntity.ok(new AuthDto.MessageResponse("Profile updated successfully!", true));
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        try {
            User user = resolveCurrentUser();
            return ResponseEntity.ok(AuthDto.UserResponse.fromUser(user));
        } catch (RuntimeException e) {
            // Return 401 Unauthorized if user is not authenticated
            return ResponseEntity.status(401)
                    .body(new AuthDto.MessageResponse("Authentication required", false));
        }
    }
}
