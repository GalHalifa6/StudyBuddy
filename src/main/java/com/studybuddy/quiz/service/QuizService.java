package com.studybuddy.quiz.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studybuddy.quiz.dto.QuizDto;
import com.studybuddy.admin.model.AdminAuditLog;
import com.studybuddy.matching.model.CharacteristicProfile;
import com.studybuddy.quiz.model.QuizOption;
import com.studybuddy.quiz.model.QuizQuestion;
import com.studybuddy.quiz.model.QuizStatus;
import com.studybuddy.user.model.RoleType;
import com.studybuddy.user.model.User;
import com.studybuddy.admin.repository.AdminAuditLogRepository;
import com.studybuddy.matching.repository.CharacteristicProfileRepository;
import com.studybuddy.quiz.repository.QuizAnswerRepository;
import com.studybuddy.quiz.repository.QuizOptionRepository;
import com.studybuddy.quiz.repository.QuizQuestionRepository;
import com.studybuddy.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuizService {
    
    private final QuizQuestionRepository questionRepository;
    private final QuizOptionRepository optionRepository;
    private final CharacteristicProfileRepository profileRepository;
    private final QuizAnswerRepository answerRepository;
    private final AdminAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final com.studybuddy.quiz.repository.QuizConfigRepository quizConfigRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * Get all active quiz questions.
     * Returns questions based on admin configuration (selected question IDs).
     * If no questions are selected, returns all active questions.
     * The submit endpoint prevents re-answering already answered questions.
     */
    @Transactional(readOnly = true)
    public List<QuizDto.QuestionResponse> getQuiz(User user) {
        List<QuizQuestion> allQuestions = questionRepository.findAllActiveWithOptions();
        
        // Get configured selected question IDs
        com.studybuddy.quiz.model.QuizConfig config = quizConfigRepository.getDefaultConfig();
        List<Long> selectedQuestionIds = config.getSelectedQuestionIds();
        
        // If configured with specific question IDs, filter to only those questions
        if (selectedQuestionIds != null && !selectedQuestionIds.isEmpty()) {
            // Create a map for quick lookup
            Map<Long, QuizQuestion> questionMap = allQuestions.stream()
                    .collect(Collectors.toMap(QuizQuestion::getId, q -> q));
            
            // Filter to only selected questions, maintaining the order from config
            List<QuizQuestion> selectedQuestions = new java.util.ArrayList<>();
            for (Long questionId : selectedQuestionIds) {
                QuizQuestion question = questionMap.get(questionId);
                if (question != null && question.getActive()) {
                    selectedQuestions.add(question);
                }
            }
            
            allQuestions = selectedQuestions;
            log.info("User {} - returning {} of {} active quiz questions (filtered by selected IDs)", 
                    user.getId(), allQuestions.size(), questionRepository.findAllActiveWithOptions().size());
        } else {
            log.info("User {} - returning {} active quiz questions (no selection configured, showing all)", 
                    user.getId(), allQuestions.size());
        }
        
        // Return questions (frontend will filter to show only first question)
        return allQuestions.stream()
                .map(this::mapToQuestionResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * Submit quiz and generate characteristic profile.
     * Supports partial completion - saves progress even if not all questions answered.
     * For IN_PROGRESS quizzes, merges new answers with existing ones (no retakes allowed).
     */
    @Transactional
    public QuizDto.ProfileResponse submitQuiz(User user, QuizDto.QuizSubmissionRequest request) {
        log.info("Processing quiz submission for user {}", user.getId());
        
        // Get all questions to check completion
        List<QuizQuestion> allQuestions = questionRepository.findAllActiveWithOptions();
        int totalQuestions = allQuestions.size();
        
        // Get existing answers for this user
        List<com.studybuddy.quiz.model.QuizAnswer> existingAnswers = answerRepository.findByUserId(user.getId());
        Map<Long, Long> previousAnswers = existingAnswers.stream()
            .collect(java.util.stream.Collectors.toMap(
                a -> a.getQuestion().getId(),
                a -> a.getSelectedOption().getId()
            ));
        
        log.info("User {} has {} existing answers", user.getId(), previousAnswers.size());
        
        // Check for attempts to retake questions
        for (Long questionId : request.getAnswers().keySet()) {
            if (previousAnswers.containsKey(questionId)) {
                throw new IllegalArgumentException("Cannot retake question " + questionId + ". Questions can only be answered once.");
            }
        }
        
        // Save new answers
        for (Map.Entry<Long, Long> entry : request.getAnswers().entrySet()) {
            Long questionId = entry.getKey();
            Long optionId = entry.getValue();
            
            QuizQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid question ID: " + questionId));
            QuizOption option = optionRepository.findById(optionId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid option ID: " + optionId));
            
            com.studybuddy.quiz.model.QuizAnswer answer = com.studybuddy.quiz.model.QuizAnswer.builder()
                .user(user)
                .question(question)
                .selectedOption(option)
                .build();
            
            answerRepository.save(answer);
        }
        
        // Combine all answers (previous + new)
        Map<Long, Long> allAnswers = new HashMap<>(previousAnswers);
        allAnswers.putAll(request.getAnswers());
        
        int answeredQuestions = allAnswers.size();
        
        // Determine quiz status
        QuizStatus quizStatus;
        if (answeredQuestions == 0) {
            throw new IllegalArgumentException("Cannot submit empty quiz. Use skip endpoint to skip the quiz.");
        } else if (answeredQuestions >= totalQuestions) {
            quizStatus = QuizStatus.COMPLETED;
        } else {
            quizStatus = QuizStatus.IN_PROGRESS;
        }
        
        // Calculate scores based on ALL answers (including previously submitted ones)
        Map<RoleType, Double> rawScores = new HashMap<>();
        Map<RoleType, Double> maxPossible = new HashMap<>();
        
        for (RoleType role : RoleType.values()) {
            rawScores.put(role, 0.0);
            maxPossible.put(role, 0.0);
        }
        
        // Process each answer
        for (Map.Entry<Long, Long> entry : allAnswers.entrySet()) {
            Long optionId = entry.getValue();
            QuizOption option = optionRepository.findById(optionId)
                    .orElseThrow(() -> new IllegalArgumentException("Invalid option ID: " + optionId));
            
            // Accumulate scores
            for (Map.Entry<RoleType, Double> weight : option.getRoleWeights().entrySet()) {
                RoleType role = weight.getKey();
                Double value = weight.getValue();
                rawScores.put(role, rawScores.get(role) + value);
            }
        }
        
        // Calculate max possible scores from all questions
        for (QuizQuestion question : allQuestions) {
            for (QuizOption option : question.getOptions()) {
                for (Map.Entry<RoleType, Double> weight : option.getRoleWeights().entrySet()) {
                    RoleType role = weight.getKey();
                    Double value = weight.getValue();
                    maxPossible.put(role, Math.max(maxPossible.get(role), value));
                }
            }
        }
        
        // Normalize scores to 0.0-1.0 range
        Map<RoleType, Double> normalizedScores = new HashMap<>();
        for (RoleType role : RoleType.values()) {
            Double max = maxPossible.get(role);
            Double raw = rawScores.get(role);
            normalizedScores.put(role, max > 0 ? raw / (max * allQuestions.size()) : 0.0);
        }
        
        // Save or update profile
        CharacteristicProfile profile = profileRepository.findByUserId(user.getId())
                .orElse(CharacteristicProfile.builder()
                        .user(user)
                        .roleScores(new HashMap<>())
                        .build());
        
        for (Map.Entry<RoleType, Double> entry : normalizedScores.entrySet()) {
            profile.setRoleScore(entry.getKey(), entry.getValue());
        }
        
        // Update completion tracking
        profile.setQuizStatus(quizStatus);
        profile.setTotalQuestions(totalQuestions);
        profile.setAnsweredQuestions(answeredQuestions);
        profile.updateReliability();
        
        profile = profileRepository.save(profile);
        
        log.info("Profile created/updated for user {}. Status: {}, Questions: {}/{}", 
                user.getId(), quizStatus, answeredQuestions, totalQuestions);
        
        String message;
        if (quizStatus == QuizStatus.COMPLETED) {
            message = "Your learning profile is complete! We'll use this to find the best group matches for you.";
        } else {
            double percentage = (answeredQuestions * 100.0) / totalQuestions;
            message = String.format("Progress saved! You've answered %d/%d questions (%.0f%%). Complete the quiz for better matches.", 
                    answeredQuestions, totalQuestions, percentage);
        }
        
        return QuizDto.ProfileResponse.builder()
                .userId(user.getId())
                .message(message)
                .quizStatus(quizStatus)
                .reliabilityPercentage(profile.getReliabilityPercentage())
                .requiresOnboarding(false)
                .build();
    }
    
    /**
     * Skip the quiz entirely.
     * User chooses not to do the quiz - creates a profile with SKIPPED status.
     */
    @Transactional
    public QuizDto.ProfileResponse skipQuiz(User user) {
        log.info("User {} is skipping the quiz", user.getId());
        
        // Create or update profile with SKIPPED status
        CharacteristicProfile profile = profileRepository.findByUserId(user.getId())
                .orElse(CharacteristicProfile.builder()
                        .user(user)
                        .roleScores(new HashMap<>())
                        .build());
        
        profile.setQuizStatus(QuizStatus.SKIPPED);
        profile.setTotalQuestions(0);
        profile.setAnsweredQuestions(0);
        profile.updateReliability();
        
        profile = profileRepository.save(profile);
        
        log.info("Profile created for user {} with SKIPPED status", user.getId());
        
        return QuizDto.ProfileResponse.builder()
                .userId(user.getId())
                .message("Quiz skipped. You can take it later from settings to improve group matching.")
                .quizStatus(QuizStatus.SKIPPED)
                .reliabilityPercentage(0.0)
                .requiresOnboarding(false)
                .build();
    }
    
    /**
     * Get user's existing profile.
     */
    @Transactional
    public QuizDto.ProfileResponse getUserProfile(User user) {
        CharacteristicProfile profile = profileRepository.findByUserId(user.getId())
                .orElse(null);
        
        if (profile == null) {
            // No profile exists - user needs onboarding
            return QuizDto.ProfileResponse.builder()
                    .userId(user.getId())
                    .message("Please complete the onboarding quiz to help us match you with study groups.")
                    .quizStatus(QuizStatus.NOT_STARTED)
                    .reliabilityPercentage(0.0)
                    .requiresOnboarding(true)
                    .build();
        }
        
        // Handle legacy profiles with null quizStatus (migrate them)
        QuizStatus status = profile.getQuizStatus();
        if (status == null) {
            // Legacy profile - assume completed if it exists
            status = QuizStatus.COMPLETED;
            profile.setQuizStatus(status);
            if (profile.getReliabilityPercentage() == null) {
                profile.setReliabilityPercentage(1.0);
            }
            profileRepository.save(profile);
        }
        
        String message;
        switch (status) {
            case COMPLETED:
                message = "Profile complete";
                break;
            case IN_PROGRESS:
                Integer answered = profile.getAnsweredQuestions() != null ? profile.getAnsweredQuestions() : 0;
                Integer total = profile.getTotalQuestions() != null ? profile.getTotalQuestions() : 0;
                Double reliability = profile.getReliabilityPercentage() != null ? profile.getReliabilityPercentage() : 0.0;
                message = String.format("Quiz in progress: %d/%d questions answered (%.0f%% reliable)", 
                        answered, total, reliability * 100);
                break;
            case SKIPPED:
                message = "Quiz skipped. Complete it in settings for better matches.";
                break;
            case NOT_STARTED:
            default:
                message = "Quiz not started yet";
                break;
        }
        
        // Determine onboarding requirement based on status
        boolean requiresOnboarding = (status == QuizStatus.NOT_STARTED);
        
        return QuizDto.ProfileResponse.builder()
                .userId(user.getId())
                .message(message)
                .quizStatus(status)
                .reliabilityPercentage(profile.getReliabilityPercentage() != null ? profile.getReliabilityPercentage() : 0.0)
                .requiresOnboarding(requiresOnboarding)
                .build();
    }
    
    private QuizDto.QuestionResponse mapToQuestionResponse(QuizQuestion question) {
        List<QuizDto.OptionResponse> options = question.getOptions().stream()
                .map(opt -> QuizDto.OptionResponse.builder()
                        .optionId(opt.getId())
                        .optionText(opt.getOptionText())
                        .orderIndex(opt.getOrderIndex())
                        .build())
                .collect(Collectors.toList());
        
        return QuizDto.QuestionResponse.builder()
                .questionId(question.getId())
                .questionText(question.getQuestionText())
                .orderIndex(question.getOrderIndex())
                .options(options)
                .build();
    }
    
    // ==================== ADMIN METHODS ====================
    
    /**
     * Get all quiz questions (including inactive) for admin management.
     */
    @Transactional(readOnly = true)
    public List<QuizDto.QuestionAdminResponse> getAllQuestionsForAdmin() {
        List<QuizQuestion> allQuestions = questionRepository.findAll();
        
        return allQuestions.stream()
                .sorted((a, b) -> Integer.compare(
                    a.getOrderIndex() != null ? a.getOrderIndex() : 0,
                    b.getOrderIndex() != null ? b.getOrderIndex() : 0
                ))
                .map(this::mapToQuestionAdminResponse)
                .collect(Collectors.toList());
    }
    
    /**
     * Get a single question with full details for admin.
     */
    @Transactional(readOnly = true)
    public QuizDto.QuestionAdminResponse getQuestionForAdmin(Long questionId) {
        QuizQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found: " + questionId));
        return mapToQuestionAdminResponse(question);
    }
    
    /**
     * Create a new quiz question with options.
     */
    @Transactional
    public QuizDto.QuestionAdminResponse createQuestion(QuizDto.CreateQuestionRequest request) {
        QuizQuestion question = QuizQuestion.builder()
                .questionText(request.getQuestionText())
                .orderIndex(request.getOrderIndex())
                .active(true)
                .options(new java.util.ArrayList<>())
                .build();
        
        // Create options
        for (QuizDto.CreateOptionRequest optReq : request.getOptions()) {
            QuizOption option = QuizOption.builder()
                    .optionText(optReq.getOptionText())
                    .orderIndex(optReq.getOrderIndex())
                    .roleWeights(new HashMap<>(optReq.getRoleWeights()))
                    .build();
            question.addOption(option);
        }
        
        question = questionRepository.save(question);
        log.info("Created quiz question {} with {} options", question.getId(), question.getOptions().size());
        
        // Log audit action
        logAuditAction("QUIZ_QUESTION_CREATE", "QUIZ_QUESTION", question.getId(), 
                String.format("Created new quiz question: '%s'", request.getQuestionText()),
                Map.of(
                    "questionText", request.getQuestionText(),
                    "orderIndex", request.getOrderIndex(),
                    "optionsCount", request.getOptions().size()
                ));
        
        return mapToQuestionAdminResponse(question);
    }
    
    /**
     * Update a quiz question.
     */
    @Transactional
    public QuizDto.QuestionAdminResponse updateQuestion(Long questionId, QuizDto.UpdateQuestionRequest request) {
        QuizQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found: " + questionId));
        
        // Store old values for audit log
        String oldQuestionText = question.getQuestionText();
        Integer oldOrderIndex = question.getOrderIndex();
        Boolean oldActive = question.getActive();
        
        question.setQuestionText(request.getQuestionText());
        question.setOrderIndex(request.getOrderIndex());
        if (request.getActive() != null) {
            question.setActive(request.getActive());
        }
        
        // Update options if provided
        if (request.getOptions() != null && !request.getOptions().isEmpty()) {
            // Update existing options by orderIndex, or create new ones
            Map<Integer, QuizOption> existingOptionsByOrder = question.getOptions().stream()
                    .collect(Collectors.toMap(
                            opt -> opt.getOrderIndex() != null ? opt.getOrderIndex() : 0,
                            opt -> opt,
                            (a, b) -> a // In case of duplicates, keep first
                    ));
            
            // Track which order indices are being updated
            Set<Integer> updatedOrderIndices = new HashSet<>();
            
            for (QuizDto.UpdateOptionRequest optReq : request.getOptions()) {
                Integer orderIndex = optReq.getOrderIndex();
                updatedOrderIndices.add(orderIndex);
                
                QuizOption existingOption = existingOptionsByOrder.get(orderIndex);
                if (existingOption != null) {
                    // Update existing option
                    existingOption.setOptionText(optReq.getOptionText());
                    existingOption.setOrderIndex(optReq.getOrderIndex());
                    existingOption.setRoleWeights(new HashMap<>(optReq.getRoleWeights()));
                } else {
                    // Create new option
                    QuizOption newOption = QuizOption.builder()
                            .optionText(optReq.getOptionText())
                            .orderIndex(optReq.getOrderIndex())
                            .roleWeights(new HashMap<>(optReq.getRoleWeights()))
                            .build();
                    question.addOption(newOption);
                }
            }
            
            // Remove options that are no longer in the request (by orderIndex)
            question.getOptions().removeIf(opt -> 
                    opt.getOrderIndex() != null && !updatedOrderIndices.contains(opt.getOrderIndex()));
        }
        
        question = questionRepository.save(question);
        log.info("Updated quiz question {}", questionId);
        
        // Log audit action
        logAuditAction("QUIZ_QUESTION_UPDATE", "QUIZ_QUESTION", questionId, 
                String.format("Updated question: '%s' -> '%s'", oldQuestionText, request.getQuestionText()),
                Map.of(
                    "oldQuestionText", oldQuestionText,
                    "newQuestionText", request.getQuestionText(),
                    "oldOrderIndex", oldOrderIndex,
                    "newOrderIndex", request.getOrderIndex(),
                    "oldActive", oldActive,
                    "newActive", request.getActive() != null ? request.getActive() : oldActive,
                    "optionsUpdated", request.getOptions() != null && !request.getOptions().isEmpty()
                ));
        
        return mapToQuestionAdminResponse(question);
    }
    
    /**
     * Delete (deactivate) a quiz question.
     */
    @Transactional
    public void deleteQuestion(Long questionId) {
        QuizQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found: " + questionId));
        
        String questionText = question.getQuestionText();
        int optionsCount = question.getOptions().size();
        
        // Soft delete by setting active = false
        question.setActive(false);
        questionRepository.save(question);
        log.info("Deactivated quiz question {}", questionId);
        
        // Log audit action
        logAuditAction("QUIZ_QUESTION_DELETE", "QUIZ_QUESTION", questionId, 
                String.format("Deactivated quiz question: '%s'", questionText),
                Map.of(
                    "questionText", questionText,
                    "optionsCount", optionsCount
                ));
    }
    
    /**
     * Update a quiz option.
     */
    @Transactional
    public QuizDto.OptionAdminResponse updateOption(Long questionId, Long optionId, QuizDto.UpdateOptionRequest request) {
        QuizQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found: " + questionId));
        
        QuizOption option = question.getOptions().stream()
                .filter(opt -> opt.getId().equals(optionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Option not found: " + optionId));
        
        String oldOptionText = option.getOptionText();
        
        option.setOptionText(request.getOptionText());
        option.setOrderIndex(request.getOrderIndex());
        option.setRoleWeights(new HashMap<>(request.getRoleWeights()));
        
        optionRepository.save(option);
        log.info("Updated option {} for question {}", optionId, questionId);
        
        // Log audit action
        logAuditAction("QUIZ_OPTION_UPDATE", "QUIZ_OPTION", optionId, 
                String.format("Updated option for question %d: '%s' -> '%s'", questionId, oldOptionText, request.getOptionText()),
                Map.of(
                    "questionId", questionId,
                    "oldOptionText", oldOptionText,
                    "newOptionText", request.getOptionText(),
                    "orderIndex", request.getOrderIndex()
                ));
        
        return mapToOptionAdminResponse(option);
    }
    
    /**
     * Delete a quiz option.
     */
    @Transactional
    public void deleteOption(Long questionId, Long optionId) {
        QuizQuestion question = questionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Question not found: " + questionId));
        
        QuizOption option = question.getOptions().stream()
                .filter(opt -> opt.getId().equals(optionId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Option not found: " + optionId));
        
        String optionText = option.getOptionText();
        
        // Remove from question's options list
        question.getOptions().remove(option);
        questionRepository.save(question);
        
        // Delete the option
        optionRepository.delete(option);
        log.info("Deleted option {} from question {}", optionId, questionId);
        
        // Log audit action
        logAuditAction("QUIZ_OPTION_DELETE", "QUIZ_OPTION", optionId, 
                String.format("Deleted option from question %d: '%s'", questionId, optionText),
                Map.of(
                    "questionId", questionId,
                    "optionText", optionText
                ));
    }
    
    /**
     * Log admin action to audit log.
     */
    private void logAuditAction(String actionType, String targetType, Long targetId, String reason, Map<String, Object> metadata) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated()) {
                User admin = userRepository.findByUsername(auth.getName()).orElse(null);
                if (admin != null) {
                    AdminAuditLog log = new AdminAuditLog();
                    log.setAdminUserId(admin.getId());
                    log.setActionType(actionType);
                    log.setTargetType(targetType);
                    log.setTargetId(targetId);
                    log.setReason(reason);
                    
                    if (metadata != null && !metadata.isEmpty()) {
                        try {
                            log.setMetadata(objectMapper.writeValueAsString(metadata));
                        } catch (JsonProcessingException e) {
                            log.setMetadata(metadata.toString());
                        }
                    }
                    
                    auditLogRepository.save(log);
                }
            }
        } catch (Exception e) {
            // Don't fail the operation if audit logging fails
            log.warn("Failed to log audit action: {}", e.getMessage());
        }
    }
    
    private QuizDto.QuestionAdminResponse mapToQuestionAdminResponse(QuizQuestion question) {
        List<QuizDto.OptionAdminResponse> options = question.getOptions().stream()
                .sorted((a, b) -> Integer.compare(
                    a.getOrderIndex() != null ? a.getOrderIndex() : 0,
                    b.getOrderIndex() != null ? b.getOrderIndex() : 0
                ))
                .map(this::mapToOptionAdminResponse)
                .collect(Collectors.toList());
        
        return QuizDto.QuestionAdminResponse.builder()
                .questionId(question.getId())
                .questionText(question.getQuestionText())
                .orderIndex(question.getOrderIndex())
                .active(question.getActive())
                .options(options)
                .build();
    }
    
    private QuizDto.OptionAdminResponse mapToOptionAdminResponse(QuizOption option) {
        return QuizDto.OptionAdminResponse.builder()
                .optionId(option.getId())
                .optionText(option.getOptionText())
                .orderIndex(option.getOrderIndex())
                .roleWeights(new HashMap<>(option.getRoleWeights()))
                .build();
    }
    
    // ==================== QUIZ CONFIG METHODS ====================
    
    /**
     * Get quiz configuration.
     */
    @Transactional(readOnly = true)
    public com.studybuddy.quiz.model.QuizConfig getQuizConfig() {
        return quizConfigRepository.getDefaultConfig();
    }
    
    /**
     * Update quiz configuration.
     */
    @Transactional
    public com.studybuddy.quiz.model.QuizConfig updateQuizConfig(List<Long> selectedQuestionIds) {
        com.studybuddy.quiz.model.QuizConfig config = quizConfigRepository.getDefaultConfig();
        
        // Validate that all selected question IDs exist and are active
        if (selectedQuestionIds != null && !selectedQuestionIds.isEmpty()) {
            List<QuizQuestion> allActiveQuestions = questionRepository.findAllActiveWithOptions();
            Set<Long> activeQuestionIds = allActiveQuestions.stream()
                    .map(QuizQuestion::getId)
                    .collect(Collectors.toSet());
            
            // Filter out invalid question IDs
            List<Long> validQuestionIds = selectedQuestionIds.stream()
                    .filter(activeQuestionIds::contains)
                    .collect(Collectors.toList());
            
            config.setSelectedQuestionIds(validQuestionIds);
            log.info("Updated quiz config: selected {} question IDs", validQuestionIds.size());
        } else {
            config.setSelectedQuestionIds(new java.util.ArrayList<>());
            log.info("Updated quiz config: no questions selected (will show all)");
        }
        
        config = quizConfigRepository.save(config);
        
        // Log audit action
        logAuditAction("QUIZ_CONFIG_UPDATE", "QUIZ_CONFIG", config.getId(), 
                String.format("Updated quiz configuration: %d questions selected", 
                        config.getSelectedQuestionIds() != null ? config.getSelectedQuestionIds().size() : 0),
                Map.of("selectedQuestionIds", config.getSelectedQuestionIds() != null ? config.getSelectedQuestionIds() : List.of()));
        
        return config;
    }
}
