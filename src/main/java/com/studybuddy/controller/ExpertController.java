package com.studybuddy.controller;

import com.studybuddy.dto.ExpertDto;
import com.studybuddy.model.*;
import com.studybuddy.repository.*;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Expert Controller - Handles all expert-related functionality
 * Including profile management, sessions, Q&A, reviews, and dashboard
 */
@RestController
@RequestMapping("/api/experts")
public class ExpertController {

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
    private SessionParticipantRepository sessionParticipantRepository;

    @Autowired
    private com.studybuddy.service.NotificationService notificationService;

    // ==================== Expert Profile Endpoints ====================

    /**
     * Get all active experts (both verified and unverified)
     */
    @GetMapping
    public ResponseEntity<List<ExpertDto.ExpertSearchResult>> getAllExperts() {
        // Show all active expert profiles, not just verified ones
        List<ExpertProfile> experts = expertProfileRepository.findByIsActiveTrue();
        List<ExpertDto.ExpertSearchResult> results = experts.stream()
                .map(this::toExpertSearchResult)
                .collect(Collectors.toList());
        return ResponseEntity.ok(results);
    }

    /**
     * Search experts by query
     */
    @GetMapping("/search")
    public ResponseEntity<List<ExpertDto.ExpertSearchResult>> searchExperts(@RequestParam String query) {
        List<ExpertProfile> experts = expertProfileRepository.searchExperts(query);
        List<ExpertDto.ExpertSearchResult> results = experts.stream()
                .map(this::toExpertSearchResult)
                .collect(Collectors.toList());
        return ResponseEntity.ok(results);
    }

    /**
     * Get experts by course
     */
    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<ExpertDto.ExpertSearchResult>> getExpertsByCourse(@PathVariable Long courseId) {
        List<ExpertProfile> experts = expertProfileRepository.findByCourseId(courseId);
        List<ExpertDto.ExpertSearchResult> results = experts.stream()
                .map(this::toExpertSearchResult)
                .collect(Collectors.toList());
        return ResponseEntity.ok(results);
    }

    /**
     * Get top rated experts
     */
    @GetMapping("/top-rated")
    public ResponseEntity<List<ExpertDto.ExpertSearchResult>> getTopRatedExperts() {
        List<ExpertProfile> experts = expertProfileRepository.findTopRatedExperts();
        List<ExpertDto.ExpertSearchResult> results = experts.stream()
                .limit(10)
                .map(this::toExpertSearchResult)
                .collect(Collectors.toList());
        return ResponseEntity.ok(results);
    }

    /**
     * Get available experts
     */
    @GetMapping("/available")
    public ResponseEntity<List<ExpertDto.ExpertSearchResult>> getAvailableExperts() {
        List<ExpertProfile> experts = expertProfileRepository.findByIsAvailableNowTrueAndIsActiveTrue();
        List<ExpertDto.ExpertSearchResult> results = experts.stream()
                .map(this::toExpertSearchResult)
                .collect(Collectors.toList());
        return ResponseEntity.ok(results);
    }

