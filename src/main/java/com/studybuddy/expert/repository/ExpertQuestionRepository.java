package com.studybuddy.expert.repository;

import com.studybuddy.expert.model.ExpertQuestion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ExpertQuestionRepository extends JpaRepository<ExpertQuestion, Long> {

    // Find questions by student
    List<ExpertQuestion> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    // Find questions assigned to expert
    List<ExpertQuestion> findByExpertIdOrderByCreatedAtDesc(Long expertId);

    // Find questions answered by expert
    List<ExpertQuestion> findByAnsweredByIdOrderByAnsweredAtDesc(Long expertId);

    // Find open questions (not assigned to any expert)
    List<ExpertQuestion> findByExpertIsNullAndStatusOrderByCreatedAtDesc(ExpertQuestion.QuestionStatus status);

    // Find questions by status
    List<ExpertQuestion> findByStatusOrderByCreatedAtDesc(ExpertQuestion.QuestionStatus status);

    // Find questions by course
    List<ExpertQuestion> findByCourseIdAndIsPublicTrueOrderByCreatedAtDesc(Long courseId);

    long countByCourseIdAndIsPublicTrue(Long courseId);

    List<ExpertQuestion> findTop3ByCourseIdAndIsPublicTrueOrderByCreatedAtDesc(Long courseId);

    // Find questions by study group
    List<ExpertQuestion> findByStudyGroupIdOrderByCreatedAtDesc(Long groupId);

    // Find public questions
    List<ExpertQuestion> findByIsPublicTrueOrderByCreatedAtDesc();

    // Find urgent questions
    List<ExpertQuestion> findByIsUrgentTrueAndStatusInOrderByDueDateAsc(List<ExpertQuestion.QuestionStatus> statuses);

    // Find unanswered questions for expert
    @Query("SELECT eq FROM ExpertQuestion eq WHERE eq.expert.id = :expertId AND eq.status NOT IN ('ANSWERED', 'CLOSED', 'RESOLVED') ORDER BY eq.isUrgent DESC, eq.createdAt ASC")
    List<ExpertQuestion> findPendingQuestionsForExpert(@Param("expertId") Long expertId);

    // Find questions by tags
    @Query("SELECT eq FROM ExpertQuestion eq JOIN eq.tags t WHERE LOWER(t) IN :tags AND eq.isPublic = true ORDER BY eq.createdAt DESC")
    List<ExpertQuestion> findByTags(@Param("tags") List<String> tags);

    // Search questions
    @Query("SELECT eq FROM ExpertQuestion eq WHERE eq.isPublic = true AND (LOWER(eq.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(eq.content) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<ExpertQuestion> searchQuestions(@Param("query") String query);

    // Find trending questions (most upvotes)
    @Query("SELECT eq FROM ExpertQuestion eq WHERE eq.isPublic = true ORDER BY (eq.upvotes - eq.downvotes) DESC, eq.viewCount DESC")
    Page<ExpertQuestion> findTrendingQuestions(Pageable pageable);

    // Find recent answered questions
    @Query("SELECT eq FROM ExpertQuestion eq WHERE eq.status = 'ANSWERED' AND eq.isPublic = true ORDER BY eq.answeredAt DESC")
    Page<ExpertQuestion> findRecentlyAnsweredQuestions(Pageable pageable);

    // Find questions with accepted answers
    List<ExpertQuestion> findByIsAnswerAcceptedTrueAndIsPublicTrueOrderByResolvedAtDesc();

    // Find questions needing attention (overdue)
    @Query("SELECT eq FROM ExpertQuestion eq WHERE eq.dueDate IS NOT NULL AND eq.dueDate < :now AND eq.status NOT IN ('ANSWERED', 'CLOSED', 'RESOLVED')")
    List<ExpertQuestion> findOverdueQuestions(@Param("now") LocalDateTime now);

    // Find follow-up questions
    List<ExpertQuestion> findByParentQuestionIdOrderByCreatedAtAsc(Long parentQuestionId);

    // Statistics queries
    @Query("SELECT COUNT(eq) FROM ExpertQuestion eq WHERE eq.expert.id = :expertId AND eq.status IN ('ANSWERED', 'RESOLVED')")
    long countAnsweredByExpert(@Param("expertId") Long expertId);

    @Query("SELECT COUNT(eq) FROM ExpertQuestion eq WHERE eq.expert.id = :expertId AND eq.isAnswerAccepted = true")
    long countAcceptedAnswersByExpert(@Param("expertId") Long expertId);

    @Query("SELECT COUNT(eq) FROM ExpertQuestion eq WHERE eq.expert.id = :expertId AND eq.isAnswerHelpful = true")
    long countHelpfulAnswersByExpert(@Param("expertId") Long expertId);

    @Query("SELECT AVG(TIMESTAMPDIFF(HOUR, eq.createdAt, eq.answeredAt)) FROM ExpertQuestion eq WHERE eq.answeredBy.id = :expertId AND eq.answeredAt IS NOT NULL")
    Double getAverageResponseTimeHours(@Param("expertId") Long expertId);

    // Count by status for expert dashboard
    @Query("SELECT eq.status, COUNT(eq) FROM ExpertQuestion eq WHERE eq.expert.id = :expertId GROUP BY eq.status")
    List<Object[]> getQuestionStatusDistribution(@Param("expertId") Long expertId);

    // Popular tags
    @Query(value = "SELECT t.tag, COUNT(*) as count FROM question_tags t JOIN expert_questions eq ON t.question_id = eq.id WHERE eq.is_public = true GROUP BY t.tag ORDER BY count DESC LIMIT :limit", nativeQuery = true)
    List<Object[]> getPopularTags(@Param("limit") int limit);
}
