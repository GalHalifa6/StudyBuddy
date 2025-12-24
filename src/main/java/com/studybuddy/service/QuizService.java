package com.studybuddy.service;

import com.studybuddy.dto.QuizDto;
import com.studybuddy.model.CharacteristicProfile;
import com.studybuddy.model.QuizOption;
import com.studybuddy.model.QuizQuestion;
import com.studybuddy.model.QuizStatus;
import com.studybuddy.model.RoleType;
import com.studybuddy.model.User;
import com.studybuddy.repository.CharacteristicProfileRepository;
import com.studybuddy.repository.QuizAnswerRepository;
import com.studybuddy.repository.QuizOptionRepository;
import com.studybuddy.repository.QuizQuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuizService {
    
    private final QuizQuestionRepository questionRepository;
    private final QuizOptionRepository optionRepository;
    private final CharacteristicProfileRepository profileRepository;
    private final QuizAnswerRepository answerRepository;
    
    /**
     * Get all active quiz questions.
     * Returns all questions (not filtered by answered status) so users can always see the first question.
     * The submit endpoint prevents re-answering already answered questions.
     */
    @Transactional(readOnly = true)
    public List<QuizDto.QuestionResponse> getQuiz(User user) {
        List<QuizQuestion> allQuestions = questionRepository.findAllActiveWithOptions();
        
        log.info("User {} - returning {} active quiz questions", user.getId(), allQuestions.size());
        
        // Return all questions (frontend will filter to show only first question)
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
        List<com.studybuddy.model.QuizAnswer> existingAnswers = answerRepository.findByUserId(user.getId());
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
            
            com.studybuddy.model.QuizAnswer answer = com.studybuddy.model.QuizAnswer.builder()
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
}
