package com.studybuddy.expert.controller;

import com.studybuddy.user.model.*;
import com.studybuddy.expert.model.*;
import com.studybuddy.user.repository.*;
import com.studybuddy.expert.repository.*;
import com.studybuddy.notification.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Review Controller - Handles student reviews for experts
 */
@RestController
@RequestMapping("/api/experts")
public class ReviewController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExpertReviewRepository reviewRepository;

    @Autowired
    private ExpertProfileRepository expertProfileRepository;

    @Autowired
    private ExpertSessionRepository sessionRepository;

    @Autowired
    private ExpertQuestionRepository questionRepository;

    @Autowired
    private SessionParticipantRepository participantRepository;

    @Autowired
    private NotificationService notificationService;

    /**
     * Submit a review for an expert
     * Validates that the student has had a session with the expert or had a question answered
     */
    @PostMapping("/{expertUserId}/reviews")
    public ResponseEntity<?> submitReview(
            @PathVariable Long expertUserId,
            @Valid @RequestBody CreateReviewRequest request) {
        try {
            User student = getCurrentUser();
            User expert = userRepository.findById(expertUserId)
                .orElseThrow(() -> new RuntimeException("Expert not found"));
            
            // Verify the student has interacted with this expert
            boolean hasInteracted = verifyStudentExpertInteraction(student.getId(), expert.getId());
            
            if (!hasInteracted) {
                return ResponseEntity.badRequest().body(Map.of(
                    "message", "You can only review experts you have had a session with or who have answered your questions"
                ));
            }
            
            // Check if student already reviewed this expert (prevent duplicates)
            boolean alreadyReviewed = checkAlreadyReviewed(student.getId(), expert.getId());
            if (alreadyReviewed) {
                return ResponseEntity.badRequest().body(Map.of(
                    "message", "You have already submitted a review for this expert"
                ));
            }
            
            // Create the review
            ExpertReview review = new ExpertReview();
            review.setExpert(expert);
            review.setStudent(student);
            review.setRating(request.getRating());
            review.setKnowledgeRating(request.getKnowledgeRating());
            review.setCommunicationRating(request.getCommunicationRating());
            review.setResponsivenessRating(request.getResponsivenessRating());
            review.setHelpfulnessRating(request.getHelpfulnessRating());
            review.setReview(request.getReview());
            review.setHighlights(request.getHighlights());
            review.setImprovements(request.getImprovements());
            review.setIsAnonymous(request.getIsAnonymous() != null ? request.getIsAnonymous() : false);
            review.setIsPublic(request.getIsPublic() != null ? request.getIsPublic() : true);
            review.setIsApproved(true); // Auto-approve for now
            
            // Link to session if provided
            if (request.getSessionId() != null) {
                ExpertSession session = sessionRepository.findById(request.getSessionId()).orElse(null);
                if (session != null) {
                    review.setSession(session);
                }
            }
            
            // Link to question if provided
            if (request.getQuestionId() != null) {
                ExpertQuestion question = questionRepository.findById(request.getQuestionId()).orElse(null);
                if (question != null) {
                    review.setQuestion(question);
                }
            }
            
            ExpertReview savedReview = reviewRepository.save(review);
            
            // Update expert's rating statistics
            updateExpertRating(expert.getId());
            
            // Notify the expert
            notificationService.createActionableNotification(
                expert,
                "NEW_REVIEW",
                "New Review Received",
                String.format("%s gave you a %d-star review", 
                    Boolean.TRUE.equals(request.getIsAnonymous()) ? "Anonymous" : student.getFullName(),
                    request.getRating()),
                savedReview.getId(),
                "REVIEW",
                student.getId()
            );
            
            return ResponseEntity.ok(toReviewResponse(savedReview));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Check if student has interacted with the expert
     */
    private boolean verifyStudentExpertInteraction(Long studentId, Long expertId) {
        // Check 1: Has the student participated in any of the expert's sessions?
        List<ExpertSession> expertSessions = sessionRepository.findByExpertIdOrderByScheduledStartTimeDesc(expertId);
        for (ExpertSession session : expertSessions) {
            // Check if student was the assigned student for one-on-one
            if (session.getStudent() != null && session.getStudent().getId().equals(studentId)) {
                // Only count completed sessions
                if (session.getStatus() == ExpertSession.SessionStatus.COMPLETED) {
                    return true;
                }
            }
            // Check if student participated in the session
            if (participantRepository.existsBySessionIdAndUserId(session.getId(), studentId)) {
                // Only count if session is completed
                if (session.getStatus() == ExpertSession.SessionStatus.COMPLETED) {
                    return true;
                }
            }
        }
        
        // Check 2: Has the expert answered any of the student's questions?
        List<ExpertQuestion> studentQuestions = questionRepository.findByStudentIdOrderByCreatedAtDesc(studentId);
        for (ExpertQuestion question : studentQuestions) {
            if (question.getAnsweredBy() != null && question.getAnsweredBy().getId().equals(expertId)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Check if student already reviewed this expert
     */
    private boolean checkAlreadyReviewed(Long studentId, Long expertId) {
        List<ExpertReview> existingReviews = reviewRepository
            .findByExpertIdAndIsApprovedTrueAndIsPublicTrueOrderByCreatedAtDesc(expertId);
        return existingReviews.stream()
            .anyMatch(r -> r.getStudent().getId().equals(studentId));
    }

    /**
     * Update expert's rating statistics
     */
    private void updateExpertRating(Long expertId) {
        ExpertProfile profile = expertProfileRepository.findByUserId(expertId).orElse(null);
        if (profile != null) {
            Double avgRating = reviewRepository.getAverageRatingForExpert(expertId);
            long totalRatings = reviewRepository.countByExpertIdAndIsApprovedTrue(expertId);
            
            profile.setAverageRating(avgRating != null ? avgRating : 0.0);
            profile.setTotalRatings((int) totalRatings);
            expertProfileRepository.save(profile);
        }
    }

    /**
     * Check if current user can review an expert
     */
    @GetMapping("/{expertUserId}/can-review")
    public ResponseEntity<?> canReviewExpert(@PathVariable Long expertUserId) {
        User student = getCurrentUser();
        
        boolean hasInteracted = verifyStudentExpertInteraction(student.getId(), expertUserId);
        boolean alreadyReviewed = checkAlreadyReviewed(student.getId(), expertUserId);
        
        return ResponseEntity.ok(Map.of(
            "canReview", hasInteracted && !alreadyReviewed,
            "hasInteracted", hasInteracted,
            "alreadyReviewed", alreadyReviewed
        ));
    }

    /**
     * Mark a review as helpful
     */
    @PostMapping("/reviews/{reviewId}/helpful")
    public ResponseEntity<?> markReviewHelpful(@PathVariable Long reviewId) {
        ExpertReview review = reviewRepository.findById(reviewId)
            .orElseThrow(() -> new RuntimeException("Review not found"));
        
        review.setHelpfulCount(review.getHelpfulCount() + 1);
        reviewRepository.save(review);
        
        return ResponseEntity.ok(Map.of("helpfulCount", review.getHelpfulCount()));
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Map<String, Object> toReviewResponse(ExpertReview review) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", review.getId());
        map.put("expertId", review.getExpert().getId());
        map.put("expertName", review.getExpert().getFullName());
        map.put("rating", review.getRating());
        map.put("knowledgeRating", review.getKnowledgeRating());
        map.put("communicationRating", review.getCommunicationRating());
        map.put("responsivenessRating", review.getResponsivenessRating());
        map.put("helpfulnessRating", review.getHelpfulnessRating());
        map.put("review", review.getReview());
        map.put("highlights", review.getHighlights());
        map.put("improvements", review.getImprovements());
        map.put("isAnonymous", review.getIsAnonymous());
        map.put("helpfulCount", review.getHelpfulCount());
        map.put("expertResponse", review.getExpertResponse());
        map.put("expertRespondedAt", review.getExpertRespondedAt());
        map.put("createdAt", review.getCreatedAt());
        
        // Student info (if not anonymous)
        if (!Boolean.TRUE.equals(review.getIsAnonymous()) && review.getStudent() != null) {
            Map<String, Object> student = new HashMap<>();
            student.put("id", review.getStudent().getId());
            student.put("fullName", review.getStudent().getFullName());
            student.put("username", review.getStudent().getUsername());
            map.put("student", student);
        }
        
        return map;
    }

    // Request DTO
    public static class CreateReviewRequest {
        private Integer rating;
        private Integer knowledgeRating;
        private Integer communicationRating;
        private Integer responsivenessRating;
        private Integer helpfulnessRating;
        private String review;
        private String highlights;
        private String improvements;
        private Boolean isAnonymous;
        private Boolean isPublic;
        private Long sessionId;
        private Long questionId;

        // Getters and setters
        public Integer getRating() { return rating; }
        public void setRating(Integer rating) { this.rating = rating; }
        public Integer getKnowledgeRating() { return knowledgeRating; }
        public void setKnowledgeRating(Integer knowledgeRating) { this.knowledgeRating = knowledgeRating; }
        public Integer getCommunicationRating() { return communicationRating; }
        public void setCommunicationRating(Integer communicationRating) { this.communicationRating = communicationRating; }
        public Integer getResponsivenessRating() { return responsivenessRating; }
        public void setResponsivenessRating(Integer responsivenessRating) { this.responsivenessRating = responsivenessRating; }
        public Integer getHelpfulnessRating() { return helpfulnessRating; }
        public void setHelpfulnessRating(Integer helpfulnessRating) { this.helpfulnessRating = helpfulnessRating; }
        public String getReview() { return review; }
        public void setReview(String review) { this.review = review; }
        public String getHighlights() { return highlights; }
        public void setHighlights(String highlights) { this.highlights = highlights; }
        public String getImprovements() { return improvements; }
        public void setImprovements(String improvements) { this.improvements = improvements; }
        public Boolean getIsAnonymous() { return isAnonymous; }
        public void setIsAnonymous(Boolean isAnonymous) { this.isAnonymous = isAnonymous; }
        public Boolean getIsPublic() { return isPublic; }
        public void setIsPublic(Boolean isPublic) { this.isPublic = isPublic; }
        public Long getSessionId() { return sessionId; }
        public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
        public Long getQuestionId() { return questionId; }
        public void setQuestionId(Long questionId) { this.questionId = questionId; }
    }
}
