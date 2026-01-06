package com.studybuddy.controller;

import com.studybuddy.dto.QuizDto;
import com.studybuddy.service.QuizService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin Controller for managing quiz questions and options.
 * Only admins can create, edit, and delete quiz questions.
 */
@RestController
@RequestMapping("/api/admin/quiz")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Slf4j
public class QuizAdminController {
    
    private final QuizService quizService;
    
    /**
     * GET /api/admin/quiz/questions
     * Get all quiz questions (including inactive) for admin management.
     */
    @GetMapping("/questions")
    public ResponseEntity<List<QuizDto.QuestionAdminResponse>> getAllQuestions() {
        log.info("Admin fetching all quiz questions");
        List<QuizDto.QuestionAdminResponse> questions = quizService.getAllQuestionsForAdmin();
        return ResponseEntity.ok(questions);
    }
    
    /**
     * GET /api/admin/quiz/questions/{id}
     * Get a single question with full details.
     */
    @GetMapping("/questions/{id}")
    public ResponseEntity<QuizDto.QuestionAdminResponse> getQuestion(@PathVariable Long id) {
        log.info("Admin fetching question {}", id);
        QuizDto.QuestionAdminResponse question = quizService.getQuestionForAdmin(id);
        return ResponseEntity.ok(question);
    }
    
    /**
     * POST /api/admin/quiz/questions
     * Create a new quiz question with options.
     */
    @PostMapping("/questions")
    public ResponseEntity<QuizDto.QuestionAdminResponse> createQuestion(
            @Valid @RequestBody QuizDto.CreateQuestionRequest request) {
        log.info("Admin creating new quiz question");
        QuizDto.QuestionAdminResponse question = quizService.createQuestion(request);
        return ResponseEntity.ok(question);
    }
    
    /**
     * PUT /api/admin/quiz/questions/{id}
     * Update a quiz question.
     */
    @PutMapping("/questions/{id}")
    public ResponseEntity<QuizDto.QuestionAdminResponse> updateQuestion(
            @PathVariable Long id,
            @Valid @RequestBody QuizDto.UpdateQuestionRequest request) {
        log.info("Admin updating question {}", id);
        QuizDto.QuestionAdminResponse question = quizService.updateQuestion(id, request);
        return ResponseEntity.ok(question);
    }
    
    /**
     * DELETE /api/admin/quiz/questions/{id}
     * Delete (deactivate) a quiz question.
     */
    @DeleteMapping("/questions/{id}")
    public ResponseEntity<Void> deleteQuestion(@PathVariable Long id) {
        log.info("Admin deleting question {}", id);
        quizService.deleteQuestion(id);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * PUT /api/admin/quiz/questions/{questionId}/options/{optionId}
     * Update a quiz option.
     */
    @PutMapping("/questions/{questionId}/options/{optionId}")
    public ResponseEntity<QuizDto.OptionAdminResponse> updateOption(
            @PathVariable Long questionId,
            @PathVariable Long optionId,
            @Valid @RequestBody QuizDto.UpdateOptionRequest request) {
        log.info("Admin updating option {} for question {}", optionId, questionId);
        QuizDto.OptionAdminResponse option = quizService.updateOption(questionId, optionId, request);
        return ResponseEntity.ok(option);
    }
    
    /**
     * DELETE /api/admin/quiz/questions/{questionId}/options/{optionId}
     * Delete a quiz option.
     */
    @DeleteMapping("/questions/{questionId}/options/{optionId}")
    public ResponseEntity<Void> deleteOption(
            @PathVariable Long questionId,
            @PathVariable Long optionId) {
        log.info("Admin deleting option {} from question {}", optionId, questionId);
        quizService.deleteOption(questionId, optionId);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * GET /api/admin/quiz/config
     * Get quiz configuration.
     */
    @GetMapping("/config")
    public ResponseEntity<com.studybuddy.model.QuizConfig> getConfig() {
        log.info("Admin fetching quiz configuration");
        com.studybuddy.model.QuizConfig config = quizService.getQuizConfig();
        return ResponseEntity.ok(config);
    }
    
    /**
     * PUT /api/admin/quiz/config
     * Update quiz configuration.
     */
    @PutMapping("/config")
    public ResponseEntity<com.studybuddy.model.QuizConfig> updateConfig(
            @RequestBody QuizConfigUpdateRequest request) {
        log.info("Admin updating quiz configuration: {} questions selected", 
                request.getSelectedQuestionIds() != null ? request.getSelectedQuestionIds().size() : 0);
        com.studybuddy.model.QuizConfig config = quizService.updateQuizConfig(request.getSelectedQuestionIds());
        return ResponseEntity.ok(config);
    }
    
    /**
     * Request DTO for updating quiz config
     */
    public static class QuizConfigUpdateRequest {
        private java.util.List<Long> selectedQuestionIds;
        
        public java.util.List<Long> getSelectedQuestionIds() {
            return selectedQuestionIds;
        }
        
        public void setSelectedQuestionIds(java.util.List<Long> selectedQuestionIds) {
            this.selectedQuestionIds = selectedQuestionIds;
        }
    }
}

