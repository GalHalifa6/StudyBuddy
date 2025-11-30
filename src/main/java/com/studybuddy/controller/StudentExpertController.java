package com.studybuddy.controller;

import com.studybuddy.dto.ExpertDto;
import com.studybuddy.model.*;
import com.studybuddy.repository.*;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Student-Expert Interaction Controller
 * Handles student-side interactions with experts: asking questions, booking sessions, leaving reviews
 */
@RestController
@RequestMapping("/api/student-expert")
public class StudentExpertController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExpertProfileRepository expertProfileRepository;

    @Autowired
    private ExpertSessionRepository sessionRepository;

    @Autowired
    private ExpertQuestionRepository questionRepository;

    @Autowired
    private ExpertReviewRepository reviewRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private StudyGroupRepository groupRepository;

    // ==================== Questions (Ask Expert) ====================

    /**
     * Ask a question to experts
     */
    @PostMapping("/questions")
    public ResponseEntity<?> askQuestion(@Valid @RequestBody ExpertDto.QuestionRequest request) {
        try {
            User student = getCurrentUser();

            ExpertQuestion question = ExpertQuestion.builder()
                    .student(student)
                    .title(request.getTitle())
                    .content(request.getContent())
                    .codeSnippet(request.getCodeSnippet())
                    .programmingLanguage(request.getProgrammingLanguage())
                    .status(ExpertQuestion.QuestionStatus.OPEN)
                    .priority(request.getIsUrgent() != null && request.getIsUrgent() ? 
                            ExpertQuestion.QuestionPriority.URGENT : ExpertQuestion.QuestionPriority.NORMAL)
                    .tags(request.getTags())
                    .isPublic(request.getIsPublic() != null ? request.getIsPublic() : true)
                    .isAnonymous(request.getIsAnonymous() != null ? request.getIsAnonymous() : false)
                    .dueDate(request.getDueDate())
                    .isUrgent(request.getIsUrgent() != null ? request.getIsUrgent() : false)
                    .attachments(request.getAttachments())
                    .build();

            // Assign to specific expert if provided
            if (request.getExpertId() != null) {
                User expert = userRepository.findById(request.getExpertId())
                        .orElseThrow(() -> new RuntimeException("Expert not found"));
                question.setExpert(expert);
                question.setStatus(ExpertQuestion.QuestionStatus.ASSIGNED);
            }

            // Set course if provided
            if (request.getCourseId() != null) {
                Course course = courseRepository.findById(request.getCourseId())
                        .orElseThrow(() -> new RuntimeException("Course not found"));
                question.setCourse(course);
            }

            // Set study group if provided
            if (request.getGroupId() != null) {
                StudyGroup group = groupRepository.findById(request.getGroupId())
                        .orElseThrow(() -> new RuntimeException("Group not found"));
                question.setStudyGroup(group);
            }

            ExpertQuestion savedQuestion = questionRepository.save(question);
            return ResponseEntity.ok(toQuestionResponse(savedQuestion));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get my questions
     */
    @GetMapping("/my-questions")
    public ResponseEntity<List<ExpertDto.QuestionResponse>> getMyQuestions() {
        User student = getCurrentUser();
        List<ExpertQuestion> questions = questionRepository.findByStudentIdOrderByCreatedAtDesc(student.getId());
        return ResponseEntity.ok(questions.stream().map(this::toQuestionResponse).collect(Collectors.toList()));
    }

    /**
     * Get question by ID
     */
    @GetMapping("/questions/{questionId}")
    public ResponseEntity<?> getQuestion(@PathVariable Long questionId) {
        ExpertQuestion question = questionRepository.findById(questionId)
                .orElse(null);

        if (question == null) {
            return ResponseEntity.notFound().build();
        }

        // Increment view count
        question.incrementViews();
        questionRepository.save(question);

        return ResponseEntity.ok(toQuestionResponse(question));
    }

    /**
     * Get public questions
     */
    @GetMapping("/questions/public")
    public ResponseEntity<List<ExpertDto.QuestionResponse>> getPublicQuestions() {
        List<ExpertQuestion> questions = questionRepository.findByIsPublicTrueOrderByCreatedAtDesc();
        return ResponseEntity.ok(questions.stream().map(this::toQuestionResponse).collect(Collectors.toList()));
    }

    /**
     * Search questions
     */
    @GetMapping("/questions/search")
    public ResponseEntity<List<ExpertDto.QuestionResponse>> searchQuestions(@RequestParam String query) {
        List<ExpertQuestion> questions = questionRepository.searchQuestions(query);
        return ResponseEntity.ok(questions.stream().map(this::toQuestionResponse).collect(Collectors.toList()));
    }

    /**
     * Get trending questions
     */
    @GetMapping("/questions/trending")
    public ResponseEntity<List<ExpertDto.QuestionResponse>> getTrendingQuestions() {
        Page<ExpertQuestion> questions = questionRepository.findTrendingQuestions(PageRequest.of(0, 20));
        return ResponseEntity.ok(questions.stream().map(this::toQuestionResponse).collect(Collectors.toList()));
    }

    /**
     * Get questions by course
     */
    @GetMapping("/questions/course/{courseId}")
    public ResponseEntity<List<ExpertDto.QuestionResponse>> getQuestionsByCourse(@PathVariable Long courseId) {
        List<ExpertQuestion> questions = questionRepository.findByCourseIdAndIsPublicTrueOrderByCreatedAtDesc(courseId);
        return ResponseEntity.ok(questions.stream().map(this::toQuestionResponse).collect(Collectors.toList()));
    }

    /**
     * Upvote a question
     */
    @PostMapping("/questions/{questionId}/upvote")
    public ResponseEntity<?> upvoteQuestion(@PathVariable Long questionId) {
        ExpertQuestion question = questionRepository.findById(questionId)
                .orElse(null);

        if (question == null) {
            return ResponseEntity.notFound().build();
        }

        question.upvote();
        questionRepository.save(question);

        return ResponseEntity.ok(Map.of("upvotes", question.getUpvotes(), "netVotes", question.getNetVotes()));
    }

    /**
     * Downvote a question
     */
    @PostMapping("/questions/{questionId}/downvote")
    public ResponseEntity<?> downvoteQuestion(@PathVariable Long questionId) {
        ExpertQuestion question = questionRepository.findById(questionId)
                .orElse(null);

        if (question == null) {
            return ResponseEntity.notFound().build();
        }

        question.downvote();
        questionRepository.save(question);

        return ResponseEntity.ok(Map.of("downvotes", question.getDownvotes(), "netVotes", question.getNetVotes()));
    }

    /**
     * Accept an answer
     */
    @PostMapping("/questions/{questionId}/accept-answer")
    public ResponseEntity<?> acceptAnswer(@PathVariable Long questionId) {
        try {
            User student = getCurrentUser();
            ExpertQuestion question = questionRepository.findById(questionId)
                    .orElseThrow(() -> new RuntimeException("Question not found"));

            if (!question.getStudent().getId().equals(student.getId())) {
                return ResponseEntity.status(403).body(Map.of("message", "Only the question author can accept the answer"));
            }

            if (question.getAnswer() == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Question has not been answered yet"));
            }

            question.acceptAnswer();
            questionRepository.save(question);

            // Update expert stats
            if (question.getAnsweredBy() != null) {
                ExpertProfile profile = expertProfileRepository.findByUser(question.getAnsweredBy()).orElse(null);
                if (profile != null) {
                    profile.incrementHelpfulAnswers();
                    expertProfileRepository.save(profile);
                }
            }

            return ResponseEntity.ok(toQuestionResponse(question));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Mark answer as helpful
     */
    @PostMapping("/questions/{questionId}/helpful")
    public ResponseEntity<?> markAnswerHelpful(@PathVariable Long questionId, @RequestBody Map<String, Object> body) {
        try {
            User student = getCurrentUser();
            ExpertQuestion question = questionRepository.findById(questionId)
                    .orElseThrow(() -> new RuntimeException("Question not found"));

            if (!question.getStudent().getId().equals(student.getId())) {
                return ResponseEntity.status(403).body(Map.of("message", "Only the question author can rate the answer"));
            }

            boolean helpful = (Boolean) body.getOrDefault("helpful", true);
            String feedback = (String) body.get("feedback");

            question.markAsHelpful(helpful, feedback);
            questionRepository.save(question);

            // Update expert stats if helpful
            if (helpful && question.getAnsweredBy() != null) {
                ExpertProfile profile = expertProfileRepository.findByUser(question.getAnsweredBy()).orElse(null);
                if (profile != null) {
                    profile.incrementHelpfulAnswers();
                    // Also increment students helped counter when marking answer as helpful
                    profile.incrementStudentsHelped();
                    expertProfileRepository.save(profile);
                }
            }

            return ResponseEntity.ok(Map.of("message", "Feedback recorded"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Ask a follow-up question
     */
    @PostMapping("/questions/{questionId}/follow-up")
    public ResponseEntity<?> askFollowUp(@PathVariable Long questionId, @Valid @RequestBody ExpertDto.QuestionRequest request) {
        try {
            User student = getCurrentUser();
            ExpertQuestion parentQuestion = questionRepository.findById(questionId)
                    .orElseThrow(() -> new RuntimeException("Original question not found"));

            ExpertQuestion followUp = ExpertQuestion.builder()
                    .student(student)
                    .title(request.getTitle())
                    .content(request.getContent())
                    .codeSnippet(request.getCodeSnippet())
                    .programmingLanguage(request.getProgrammingLanguage())
                    .status(ExpertQuestion.QuestionStatus.OPEN)
                    .priority(ExpertQuestion.QuestionPriority.NORMAL)
                    .tags(request.getTags())
                    .isPublic(parentQuestion.getIsPublic())
                    .isAnonymous(request.getIsAnonymous() != null ? request.getIsAnonymous() : false)
                    .parentQuestion(parentQuestion)
                    .expert(parentQuestion.getAnsweredBy()) // Assign to the same expert who answered
                    .course(parentQuestion.getCourse())
                    .studyGroup(parentQuestion.getStudyGroup())
                    .build();

            if (followUp.getExpert() != null) {
                followUp.setStatus(ExpertQuestion.QuestionStatus.ASSIGNED);
            }

            ExpertQuestion savedFollowUp = questionRepository.save(followUp);
            return ResponseEntity.ok(toQuestionResponse(savedFollowUp));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ==================== Sessions (Book with Expert) ====================

    /**
     * Get my sessions as a student
     */
    @GetMapping("/my-sessions")
    public ResponseEntity<List<ExpertDto.SessionResponse>> getMySessions() {
        User student = getCurrentUser();
        List<ExpertSession> sessions = sessionRepository.findByStudentIdOrderByScheduledStartTimeDesc(student.getId());
        return ResponseEntity.ok(sessions.stream().map(this::toSessionResponse).collect(Collectors.toList()));
    }

    /**
     * Get upcoming sessions for student
     */
    @GetMapping("/my-sessions/upcoming")
    public ResponseEntity<List<ExpertDto.SessionResponse>> getUpcomingSessions() {
        User student = getCurrentUser();
        List<ExpertSession> sessions = sessionRepository.findUpcomingSessionsByStudent(student.getId(), LocalDateTime.now());
        return ResponseEntity.ok(sessions.stream().map(this::toSessionResponse).collect(Collectors.toList()));
    }

    /**
     * Book a session with an expert
     */
    @PostMapping("/sessions/book")
    public ResponseEntity<?> bookSession(@Valid @RequestBody ExpertDto.SessionRequest request) {
        try {
            User student = getCurrentUser();

            // Validate expert
            User expert = userRepository.findById(request.getStudentId()) // Note: using studentId field for expert when booking
                    .orElseThrow(() -> new RuntimeException("Expert not found"));

            if (expert.getRole() != Role.EXPERT && expert.getRole() != Role.ADMIN) {
                return ResponseEntity.badRequest().body(Map.of("message", "Selected user is not an expert"));
            }

            ExpertProfile expertProfile = expertProfileRepository.findByUser(expert)
                    .orElseThrow(() -> new RuntimeException("Expert profile not found"));

            if (!expertProfile.getAcceptingNewStudents()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Expert is not accepting new students"));
            }

            // Check for scheduling conflicts
            if (sessionRepository.hasSchedulingConflict(expert.getId(), request.getScheduledStartTime(), request.getScheduledEndTime())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Expert is not available at this time"));
            }

            ExpertSession session = ExpertSession.builder()
                    .expert(expert)
                    .student(student)
                    .title(request.getTitle())
                    .description(request.getDescription())
                    .agenda(request.getAgenda())
                    .sessionType(request.getSessionType() != null ? request.getSessionType() : ExpertSession.SessionType.ONE_ON_ONE)
                    .status(ExpertSession.SessionStatus.SCHEDULED)
                    .scheduledStartTime(request.getScheduledStartTime())
                    .scheduledEndTime(request.getScheduledEndTime())
                    .maxParticipants(1)
                    .meetingPlatform(request.getMeetingPlatform())
                    .build();

            // Set course if provided
            if (request.getCourseId() != null) {
                Course course = courseRepository.findById(request.getCourseId())
                        .orElseThrow(() -> new RuntimeException("Course not found"));
                session.setCourse(course);
            }

            ExpertSession savedSession = sessionRepository.save(session);
            return ResponseEntity.ok(toSessionResponse(savedSession));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Rate a completed session
     */
    @PostMapping("/sessions/{sessionId}/rate")
    public ResponseEntity<?> rateSession(@PathVariable Long sessionId, @Valid @RequestBody ExpertDto.SessionFeedbackRequest request) {
        try {
            User student = getCurrentUser();
            ExpertSession session = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            if (!session.getStudent().getId().equals(student.getId())) {
                return ResponseEntity.status(403).body(Map.of("message", "Not authorized to rate this session"));
            }

            if (session.getStatus() != ExpertSession.SessionStatus.COMPLETED) {
                return ResponseEntity.badRequest().body(Map.of("message", "Can only rate completed sessions"));
            }

            session.setStudentRating(request.getRating());
            session.setStudentFeedback(request.getFeedback());
            sessionRepository.save(session);

            // Update expert's average rating
            ExpertProfile expertProfile = expertProfileRepository.findByUser(session.getExpert()).orElse(null);
            if (expertProfile != null) {
                expertProfile.addRating(request.getRating());
                expertProfile.incrementStudentsHelped();
                expertProfileRepository.save(expertProfile);
            }

            return ResponseEntity.ok(Map.of("message", "Rating submitted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Cancel a booked session
     */
    @PostMapping("/sessions/{sessionId}/cancel")
    public ResponseEntity<?> cancelBookedSession(@PathVariable Long sessionId, @RequestBody Map<String, String> body) {
        try {
            User student = getCurrentUser();
            ExpertSession session = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Session not found"));

            if (!session.getStudent().getId().equals(student.getId())) {
                return ResponseEntity.status(403).body(Map.of("message", "Not authorized"));
            }

            if (session.getStatus() != ExpertSession.SessionStatus.SCHEDULED) {
                return ResponseEntity.badRequest().body(Map.of("message", "Can only cancel scheduled sessions"));
            }

            session.cancel(body.get("reason"), student.getUsername());
            sessionRepository.save(session);

            return ResponseEntity.ok(Map.of("message", "Session cancelled successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ==================== Reviews ====================

    /**
     * Leave a review for an expert
     */
    @PostMapping("/reviews")
    public ResponseEntity<?> leaveReview(@Valid @RequestBody ExpertDto.ReviewRequest request) {
        try {
            User student = getCurrentUser();
            
            // Validate expert
            User expert = null;
            if (request.getSessionId() != null) {
                ExpertSession session = sessionRepository.findById(request.getSessionId())
                        .orElseThrow(() -> new RuntimeException("Session not found"));
                expert = session.getExpert();
                
                // Check if already reviewed
                if (reviewRepository.existsBySessionIdAndStudentId(request.getSessionId(), student.getId())) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Already reviewed this session"));
                }
            } else if (request.getQuestionId() != null) {
                ExpertQuestion question = questionRepository.findById(request.getQuestionId())
                        .orElseThrow(() -> new RuntimeException("Question not found"));
                expert = question.getAnsweredBy();
                
                // Check if already reviewed
                if (reviewRepository.existsByQuestionIdAndStudentId(request.getQuestionId(), student.getId())) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Already reviewed this Q&A"));
                }
            }

            if (expert == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Could not determine expert to review"));
            }

            ExpertReview review = ExpertReview.builder()
                    .expert(expert)
                    .student(student)
                    .rating(request.getRating())
                    .knowledgeRating(request.getKnowledgeRating())
                    .communicationRating(request.getCommunicationRating())
                    .responsivenessRating(request.getResponsivenessRating())
                    .helpfulnessRating(request.getHelpfulnessRating())
                    .review(request.getReview())
                    .highlights(request.getHighlights())
                    .improvements(request.getImprovements())
                    .isAnonymous(request.getIsAnonymous() != null ? request.getIsAnonymous() : false)
                    .isPublic(request.getIsPublic() != null ? request.getIsPublic() : true)
                    .build();

            // Link to session or question if provided
            if (request.getSessionId() != null) {
                ExpertSession session = sessionRepository.findById(request.getSessionId()).orElse(null);
                review.setSession(session);
            }
            if (request.getQuestionId() != null) {
                ExpertQuestion question = questionRepository.findById(request.getQuestionId()).orElse(null);
                review.setQuestion(question);
            }

            ExpertReview savedReview = reviewRepository.save(review);

            // Update expert profile rating
            ExpertProfile expertProfile = expertProfileRepository.findByUser(expert).orElse(null);
            if (expertProfile != null) {
                expertProfile.addRating(request.getRating());
                expertProfileRepository.save(expertProfile);
            }

            return ResponseEntity.ok(toReviewResponse(savedReview));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get my reviews
     */
    @GetMapping("/my-reviews")
    public ResponseEntity<List<ExpertDto.ReviewResponse>> getMyReviews() {
        User student = getCurrentUser();
        List<ExpertReview> reviews = reviewRepository.findByStudentIdOrderByCreatedAtDesc(student.getId());
        return ResponseEntity.ok(reviews.stream().map(this::toReviewResponse).collect(Collectors.toList()));
    }

    /**
     * Mark a review as helpful
     */
    @PostMapping("/reviews/{reviewId}/helpful")
    public ResponseEntity<?> markReviewHelpful(@PathVariable Long reviewId) {
        ExpertReview review = reviewRepository.findById(reviewId)
                .orElse(null);

        if (review == null) {
            return ResponseEntity.notFound().build();
        }

        review.markAsHelpful();
        reviewRepository.save(review);

        return ResponseEntity.ok(Map.of("helpfulCount", review.getHelpfulCount()));
    }

    // ==================== Helper Methods ====================

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private ExpertDto.QuestionResponse toQuestionResponse(ExpertQuestion question) {
        return ExpertDto.QuestionResponse.builder()
                .id(question.getId())
                .student(question.getIsAnonymous() ? null : toStudentSummary(question.getStudent()))
                .expert(question.getExpert() != null ? toExpertSummary(question.getExpert()) : null)
                .answeredBy(question.getAnsweredBy() != null ? toExpertSummary(question.getAnsweredBy()) : null)
                .course(question.getCourse() != null ? toCourseSummary(question.getCourse()) : null)
                .studyGroup(question.getStudyGroup() != null ? toGroupSummary(question.getStudyGroup()) : null)
                .title(question.getTitle())
                .content(question.getContent())
                .codeSnippet(question.getCodeSnippet())
                .programmingLanguage(question.getProgrammingLanguage())
                .status(question.getStatus().getDisplayName())
                .priority(question.getPriority().getDisplayName())
                .tags(question.getTags())
                .answer(question.getAnswer())
                .answeredAt(question.getAnsweredAt())
                .isPublic(question.getIsPublic())
                .isAnonymous(question.getIsAnonymous())
                .viewCount(question.getViewCount())
                .upvotes(question.getUpvotes())
                .downvotes(question.getDownvotes())
                .netVotes(question.getNetVotes())
                .isAnswerAccepted(question.getIsAnswerAccepted())
                .isAnswerHelpful(question.getIsAnswerHelpful())
                .attachments(question.getAttachments())
                .dueDate(question.getDueDate())
                .isUrgent(question.getIsUrgent())
                .followUpCount(question.getFollowUpQuestions() != null ? question.getFollowUpQuestions().size() : 0)
                .createdAt(question.getCreatedAt())
                .build();
    }

    private ExpertDto.SessionResponse toSessionResponse(ExpertSession session) {
        return ExpertDto.SessionResponse.builder()
                .id(session.getId())
                .expert(toExpertSummary(session.getExpert()))
                .student(session.getStudent() != null ? toStudentSummary(session.getStudent()) : null)
                .studyGroup(session.getStudyGroup() != null ? toGroupSummary(session.getStudyGroup()) : null)
                .course(session.getCourse() != null ? toCourseSummary(session.getCourse()) : null)
                .title(session.getTitle())
                .description(session.getDescription())
                .agenda(session.getAgenda())
                .sessionType(session.getSessionType().getDisplayName())
                .status(session.getStatus().getDisplayName())
                .scheduledStartTime(session.getScheduledStartTime())
                .scheduledEndTime(session.getScheduledEndTime())
                .actualStartTime(session.getActualStartTime())
                .actualEndTime(session.getActualEndTime())
                .maxParticipants(session.getMaxParticipants())
                .currentParticipants(session.getCurrentParticipants())
                .meetingLink(session.getMeetingLink())
                .meetingPlatform(session.getMeetingPlatform())
                .sessionSummary(session.getSessionSummary())
                .studentRating(session.getStudentRating())
                .studentFeedback(session.getStudentFeedback())
                .canJoin(session.canJoin())
                .isUpcoming(session.isUpcoming())
                .createdAt(session.getCreatedAt())
                .build();
    }

    private ExpertDto.ReviewResponse toReviewResponse(ExpertReview review) {
        return ExpertDto.ReviewResponse.builder()
                .id(review.getId())
                .expertId(review.getExpert().getId())
                .expertName(review.getExpert().getFullName())
                .student(review.getIsAnonymous() ? null : toStudentSummary(review.getStudent()))
                .rating(review.getRating())
                .knowledgeRating(review.getKnowledgeRating())
                .communicationRating(review.getCommunicationRating())
                .responsivenessRating(review.getResponsivenessRating())
                .helpfulnessRating(review.getHelpfulnessRating())
                .review(review.getReview())
                .highlights(review.getHighlights())
                .improvements(review.getImprovements())
                .isAnonymous(review.getIsAnonymous())
                .helpfulCount(review.getHelpfulCount())
                .expertResponse(review.getExpertResponse())
                .expertRespondedAt(review.getExpertRespondedAt())
                .createdAt(review.getCreatedAt())
                .build();
    }

    private ExpertDto.ExpertSummary toExpertSummary(User expert) {
        ExpertProfile profile = expertProfileRepository.findByUser(expert).orElse(null);
        return ExpertDto.ExpertSummary.builder()
                .id(expert.getId())
                .fullName(expert.getFullName())
                .title(profile != null ? profile.getTitle() : null)
                .institution(profile != null ? profile.getInstitution() : null)
                .averageRating(profile != null ? profile.getAverageRating() : null)
                .isVerified(profile != null ? profile.getIsVerified() : false)
                .build();
    }

    private ExpertDto.StudentSummary toStudentSummary(User student) {
        return ExpertDto.StudentSummary.builder()
                .id(student.getId())
                .fullName(student.getFullName())
                .username(student.getUsername())
                .build();
    }

    private ExpertDto.CourseSummary toCourseSummary(Course course) {
        return ExpertDto.CourseSummary.builder()
                .id(course.getId())
                .code(course.getCode())
                .name(course.getName())
                .build();
    }

    private ExpertDto.GroupSummary toGroupSummary(StudyGroup group) {
        return ExpertDto.GroupSummary.builder()
                .id(group.getId())
                .name(group.getName())
                .build();
    }
}
