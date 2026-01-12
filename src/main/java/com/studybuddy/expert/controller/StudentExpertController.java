package com.studybuddy.expert.controller;

import com.studybuddy.expert.dto.ExpertDto;
import com.studybuddy.user.model.*;
import com.studybuddy.course.model.*;
import com.studybuddy.group.model.*;
import com.studybuddy.expert.model.*;
import com.studybuddy.user.repository.*;
import com.studybuddy.course.repository.*;
import com.studybuddy.group.repository.*;
import com.studybuddy.expert.repository.*;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
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

    @Autowired
    private com.studybuddy.expert.repository.SessionRequestRepository sessionRequestRepository;

    @Autowired
    private com.studybuddy.notification.service.NotificationService notificationService;

    @Autowired
    private com.studybuddy.meeting.service.MeetingService meetingService;

    @Autowired
    private com.studybuddy.expert.repository.QuestionVoteRepository questionVoteRepository;

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
     * Upvote a question - prevents duplicate voting
     */
    @PostMapping("/questions/{questionId}/upvote")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> upvoteQuestion(@PathVariable Long questionId) {
        User user = getCurrentUser();
        ExpertQuestion question = questionRepository.findById(questionId)
                .orElse(null);

        if (question == null) {
            return ResponseEntity.notFound().build();
        }

        // Check if user has already voted
        java.util.Optional<QuestionVote> existingVote = questionVoteRepository.findByQuestionIdAndUserId(questionId, user.getId());

        if (existingVote.isPresent()) {
            QuestionVote vote = existingVote.get();
            if (vote.getVoteType() == QuestionVote.VoteType.UPVOTE) {
                // Remove the upvote (toggle off)
                question.setUpvotes(question.getUpvotes() - 1);
                questionVoteRepository.delete(vote);
                questionRepository.save(question);
                return ResponseEntity.ok(Map.of(
                    "upvotes", question.getUpvotes(),
                    "netVotes", question.getNetVotes(),
                    "hasVoted", false,
                    "message", "Upvote removed"
                ));
            } else {
                // Change from downvote to upvote
                vote.setVoteType(QuestionVote.VoteType.UPVOTE);
                questionVoteRepository.save(vote);
                question.setUpvotes(question.getUpvotes() + 1);
                question.setDownvotes(question.getDownvotes() - 1);
                questionRepository.save(question);
                return ResponseEntity.ok(Map.of(
                    "upvotes", question.getUpvotes(),
                    "netVotes", question.getNetVotes(),
                    "hasVoted", true,
                    "voteType", "UPVOTE",
                    "message", "Changed to upvote"
                ));
            }
        }

        // Create new upvote
        QuestionVote newVote = QuestionVote.builder()
            .question(question)
            .user(user)
            .voteType(QuestionVote.VoteType.UPVOTE)
            .build();
        questionVoteRepository.save(newVote);

        question.setUpvotes(question.getUpvotes() + 1);
        questionRepository.save(question);

        return ResponseEntity.ok(Map.of(
            "upvotes", question.getUpvotes(),
            "netVotes", question.getNetVotes(),
            "hasVoted", true,
            "voteType", "UPVOTE",
            "message", "Upvoted successfully"
        ));
    }

    /**
     * Downvote a question - prevents duplicate voting
     */
    @PostMapping("/questions/{questionId}/downvote")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> downvoteQuestion(@PathVariable Long questionId) {
        User user = getCurrentUser();
        ExpertQuestion question = questionRepository.findById(questionId)
                .orElse(null);

        if (question == null) {
            return ResponseEntity.notFound().build();
        }

        // Check if user has already voted
        java.util.Optional<QuestionVote> existingVote = questionVoteRepository.findByQuestionIdAndUserId(questionId, user.getId());

        if (existingVote.isPresent()) {
            QuestionVote vote = existingVote.get();
            if (vote.getVoteType() == QuestionVote.VoteType.DOWNVOTE) {
                // Remove the downvote (toggle off)
                question.setDownvotes(question.getDownvotes() - 1);
                questionVoteRepository.delete(vote);
                questionRepository.save(question);
                return ResponseEntity.ok(Map.of(
                    "downvotes", question.getDownvotes(),
                    "netVotes", question.getNetVotes(),
                    "hasVoted", false,
                    "message", "Downvote removed"
                ));
            } else {
                // Change from upvote to downvote
                vote.setVoteType(QuestionVote.VoteType.DOWNVOTE);
                questionVoteRepository.save(vote);
                question.setDownvotes(question.getDownvotes() + 1);
                question.setUpvotes(question.getUpvotes() - 1);
                questionRepository.save(question);
                return ResponseEntity.ok(Map.of(
                    "downvotes", question.getDownvotes(),
                    "netVotes", question.getNetVotes(),
                    "hasVoted", true,
                    "voteType", "DOWNVOTE",
                    "message", "Changed to downvote"
                ));
            }
        }

        // Create new downvote
        QuestionVote newVote = QuestionVote.builder()
            .question(question)
            .user(user)
            .voteType(QuestionVote.VoteType.DOWNVOTE)
            .build();
        questionVoteRepository.save(newVote);

        question.setDownvotes(question.getDownvotes() + 1);
        questionRepository.save(question);

        return ResponseEntity.ok(Map.of(
            "downvotes", question.getDownvotes(),
            "netVotes", question.getNetVotes(),
            "hasVoted", true,
            "voteType", "DOWNVOTE",
            "message", "Downvoted successfully"
        ));
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

            // Get expertId - prefer new expertId field, fallback to deprecated studentId for backward compatibility
            Long expertIdValue = request.getExpertId();
            if (expertIdValue == null && request.getStudentId() != null) {
                // Backward compatibility: if expertId is not provided, use studentId
                expertIdValue = request.getStudentId();
            }

            if (expertIdValue == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "expertId is required"));
            }

            // Validate expert
            User expert = userRepository.findById(expertIdValue)
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
                    .meetingPlatform(request.getMeetingPlatform() != null ? request.getMeetingPlatform() : "JITSI")
                    .build();

            // Set course if provided
            if (request.getCourseId() != null) {
                Course course = courseRepository.findById(request.getCourseId())
                        .orElseThrow(() -> new RuntimeException("Course not found"));
                session.setCourse(course);
            }

            ExpertSession savedSession = sessionRepository.save(session);
            
            // Generate Jitsi meeting link if platform is JITSI and no link provided
            if ((savedSession.getMeetingPlatform() == null || savedSession.getMeetingPlatform().equals("JITSI")) 
                    && (savedSession.getMeetingLink() == null || savedSession.getMeetingLink().isEmpty())) {
                savedSession.setMeetingLink(meetingService.generateJitsiMeetingLink(savedSession.getId()));
                savedSession = sessionRepository.save(savedSession);
            }
            
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

    // ==================== Session Requests ====================

    /**
     * Create a session request to book a 1:1 session with an expert
     */
    @PostMapping("/session-requests")
    public ResponseEntity<?> createSessionRequest(@Valid @RequestBody ExpertDto.SessionRequestCreate request) {
        try {
            User student = getCurrentUser();

            // Validate expert
            User expert = userRepository.findById(request.getExpertId())
                    .orElseThrow(() -> new RuntimeException("Expert not found"));

            if (expert.getRole() != Role.EXPERT && expert.getRole() != Role.ADMIN) {
                return ResponseEntity.badRequest().body(Map.of("message", "Selected user is not an expert"));
            }

            ExpertProfile expertProfile = expertProfileRepository.findByUser(expert)
                    .orElseThrow(() -> new RuntimeException("Expert profile not found"));

            if (!expertProfile.getAcceptingNewStudents()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Expert is not accepting new students"));
            }

            // Validate preferred time slots
            if (request.getPreferredTimeSlots() == null || request.getPreferredTimeSlots().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "At least one preferred time slot is required"));
            }

            // Convert preferred time slots to JSON
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.findAndRegisterModules();
            String timeSlotsJson = mapper.writeValueAsString(request.getPreferredTimeSlots());

            // Create session request
            com.studybuddy.expert.model.SessionRequest sessionRequest = com.studybuddy.expert.model.SessionRequest.builder()
                    .student(student)
                    .expert(expert)
                    .title(request.getTitle())
                    .description(request.getDescription())
                    .agenda(request.getAgenda())
                    .preferredTimeSlots(timeSlotsJson)
                    .status(com.studybuddy.expert.model.SessionRequest.RequestStatus.PENDING)
                    .build();

            // Set course if provided
            if (request.getCourseId() != null) {
                Course course = courseRepository.findById(request.getCourseId())
                        .orElseThrow(() -> new RuntimeException("Course not found"));
                sessionRequest.setCourse(course);
            }

            com.studybuddy.expert.model.SessionRequest savedRequest = sessionRequestRepository.save(sessionRequest);

            // Notify expert
            notificationService.createNotification(
                    expert,
                    "SESSION_REQUEST",
                    "New Session Request",
                    String.format("%s has requested a 1:1 session: %s", student.getFullName() != null ? student.getFullName() : student.getUsername(), request.getTitle()),
                    "/experts/me/session-requests/" + savedRequest.getId()
            );

            return ResponseEntity.ok(toSessionRequestResponse(savedRequest));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get my session requests (as a student)
     */
    @GetMapping("/session-requests/mine")
    public ResponseEntity<List<ExpertDto.SessionRequestResponse>> getMySessionRequests() {
        User student = getCurrentUser();
        List<com.studybuddy.expert.model.SessionRequest> requests = sessionRequestRepository.findByStudentIdOrderByCreatedAtDesc(student.getId());
        return ResponseEntity.ok(requests.stream().map(this::toSessionRequestResponse).collect(Collectors.toList()));
    }

    /**
     * Cancel a session request
     */
    @PostMapping("/session-requests/{requestId}/cancel")
    public ResponseEntity<?> cancelSessionRequest(@PathVariable Long requestId) {
        try {
            User student = getCurrentUser();
            com.studybuddy.expert.model.SessionRequest request = sessionRequestRepository.findById(requestId)
                    .orElseThrow(() -> new RuntimeException("Session request not found"));

            if (!request.getStudent().getId().equals(student.getId())) {
                return ResponseEntity.status(403).body(Map.of("message", "Not authorized"));
            }

            if (request.getStatus() != com.studybuddy.expert.model.SessionRequest.RequestStatus.PENDING) {
                return ResponseEntity.badRequest().body(Map.of("message", "Can only cancel pending requests"));
            }

            request.setStatus(com.studybuddy.expert.model.SessionRequest.RequestStatus.CANCELLED);
            sessionRequestRepository.save(request);

            // Notify expert
            notificationService.createNotification(
                    request.getExpert(),
                    "SESSION_REQUEST_CANCELLED",
                    "Session Request Cancelled",
                    String.format("%s has cancelled their session request: %s", student.getFullName() != null ? student.getFullName() : student.getUsername(), request.getTitle())
            );

            return ResponseEntity.ok(toSessionRequestResponse(request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
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

    private ExpertDto.SessionRequestResponse toSessionRequestResponse(com.studybuddy.expert.model.SessionRequest request) {
        // Parse preferred time slots from JSON
        List<ExpertDto.TimeSlot> timeSlots = new ArrayList<>();
        if (request.getPreferredTimeSlots() != null && !request.getPreferredTimeSlots().isEmpty()) {
            try {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                mapper.findAndRegisterModules();
                timeSlots = mapper.readValue(request.getPreferredTimeSlots(), 
                    mapper.getTypeFactory().constructCollectionType(List.class, ExpertDto.TimeSlot.class));
            } catch (Exception e) {
                // If parsing fails, return empty list
            }
        }

        return ExpertDto.SessionRequestResponse.builder()
                .id(request.getId())
                .expert(toExpertSummary(request.getExpert()))
                .student(toStudentSummary(request.getStudent()))
                .course(request.getCourse() != null ? toCourseSummary(request.getCourse()) : null)
                .title(request.getTitle())
                .description(request.getDescription())
                .agenda(request.getAgenda())
                .preferredTimeSlots(timeSlots)
                .status(request.getStatus().getDisplayName())
                .expertResponseMessage(request.getExpertResponseMessage())
                .rejectionReason(request.getRejectionReason())
                .chosenStart(request.getChosenStart())
                .chosenEnd(request.getChosenEnd())
                .createdSessionId(request.getCreatedSession() != null ? request.getCreatedSession().getId() : null)
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }
}
