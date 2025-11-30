package com.studybuddy.controller;

import com.studybuddy.model.*;
import com.studybuddy.repository.*;
import com.studybuddy.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Question Controller - Handles student questions to experts
 */
@RestController
@RequestMapping("/api/questions")
public class QuestionController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ExpertQuestionRepository questionRepository;

    @Autowired
    private ExpertProfileRepository expertProfileRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private QuestionVoteRepository questionVoteRepository;

    /**
     * Get all public questions with answers (for community Q&A browsing)
     */
    @GetMapping("/public")
    public ResponseEntity<List<Map<String, Object>>> getPublicQuestions() {
        List<ExpertQuestion> questions = questionRepository.findByIsPublicTrueOrderByCreatedAtDesc();
        List<Map<String, Object>> result = questions.stream()
            .map(this::toQuestionResponse)
            .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * Ask a question to an expert (student endpoint)
     */
    @PostMapping
    public ResponseEntity<?> askQuestion(@Valid @RequestBody AskQuestionRequest request) {
        try {
            User student = getCurrentUser();
            
            ExpertQuestion question = new ExpertQuestion();
            question.setStudent(student);
            question.setTitle(request.getTitle());
            question.setContent(request.getContent());
            question.setCodeSnippet(request.getCodeSnippet());
            question.setProgrammingLanguage(request.getProgrammingLanguage());
            question.setIsPublic(request.getIsPublic() != null ? request.getIsPublic() : true);
            question.setIsAnonymous(request.getIsAnonymous() != null ? request.getIsAnonymous() : false);
            question.setIsUrgent(request.getIsUrgent() != null ? request.getIsUrgent() : false);
            question.setTags(request.getTags());
            question.setAttachments(request.getAttachments());
            question.setStatus(ExpertQuestion.QuestionStatus.OPEN);
            question.setPriority(request.getIsUrgent() != null && request.getIsUrgent() 
                ? ExpertQuestion.QuestionPriority.HIGH 
                : ExpertQuestion.QuestionPriority.NORMAL);
            
            // Set due date if urgent
            if (Boolean.TRUE.equals(request.getIsUrgent())) {
                question.setDueDate(LocalDateTime.now().plusDays(1));
            }
            
            // Assign to specific expert if provided
            if (request.getExpertId() != null) {
                User expert = userRepository.findById(request.getExpertId())
                    .orElseThrow(() -> new RuntimeException("Expert not found"));
                question.setExpert(expert);
                question.setStatus(ExpertQuestion.QuestionStatus.ASSIGNED);
                
                // Notify the expert
                notificationService.createActionableNotification(
                    expert,
                    "NEW_QUESTION",
                    "New Question from " + (Boolean.TRUE.equals(request.getIsAnonymous()) ? "Anonymous" : student.getFullName()),
                    "Question: " + request.getTitle(),
                    null,
                    "QUESTION",
                    student.getId()
                );
            }
            
            // Set course if provided
            if (request.getCourseId() != null) {
                Course course = courseRepository.findById(request.getCourseId())
                    .orElse(null);
                question.setCourse(course);
            }
            
            ExpertQuestion savedQuestion = questionRepository.save(question);
            
            return ResponseEntity.ok(toQuestionResponse(savedQuestion));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get questions asked by the current user
     */
    @GetMapping("/my-questions")
    public ResponseEntity<List<Map<String, Object>>> getMyQuestions() {
        User student = getCurrentUser();
        List<ExpertQuestion> questions = questionRepository.findByStudentIdOrderByCreatedAtDesc(student.getId());
        List<Map<String, Object>> result = questions.stream()
            .map(this::toQuestionResponse)
            .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    /**
     * Get a specific question
     */
    @GetMapping("/{questionId}")
    public ResponseEntity<?> getQuestion(@PathVariable Long questionId) {
        ExpertQuestion question = questionRepository.findById(questionId).orElse(null);
        if (question == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Increment view count
        question.setViewCount(question.getViewCount() + 1);
        questionRepository.save(question);
        
        return ResponseEntity.ok(toQuestionResponse(question));
    }

    /**
     * Mark answer as helpful (student endpoint)
     */
    @PostMapping("/{questionId}/helpful")
    public ResponseEntity<?> markAnswerHelpful(@PathVariable Long questionId) {
        User student = getCurrentUser();
        ExpertQuestion question = questionRepository.findById(questionId)
            .orElseThrow(() -> new RuntimeException("Question not found"));
        
        if (!question.getStudent().getId().equals(student.getId())) {
            return ResponseEntity.status(403).body(Map.of("message", "Not your question"));
        }
        
        question.setIsAnswerHelpful(true);
        question.setIsAnswerAccepted(true);
        questionRepository.save(question);
        
        // Update expert's helpful answers count
        if (question.getAnsweredBy() != null) {
            ExpertProfile profile = expertProfileRepository.findByUser(question.getAnsweredBy()).orElse(null);
            if (profile != null) {
                profile.setHelpfulAnswers(profile.getHelpfulAnswers() + 1);
                expertProfileRepository.save(profile);
            }
        }
        
        return ResponseEntity.ok(Map.of("message", "Answer marked as helpful"));
    }

    /**
     * Upvote a question/answer - prevents duplicate voting
     */
    @PostMapping("/{questionId}/upvote")
    @Transactional
    public ResponseEntity<?> upvoteQuestion(@PathVariable Long questionId) {
        User user = getCurrentUser();
        ExpertQuestion question = questionRepository.findById(questionId)
            .orElseThrow(() -> new RuntimeException("Question not found"));
        
        // Check if user has already voted
        Optional<QuestionVote> existingVote = questionVoteRepository.findByQuestionIdAndUserId(questionId, user.getId());
        
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

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Map<String, Object> toQuestionResponse(ExpertQuestion question) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", question.getId());
        map.put("title", question.getTitle());
        map.put("content", question.getContent());
        map.put("codeSnippet", question.getCodeSnippet());
        map.put("programmingLanguage", question.getProgrammingLanguage());
        map.put("status", question.getStatus() != null ? question.getStatus().getDisplayName() : null);
        map.put("priority", question.getPriority() != null ? question.getPriority().getDisplayName() : null);
        map.put("tags", question.getTags());
        map.put("answer", question.getAnswer());
        map.put("answeredAt", question.getAnsweredAt());
        map.put("isPublic", question.getIsPublic());
        map.put("isAnonymous", question.getIsAnonymous());
        map.put("isUrgent", question.getIsUrgent());
        map.put("viewCount", question.getViewCount());
        map.put("upvotes", question.getUpvotes());
        map.put("downvotes", question.getDownvotes());
        map.put("netVotes", question.getNetVotes());
        map.put("isAnswerAccepted", question.getIsAnswerAccepted());
        map.put("isAnswerHelpful", question.getIsAnswerHelpful());
        map.put("dueDate", question.getDueDate());
        map.put("createdAt", question.getCreatedAt());
        
        // Student info (if not anonymous)
        if (!Boolean.TRUE.equals(question.getIsAnonymous()) && question.getStudent() != null) {
            Map<String, Object> student = new HashMap<>();
            student.put("id", question.getStudent().getId());
            student.put("fullName", question.getStudent().getFullName());
            student.put("username", question.getStudent().getUsername());
            map.put("student", student);
        }
        
        // Expert info
        if (question.getExpert() != null) {
            Map<String, Object> expert = new HashMap<>();
            expert.put("id", question.getExpert().getId());
            expert.put("fullName", question.getExpert().getFullName());
            map.put("expert", expert);
        }
        
        // Answered by info
        if (question.getAnsweredBy() != null) {
            Map<String, Object> answeredBy = new HashMap<>();
            answeredBy.put("id", question.getAnsweredBy().getId());
            answeredBy.put("fullName", question.getAnsweredBy().getFullName());
            map.put("answeredBy", answeredBy);
        }
        
        // Course info
        if (question.getCourse() != null) {
            Map<String, Object> course = new HashMap<>();
            course.put("id", question.getCourse().getId());
            course.put("code", question.getCourse().getCode());
            course.put("name", question.getCourse().getName());
            map.put("course", course);
        }
        
        return map;
    }

    // Request DTO
    public static class AskQuestionRequest {
        private String title;
        private String content;
        private String codeSnippet;
        private String programmingLanguage;
        private Long expertId;
        private Long courseId;
        private Long groupId;
        private List<String> tags;
        private Boolean isPublic;
        private Boolean isAnonymous;
        private Boolean isUrgent;
        private List<String> attachments;

        // Getters and setters
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public String getCodeSnippet() { return codeSnippet; }
        public void setCodeSnippet(String codeSnippet) { this.codeSnippet = codeSnippet; }
        public String getProgrammingLanguage() { return programmingLanguage; }
        public void setProgrammingLanguage(String programmingLanguage) { this.programmingLanguage = programmingLanguage; }
        public Long getExpertId() { return expertId; }
        public void setExpertId(Long expertId) { this.expertId = expertId; }
        public Long getCourseId() { return courseId; }
        public void setCourseId(Long courseId) { this.courseId = courseId; }
        public Long getGroupId() { return groupId; }
        public void setGroupId(Long groupId) { this.groupId = groupId; }
        public List<String> getTags() { return tags; }
        public void setTags(List<String> tags) { this.tags = tags; }
        public Boolean getIsPublic() { return isPublic; }
        public void setIsPublic(Boolean isPublic) { this.isPublic = isPublic; }
        public Boolean getIsAnonymous() { return isAnonymous; }
        public void setIsAnonymous(Boolean isAnonymous) { this.isAnonymous = isAnonymous; }
        public Boolean getIsUrgent() { return isUrgent; }
        public void setIsUrgent(Boolean isUrgent) { this.isUrgent = isUrgent; }
        public List<String> getAttachments() { return attachments; }
        public void setAttachments(List<String> attachments) { this.attachments = attachments; }
    }
}
