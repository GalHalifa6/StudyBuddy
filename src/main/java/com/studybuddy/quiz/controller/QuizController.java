package com.studybuddy.quiz.controller;

import com.studybuddy.quiz.dto.QuizDto;
import com.studybuddy.user.model.User;
import com.studybuddy.user.repository.UserRepository;
import com.studybuddy.quiz.service.QuizService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Quiz Controller - Handles characteristic profiling system.
 * 
 * Endpoints:
 * - GET /api/quiz - Get quiz questions
 * - POST /api/quiz/submit - Submit answers and generate profile (supports partial completion)
 * - POST /api/quiz/skip - Skip the quiz entirely
 * - GET /api/quiz/profile - Get current user's profile and onboarding status
 * - GET /api/quiz/onboarding-status - Quick check if user requires onboarding (for post-login redirect)
 * 
 * Flow:
 * 1. User registers/logs in
 * 2. Frontend calls /api/quiz/onboarding-status or /api/quiz/profile
 * 3. If requiresOnboarding=true, redirect to Onboarding page
 * 4. User can either complete quiz, partially complete it, or skip it
 * 5. Partial completion provides partial matching (lower reliability)
 */
@RestController
@RequestMapping("/api/quiz")
@RequiredArgsConstructor
@Slf4j
public class QuizController {
    
    private final QuizService quizService;
    private final UserRepository userRepository;
    
    /**
     * GET /api/quiz
     * 
     * Get the characteristic profiling quiz.
     * Returns only unanswered questions for the current user.
     */
    @GetMapping
    public ResponseEntity<List<QuizDto.QuestionResponse>> getQuiz(Authentication authentication) {
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        log.info("Fetching quiz questions for user {}", currentUser.getId());
        List<QuizDto.QuestionResponse> quiz = quizService.getQuiz(currentUser);
        return ResponseEntity.ok(quiz);
    }
    
    /**
     * POST /api/quiz/submit
     * 
     * Submit quiz answers and generate characteristic profile.
     */
    @PostMapping("/submit")
    public ResponseEntity<QuizDto.ProfileResponse> submitQuiz(
            @Valid @RequestBody QuizDto.QuizSubmissionRequest request,
            Authentication authentication) {
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        log.info("User {} submitting quiz", currentUser.getId());
        
        QuizDto.ProfileResponse response = quizService.submitQuiz(currentUser, request);
        return ResponseEntity.ok(response);
    }
    
    /**
     * GET /api/quiz/onboarding-status
     * 
     * Quick endpoint to check if user requires onboarding.
     * Frontend can call this after login to decide whether to redirect.
     */
    @GetMapping("/onboarding-status")
    public ResponseEntity<QuizDto.OnboardingStatusResponse> getOnboardingStatus(Authentication authentication) {
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        QuizDto.ProfileResponse profile = quizService.getUserProfile(currentUser);
        
        return ResponseEntity.ok(QuizDto.OnboardingStatusResponse.builder()
                .userId(currentUser.getId())
                .requiresOnboarding(profile.getRequiresOnboarding())
                .quizStatus(profile.getQuizStatus())
                .build());
    }
    
    /**
     * POST /api/quiz/skip
     * 
     * Skip the quiz entirely. User will not have a characteristic profile.
     */
    @PostMapping("/skip")
    public ResponseEntity<QuizDto.ProfileResponse> skipQuiz(Authentication authentication) {
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        log.info("User {} skipping quiz", currentUser.getId());
        
        QuizDto.ProfileResponse response = quizService.skipQuiz(currentUser);
        return ResponseEntity.ok(response);
    }
    
    /**
     * GET /api/quiz/profile
     * 
     * Get current user's characteristic profile.
     */
    @GetMapping("/profile")
    public ResponseEntity<QuizDto.ProfileResponse> getProfile(Authentication authentication) {
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        log.info("Fetching profile for user {}", currentUser.getId());
        
        QuizDto.ProfileResponse response = quizService.getUserProfile(currentUser);
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/quiz/answers
     * 
     * Get saved quiz answers (for resuming in-progress quiz).
     */
    @GetMapping("/answers")
    public ResponseEntity<QuizDto.SavedAnswersResponse> getSavedAnswers(Authentication authentication) {
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        log.info("Fetching saved answers for user {}", currentUser.getId());
        
        QuizDto.SavedAnswersResponse response = quizService.getSavedAnswers(currentUser);
        return ResponseEntity.ok(response);
    }
}