    /**
     * Get expert profile by user ID
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getExpertProfile(@PathVariable Long userId) {
        ExpertProfile profile = expertProfileRepository.findByUserId(userId)
                .orElse(null);
        
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(toExpertProfileResponse(profile));
    }

    /**
     * Get upcoming sessions for an expert (public for students to browse)
     */
    @GetMapping("/{userId}/sessions")
    public ResponseEntity<List<ExpertDto.SessionResponse>> getExpertSessions(@PathVariable Long userId) {
        User expert = userRepository.findById(userId).orElse(null);
        if (expert == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Get upcoming sessions that haven't ended yet
        LocalDateTime now = LocalDateTime.now();
        List<ExpertSession> sessions = sessionRepository.findByExpertIdOrderByScheduledStartTimeDesc(expert.getId())
                .stream()
                .filter(s -> s.getScheduledEndTime() == null || s.getScheduledEndTime().isAfter(now))
                .filter(s -> s.getStatus() == null || 
                        s.getStatus() == ExpertSession.SessionStatus.SCHEDULED || 
                        s.getStatus() == ExpertSession.SessionStatus.IN_PROGRESS)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(sessions.stream().map(this::toSessionResponse).collect(Collectors.toList()));
    }

    /**
     * Get my expert profile (for logged-in expert)
     */
    @GetMapping("/me/profile")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getMyExpertProfile() {
        User currentUser = getCurrentUser();
        ExpertProfile profile = expertProfileRepository.findByUser(currentUser)
                .orElse(null);
        
        if (profile == null) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(toExpertProfileResponse(profile));
    }

    /**
     * Create or update expert profile
     */
    @PostMapping("/me/profile")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> createOrUpdateExpertProfile(@Valid @RequestBody ExpertDto.ExpertProfileRequest request) {
        try {
            User currentUser = getCurrentUser();
            
            ExpertProfile profile = expertProfileRepository.findByUser(currentUser)
                    .orElse(new ExpertProfile());
            
            profile.setUser(currentUser);
            profile.setTitle(request.getTitle());
            profile.setInstitution(request.getInstitution());
            profile.setBio(request.getBio());
            profile.setQualifications(request.getQualifications());
            
            if (request.getYearsOfExperience() != null) {
                profile.setYearsOfExperience(request.getYearsOfExperience());
            }
            if (request.getSpecializations() != null) {
                profile.setSpecializations(request.getSpecializations());
            }
            if (request.getSkills() != null) {
                profile.setSkills(request.getSkills());
            }
            if (request.getWeeklyAvailability() != null) {
                profile.setWeeklyAvailability(request.getWeeklyAvailability());
            }
            if (request.getMaxSessionsPerWeek() != null) {
                profile.setMaxSessionsPerWeek(request.getMaxSessionsPerWeek());
            }
            if (request.getSessionDurationMinutes() != null) {
                profile.setSessionDurationMinutes(request.getSessionDurationMinutes());
            }
            if (request.getOffersGroupConsultations() != null) {
                profile.setOffersGroupConsultations(request.getOffersGroupConsultations());
            }
            if (request.getOffersOneOnOne() != null) {
                profile.setOffersOneOnOne(request.getOffersOneOnOne());
            }
            if (request.getOffersAsyncQA() != null) {
                profile.setOffersAsyncQA(request.getOffersAsyncQA());
            }
            if (request.getTypicalResponseHours() != null) {
                profile.setTypicalResponseHours(request.getTypicalResponseHours());
            }
            profile.setLinkedInUrl(request.getLinkedInUrl());
            profile.setPersonalWebsite(request.getPersonalWebsite());
            
            // Handle expertise courses
            if (request.getExpertiseCourseIds() != null) {
                Set<Course> courses = new HashSet<>();
                for (Long courseId : request.getExpertiseCourseIds()) {
                    courseRepository.findById(courseId).ifPresent(courses::add);
                }
                profile.setExpertiseCourses(courses);
            }
            
            profile.setIsActive(true);
            
            ExpertProfile savedProfile = expertProfileRepository.save(profile);
            return ResponseEntity.ok(toExpertProfileResponse(savedProfile));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Error updating profile: " + e.getMessage()));
        }
    }

    /**
     * Update availability status
     */
    @PutMapping("/me/availability")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> updateAvailability(@RequestBody ExpertDto.AvailabilityUpdateRequest request) {
        try {
            User currentUser = getCurrentUser();
            ExpertProfile profile = expertProfileRepository.findByUser(currentUser)
                    .orElseThrow(() -> new RuntimeException("Expert profile not found"));
            
            if (request.getIsAvailableNow() != null) {
                profile.setIsAvailableNow(request.getIsAvailableNow());
            }
            if (request.getAcceptingNewStudents() != null) {
                profile.setAcceptingNewStudents(request.getAcceptingNewStudents());
            }
            
            expertProfileRepository.save(profile);
            return ResponseEntity.ok(Map.of("message", "Availability updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ==================== Expert Dashboard ====================

    /**
     * Get expert dashboard with stats
     */
    @GetMapping("/me/dashboard")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> getExpertDashboard() {
        try {
            User currentUser = getCurrentUser();
            ExpertProfile profile = expertProfileRepository.findByUser(currentUser)
                    .orElseThrow(() -> new RuntimeException("Expert profile not found"));
            
            // Get upcoming sessions
            List<ExpertSession> upcomingSessions = sessionRepository
                    .findUpcomingSessionsByExpert(currentUser.getId(), LocalDateTime.now());
            
            // Get pending questions
            List<ExpertQuestion> pendingQuestions = questionRepository
                    .findPendingQuestionsForExpert(currentUser.getId());
            
            // Get recent reviews
            List<ExpertReview> recentReviews = reviewRepository
                    .findByExpertIdAndIsApprovedTrueAndIsPublicTrueOrderByCreatedAtDesc(currentUser.getId())
                    .stream().limit(5).collect(Collectors.toList());
            
            // Build stats
            ExpertDto.DashboardStats stats = buildDashboardStats(currentUser.getId(), profile);
            
            // Build dashboard response
            ExpertDto.ExpertDashboard dashboard = ExpertDto.ExpertDashboard.builder()
                    .profile(toExpertProfileResponse(profile))
                    .stats(stats)
                    .upcomingSessions(upcomingSessions.stream().map(this::toSessionResponse).collect(Collectors.toList()))
                    .pendingQuestions(pendingQuestions.stream().map(this::toQuestionResponse).collect(Collectors.toList()))
                    .recentReviews(recentReviews.stream().map(this::toReviewResponse).collect(Collectors.toList()))
                    .notifications(getNotifications(currentUser.getId()))
                    .build();
            
            return ResponseEntity.ok(dashboard);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ==================== Expert Sessions ====================

    /**
     * Create a new session
     */
    @PostMapping("/sessions")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> createSession(@Valid @RequestBody ExpertDto.SessionRequest request) {
        try {
            User expert = getCurrentUser();
            
            // Check for scheduling conflicts
            if (sessionRepository.hasSchedulingConflict(expert.getId(), request.getScheduledStartTime(), request.getScheduledEndTime())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Scheduling conflict detected"));
            }
            
            ExpertSession session = ExpertSession.builder()
                    .expert(expert)
                    .title(request.getTitle())
                    .description(request.getDescription())
                    .agenda(request.getAgenda())
                    .sessionType(request.getSessionType())
                    .status(ExpertSession.SessionStatus.SCHEDULED)
                    .scheduledStartTime(request.getScheduledStartTime())
                    .scheduledEndTime(request.getScheduledEndTime())
                    .meetingLink(request.getMeetingLink())
                    .meetingPlatform(request.getMeetingPlatform())
                    .isRecurring(request.getIsRecurring() != null ? request.getIsRecurring() : false)
                    .recurrencePattern(request.getRecurrencePattern())
                    .maxParticipants(request.getMaxParticipants() != null ? request.getMaxParticipants() : 1)
                    .currentParticipants(0)
                    .isCancelled(false)
                    .reminderSent(false)
                    .build();
            
            // Set student for one-on-one sessions
            if (request.getStudentId() != null) {
                User student = userRepository.findById(request.getStudentId())
                        .orElseThrow(() -> new RuntimeException("Student not found"));
                session.setStudent(student);
                session.setMaxParticipants(1);
                session.setCurrentParticipants(1);
            }
            
            // Set group for group consultations
            if (request.getGroupId() != null) {
                StudyGroup group = groupRepository.findById(request.getGroupId())
                        .orElseThrow(() -> new RuntimeException("Group not found"));
                session.setStudyGroup(group);
                if (request.getMaxParticipants() == null) {
                    session.setMaxParticipants(group.getMaxSize());
                }
            }
            
            // Set course
            if (request.getCourseId() != null) {
                Course course = courseRepository.findById(request.getCourseId())
                        .orElseThrow(() -> new RuntimeException("Course not found"));
                session.setCourse(course);
            }
            
            ExpertSession savedSession = sessionRepository.save(session);

            // Auto-register targeted student so one-on-one sessions remain accessible
            if (savedSession.getStudent() != null) {
                boolean alreadyRegistered = sessionParticipantRepository
                        .existsBySessionIdAndUserId(savedSession.getId(), savedSession.getStudent().getId());
                if (!alreadyRegistered) {
                    SessionParticipant participant = SessionParticipant.builder()
                            .session(savedSession)
                            .user(savedSession.getStudent())
                            .status(SessionParticipant.ParticipantStatus.CONFIRMED)
                            .registeredAt(LocalDateTime.now())
                            .attended(false)
                            .build();
                    sessionParticipantRepository.save(participant);
                }
            }
            
            // Send notification to student for one-on-one sessions
            if (savedSession.getStudent() != null) {
                String notificationTitle = "New One-on-One Session";
                String notificationMessage = String.format(
                    "%s has scheduled a one-on-one session with you: \"%s\" on %s",
                    expert.getFullName() != null ? expert.getFullName() : expert.getUsername(),
                    savedSession.getTitle(),
                    savedSession.getScheduledStartTime().toLocalDate().toString()
                );
                notificationService.createActionableNotification(
                    savedSession.getStudent(),
                    "SESSION_INVITATION",
                    notificationTitle,
                    notificationMessage,
                    savedSession.getId(),
                    "SESSION",
                    expert.getId()
                );
            }
            
            return ResponseEntity.ok(toSessionResponse(savedSession));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get expert's sessions
     */
    @GetMapping("/me/sessions")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<ExpertDto.SessionResponse>> getExpertSessions() {
        User expert = getCurrentUser();
        List<ExpertSession> sessions = sessionRepository.findByExpertIdOrderByScheduledStartTimeDesc(expert.getId());
        return ResponseEntity.ok(sessions.stream().map(this::toSessionResponse).collect(Collectors.toList()));
    }

    /**
     * Search users for one-on-one session assignment
     */
    @GetMapping("/users/search")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> searchUsers(@RequestParam String query) {
        if (query == null || query.trim().length() < 2) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        
        List<User> users = userRepository.findByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCase(query.trim(), query.trim());
        
        // Return safe user data (no sensitive info)
        List<Map<String, Object>> results = users.stream()
            .limit(20) // Limit results
            .map(user -> {
                Map<String, Object> userData = new HashMap<>();
                userData.put("id", user.getId());
                userData.put("fullName", user.getFullName() != null ? user.getFullName() : user.getUsername());
                userData.put("email", user.getEmail());
                userData.put("role", user.getRole() != null ? user.getRole().name() : "STUDENT");
                return userData;
            })
            .collect(Collectors.toList());
        
        return ResponseEntity.ok(results);
    }

    /**
     * Get session by ID
     */
    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<?> getSession(@PathVariable Long sessionId) {
        ExpertSession session = sessionRepository.findById(sessionId)
                .orElse(null);
        
        if (session == null) {
            return ResponseEntity.notFound().build();
        }
        
        return ResponseEntity.ok(toSessionResponse(session));
    }

    /**
     * Start a session
     */
    @PostMapping("/sessions/{sessionId}/start")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> startSession(@PathVariable Long sessionId) {
        try {
            User expert = getCurrentUser();
            ExpertSession session = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Session not found"));
            
            if (!session.getExpert().getId().equals(expert.getId())) {
                return ResponseEntity.status(403).body(Map.of("message", "Not authorized"));
            }
            
            session.start();
            sessionRepository.save(session);
            
            // Notify all registered participants that the session has started
            List<SessionParticipant> participants = sessionParticipantRepository.findBySessionId(sessionId);
            for (SessionParticipant participant : participants) {
                notificationService.createNotification(
                    participant.getUser(),
                    "SESSION_STARTED",
                    "Session Started: " + session.getTitle(),
                    expert.getFullName() + " has started the session. Join now!",
                    "/session/" + sessionId
                );
            }
            
            return ResponseEntity.ok(toSessionResponse(session));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Complete a session
     */
    @PostMapping("/sessions/{sessionId}/complete")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> completeSession(@PathVariable Long sessionId, @RequestBody(required = false) Map<String, String> body) {
        try {
            User expert = getCurrentUser();
            ExpertSession session = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Session not found"));
            
            if (!session.getExpert().getId().equals(expert.getId())) {
                return ResponseEntity.status(403).body(Map.of("message", "Not authorized"));
            }
            
            session.complete();
            if (body != null && body.get("summary") != null) {
                session.setSessionSummary(body.get("summary"));
            }
            sessionRepository.save(session);
            
            // Update expert profile stats
            ExpertProfile profile = expertProfileRepository.findByUser(expert).orElse(null);
            if (profile != null) {
                profile.incrementSessions();
                expertProfileRepository.save(profile);
            }
            
            return ResponseEntity.ok(toSessionResponse(session));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Cancel a session
     */
    @PostMapping("/sessions/{sessionId}/cancel")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> cancelSession(@PathVariable Long sessionId, @RequestBody Map<String, String> body) {
        try {
            User expert = getCurrentUser();
            ExpertSession session = sessionRepository.findById(sessionId)
                    .orElseThrow(() -> new RuntimeException("Session not found"));
            
            if (!session.getExpert().getId().equals(expert.getId())) {
                return ResponseEntity.status(403).body(Map.of("message", "Not authorized"));
            }
            
            session.cancel(body.get("reason"), expert.getUsername());
            sessionRepository.save(session);
            
            return ResponseEntity.ok(Map.of("message", "Session cancelled successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ==================== Expert Q&A ====================

    /**
     * Get questions assigned to expert
     */
    @GetMapping("/me/questions")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<ExpertDto.QuestionResponse>> getExpertQuestions() {
        User expert = getCurrentUser();
        List<ExpertQuestion> questions = questionRepository.findByExpertIdOrderByCreatedAtDesc(expert.getId());
        return ResponseEntity.ok(questions.stream().map(this::toQuestionResponse).collect(Collectors.toList()));
    }

    /**
     * Get pending questions for expert
     */
    @GetMapping("/me/questions/pending")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<ExpertDto.QuestionResponse>> getPendingQuestions() {
        User expert = getCurrentUser();
        List<ExpertQuestion> questions = questionRepository.findPendingQuestionsForExpert(expert.getId());
        return ResponseEntity.ok(questions.stream().map(this::toQuestionResponse).collect(Collectors.toList()));
    }

    /**
     * Answer a question
     */
    @PostMapping("/questions/{questionId}/answer")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> answerQuestion(@PathVariable Long questionId, @Valid @RequestBody ExpertDto.AnswerRequest request) {
        try {
            User expert = getCurrentUser();
            ExpertQuestion question = questionRepository.findById(questionId)
                    .orElseThrow(() -> new RuntimeException("Question not found"));
            
            // Check if this expert is assigned or question is open
            if (question.getExpert() != null && !question.getExpert().getId().equals(expert.getId())) {
                return ResponseEntity.status(403).body(Map.of("message", "Question is assigned to another expert"));
            }
            
            question.answerQuestion(request.getAnswer(), expert);
            questionRepository.save(question);
            
            // Update expert profile stats
            ExpertProfile profile = expertProfileRepository.findByUser(expert).orElse(null);
            if (profile != null) {
                profile.incrementQuestionsAnswered();
                expertProfileRepository.save(profile);
            }
            
            // Notify the student that their question was answered
            if (question.getStudent() != null) {
                notificationService.createActionableNotification(
                    question.getStudent(),
                    "QUESTION_ANSWERED",
                    "Your Question Was Answered",
                    String.format("%s answered your question: \"%s\"", 
                        expert.getFullName() != null ? expert.getFullName() : expert.getUsername(),
                        question.getTitle()),
                    question.getId(),
                    "QUESTION",
                    expert.getId()
                );
            }
            
            return ResponseEntity.ok(toQuestionResponse(question));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Claim an open question
     */
    @PostMapping("/questions/{questionId}/claim")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> claimQuestion(@PathVariable Long questionId) {
        try {
            User expert = getCurrentUser();
            ExpertQuestion question = questionRepository.findById(questionId)
                    .orElseThrow(() -> new RuntimeException("Question not found"));
            
            if (question.getExpert() != null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Question is already assigned"));
            }
            
            question.assignToExpert(expert);
            questionRepository.save(question);
            
            return ResponseEntity.ok(toQuestionResponse(question));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ==================== Expert Reviews ====================

    /**
     * Get reviews for an expert
     */
    @GetMapping("/{expertUserId}/reviews")
    public ResponseEntity<List<ExpertDto.ReviewResponse>> getExpertReviews(@PathVariable Long expertUserId) {
        List<ExpertReview> reviews = reviewRepository
                .findByExpertIdAndIsApprovedTrueAndIsPublicTrueOrderByCreatedAtDesc(expertUserId);
        return ResponseEntity.ok(reviews.stream().map(this::toReviewResponse).collect(Collectors.toList()));
    }

    /**
     * Respond to a review
     */
    @PostMapping("/reviews/{reviewId}/respond")
    @PreAuthorize("hasAuthority('ROLE_EXPERT') or hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> respondToReview(@PathVariable Long reviewId, @RequestBody Map<String, String> body) {
        try {
            User expert = getCurrentUser();
            ExpertReview review = reviewRepository.findById(reviewId)
                    .orElseThrow(() -> new RuntimeException("Review not found"));
            
            if (!review.getExpert().getId().equals(expert.getId())) {
                return ResponseEntity.status(403).body(Map.of("message", "Not authorized"));
            }
            
            review.respondAsExpert(body.get("response"));
            reviewRepository.save(review);
            
            return ResponseEntity.ok(toReviewResponse(review));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // ==================== Admin Endpoints ====================

    /**
     * Verify an expert (Admin only)
     */
    @PostMapping("/{expertId}/verify")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<?> verifyExpert(@PathVariable Long expertId) {
        try {
            User admin = getCurrentUser();
            ExpertProfile profile = expertProfileRepository.findById(expertId)
                    .orElseThrow(() -> new RuntimeException("Expert profile not found"));
            
            profile.setIsVerified(true);
            profile.setVerifiedAt(LocalDateTime.now());
            profile.setVerifiedBy(admin.getUsername());
            expertProfileRepository.save(profile);
            
            return ResponseEntity.ok(Map.of("message", "Expert verified successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get unverified experts (Admin only)
     */
    @GetMapping("/pending-verification")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<ExpertDto.ExpertProfileResponse>> getPendingVerification() {
        List<ExpertProfile> profiles = expertProfileRepository.findByIsVerifiedFalseAndIsActiveTrue();
        return ResponseEntity.ok(profiles.stream().map(this::toExpertProfileResponse).collect(Collectors.toList()));
    }

    // ==================== Helper Methods ====================

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private ExpertDto.ExpertSearchResult toExpertSearchResult(ExpertProfile profile) {
        return ExpertDto.ExpertSearchResult.builder()
                .expertId(profile.getId())
                .userId(profile.getUser().getId())
                .fullName(profile.getUser().getFullName())
                .title(profile.getTitle())
                .institution(profile.getInstitution())
                .bio(profile.getBio())
                .specializations(profile.getSpecializations())
                .averageRating(profile.getAverageRating())
                .totalRatings(profile.getTotalRatings())
                .isVerified(profile.getIsVerified())
                .isAvailableNow(profile.getIsAvailableNow())
                .offersOneOnOne(profile.getOffersOneOnOne())
                .offersAsyncQA(profile.getOffersAsyncQA())
                .build();
    }

    private ExpertDto.ExpertProfileResponse toExpertProfileResponse(ExpertProfile profile) {
        return ExpertDto.ExpertProfileResponse.builder()
                .id(profile.getId())
                .userId(profile.getUser().getId())
                .username(profile.getUser().getUsername())
                .fullName(profile.getUser().getFullName())
                .email(profile.getUser().getEmail())
                .title(profile.getTitle())
                .institution(profile.getInstitution())
                .bio(profile.getBio())
                .qualifications(profile.getQualifications())
                .yearsOfExperience(profile.getYearsOfExperience())
                .specializations(profile.getSpecializations())
                .skills(profile.getSkills())
                .isVerified(profile.getIsVerified())
                .verifiedAt(profile.getVerifiedAt())
                .averageRating(profile.getAverageRating())
                .totalRatings(profile.getTotalRatings())
                .totalSessions(profile.getTotalSessions())
                .totalQuestionsAnswered(profile.getTotalQuestionsAnswered())
                .weeklyAvailability(profile.getWeeklyAvailability())
                .maxSessionsPerWeek(profile.getMaxSessionsPerWeek())
                .sessionDurationMinutes(profile.getSessionDurationMinutes())
                .acceptingNewStudents(profile.getAcceptingNewStudents())
                .offersGroupConsultations(profile.getOffersGroupConsultations())
                .offersOneOnOne(profile.getOffersOneOnOne())
                .offersAsyncQA(profile.getOffersAsyncQA())
                .typicalResponseHours(profile.getTypicalResponseHours())
                .isAvailableNow(profile.getIsAvailableNow())
                .helpfulAnswers(profile.getHelpfulAnswers())
                .studentsHelped(profile.getStudentsHelped())
                .linkedInUrl(profile.getLinkedInUrl())
                .personalWebsite(profile.getPersonalWebsite())
                .createdAt(profile.getCreatedAt())
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

    private ExpertDto.DashboardStats buildDashboardStats(Long expertId, ExpertProfile profile) {
        long completedSessions = sessionRepository.countCompletedSessionsByExpert(expertId);
        long totalSessions = sessionRepository.countByExpertId(expertId);
        long upcomingSessions = sessionRepository.findUpcomingSessionsByExpert(expertId, LocalDateTime.now()).size();
        long pendingQuestions = questionRepository.findPendingQuestionsForExpert(expertId).size();
        long answeredQuestions = questionRepository.countAnsweredByExpert(expertId);
        long uniqueStudents = sessionRepository.countUniqueStudentsByExpert(expertId);
        
        Double avgResponseTime = questionRepository.getAverageResponseTimeHours(expertId);
        
        // Session type distribution
        Map<String, Integer> sessionTypeDist = new HashMap<>();
        sessionRepository.getSessionTypeDistribution(expertId).forEach(row -> {
            sessionTypeDist.put(((ExpertSession.SessionType) row[0]).getDisplayName(), ((Long) row[1]).intValue());
        });
        
        // Question status distribution
        Map<String, Integer> questionStatusDist = new HashMap<>();
        questionRepository.getQuestionStatusDistribution(expertId).forEach(row -> {
            questionStatusDist.put(((ExpertQuestion.QuestionStatus) row[0]).getDisplayName(), ((Long) row[1]).intValue());
        });
        
        // Rating distribution
        List<ExpertDto.RatingDistribution> ratingDist = new ArrayList<>();
        long totalReviews = reviewRepository.countByExpertIdAndIsApprovedTrue(expertId);
        reviewRepository.getRatingDistribution(expertId).forEach(row -> {
            Integer rating = (Integer) row[0];
            Long count = (Long) row[1];
            ratingDist.add(ExpertDto.RatingDistribution.builder()
                    .rating(rating)
                    .count(count)
                    .percentage(totalReviews > 0 ? (count * 100.0 / totalReviews) : 0)
                    .build());
        });
        
        return ExpertDto.DashboardStats.builder()
                .totalSessions((int) totalSessions)
                .completedSessions((int) completedSessions)
                .upcomingSessions((int) upcomingSessions)
                .totalQuestionsAnswered((int) answeredQuestions)
                .pendingQuestions((int) pendingQuestions)
                .studentsHelped((int) uniqueStudents)
                .averageRating(profile.getAverageRating())
                .totalReviews((int) totalReviews)
                .averageResponseTimeHours(avgResponseTime)
                .helpfulAnswers(profile.getHelpfulAnswers())
                .sessionTypeDistribution(sessionTypeDist)
                .questionStatusDistribution(questionStatusDist)
                .ratingDistribution(ratingDist)
                .build();
    }

    private List<String> getNotifications(Long expertId) {
        List<String> notifications = new ArrayList<>();
        
        // Check for pending questions
        long pendingCount = questionRepository.findPendingQuestionsForExpert(expertId).size();
        if (pendingCount > 0) {
            notifications.add("You have " + pendingCount + " pending question(s) to answer");
        }
        
        // Check for upcoming sessions
        List<ExpertSession> upcomingSessions = sessionRepository.findUpcomingSessionsByExpert(expertId, LocalDateTime.now());
        LocalDateTime soon = LocalDateTime.now().plusHours(24);
        long soonSessions = upcomingSessions.stream()
                .filter(s -> s.getScheduledStartTime().isBefore(soon))
                .count();
        if (soonSessions > 0) {
            notifications.add("You have " + soonSessions + " session(s) in the next 24 hours");
        }
        
        // Check for urgent questions
        List<ExpertQuestion> urgentQuestions = questionRepository.findByIsUrgentTrueAndStatusInOrderByDueDateAsc(
                Arrays.asList(ExpertQuestion.QuestionStatus.OPEN, ExpertQuestion.QuestionStatus.ASSIGNED));
        if (!urgentQuestions.isEmpty()) {
            notifications.add("There are " + urgentQuestions.size() + " urgent question(s) waiting");
        }
        
        return notifications;
    }
}
