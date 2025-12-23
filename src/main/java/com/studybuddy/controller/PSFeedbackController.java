package com.studybuddy.controller;

import com.studybuddy.dto.FeedbackDto;
import com.studybuddy.model.ExpertSession;
import com.studybuddy.model.SafetyFeedback;
import com.studybuddy.model.StudyGroup;
import com.studybuddy.model.User;
import com.studybuddy.repository.ExpertSessionRepository;
import com.studybuddy.repository.SafetyFeedbackRepository;
import com.studybuddy.repository.StudyGroupRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Psychological Safety Feedback Controller.
 * 
 * Handles collection of immutable ground truth data for future ML training.
 * 
 * Endpoints:
 * - POST /api/feedback - Submit psychological safety feedback
 * - GET /api/feedback/history - Get user's feedback history
 */
@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
@Slf4j
public class PSFeedbackController {
    
    private final SafetyFeedbackRepository feedbackRepository;
    private final StudyGroupRepository groupRepository;
    private final ExpertSessionRepository sessionRepository;
    
    /**
     * POST /api/feedback
     * 
     * Submit psychological safety feedback (immutable ML data).
     */
    @PostMapping
    public ResponseEntity<FeedbackDto.Response> submitFeedback(
            @Valid @RequestBody FeedbackDto.SubmitRequest request,
            Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        log.info("User {} submitting safety feedback for group {}", 
                currentUser.getId(), request.getGroupId());
        
        // Validate group exists
        StudyGroup group = groupRepository.findById(request.getGroupId())
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));
        
        // Validate session if provided
        ExpertSession session = null;
        if (request.getSessionId() != null) {
            session = sessionRepository.findById(request.getSessionId())
                    .orElseThrow(() -> new IllegalArgumentException("Session not found"));
        }
        
        // Check for duplicate feedback
        if (request.getSessionId() != null && 
            feedbackRepository.existsByStudentIdAndGroupIdAndSessionId(
                    currentUser.getId(), request.getGroupId(), request.getSessionId())) {
            throw new IllegalStateException("Feedback already submitted for this session");
        }
        
        // Create immutable feedback record
        SafetyFeedback feedback = SafetyFeedback.builder()
                .student(currentUser)
                .group(group)
                .session(session)
                .psScore(request.getPsScore())
                .verbalFeedback(request.getVerbalFeedback())
                .participationLevel(request.getParticipationLevel())
                .conflictLevel(request.getConflictLevel())
                .wouldRecommend(request.getWouldRecommend())
                .build();
        
        feedback = feedbackRepository.save(feedback);
        
        log.info("Safety feedback saved: ID = {}", feedback.getId());
        
        FeedbackDto.Response response = FeedbackDto.Response.builder()
                .feedbackId(feedback.getId())
                .message("Thank you for your feedback!")
                .submittedAt(feedback.getSubmittedAt().format(DateTimeFormatter.ISO_DATE_TIME))
                .build();
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * GET /api/feedback/history
     * 
     * Get user's feedback history.
     */
    @GetMapping("/history")
    public ResponseEntity<List<FeedbackDto.Response>> getFeedbackHistory(Authentication authentication) {
        User currentUser = (User) authentication.getPrincipal();
        log.info("Fetching feedback history for user {}", currentUser.getId());
        
        List<SafetyFeedback> feedbackList = feedbackRepository.findByStudentIdOrderBySubmittedAtDesc(currentUser.getId());
        
        List<FeedbackDto.Response> responses = feedbackList.stream()
                .map(feedback -> FeedbackDto.Response.builder()
                        .feedbackId(feedback.getId())
                        .message("PS Score: " + feedback.getPsScore())
                        .submittedAt(feedback.getSubmittedAt().format(DateTimeFormatter.ISO_DATE_TIME))
                        .build())
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(responses);
    }
}
