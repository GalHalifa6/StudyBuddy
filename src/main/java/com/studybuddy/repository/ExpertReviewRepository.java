package com.studybuddy.repository;

import com.studybuddy.model.ExpertReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExpertReviewRepository extends JpaRepository<ExpertReview, Long> {

    // Find reviews for an expert
    List<ExpertReview> findByExpertIdAndIsApprovedTrueAndIsPublicTrueOrderByCreatedAtDesc(Long expertId);

    // Find reviews by student
    List<ExpertReview> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    // Find review by session
    Optional<ExpertReview> findBySessionId(Long sessionId);

    // Find review by question
    Optional<ExpertReview> findByQuestionId(Long questionId);

    // Check if student already reviewed expert for session
    boolean existsBySessionIdAndStudentId(Long sessionId, Long studentId);

    // Check if student already reviewed expert for question
    boolean existsByQuestionIdAndStudentId(Long questionId, Long studentId);

    // Find flagged reviews (for moderation)
    List<ExpertReview> findByIsFlaggedTrueOrderByReportCountDesc();

    // Find reviews pending approval
    List<ExpertReview> findByIsApprovedFalseOrderByCreatedAtAsc();

    // Paginated reviews for expert
    Page<ExpertReview> findByExpertIdAndIsApprovedTrueAndIsPublicTrue(Long expertId, Pageable pageable);

    // Find top reviews
    @Query("SELECT er FROM ExpertReview er WHERE er.expert.id = :expertId AND er.isApproved = true AND er.isPublic = true ORDER BY er.helpfulCount DESC")
    Page<ExpertReview> findTopReviewsForExpert(@Param("expertId") Long expertId, Pageable pageable);

    // Statistics
    @Query("SELECT AVG(er.rating) FROM ExpertReview er WHERE er.expert.id = :expertId AND er.isApproved = true")
    Double getAverageRatingForExpert(@Param("expertId") Long expertId);

    @Query("SELECT AVG(er.knowledgeRating) FROM ExpertReview er WHERE er.expert.id = :expertId AND er.knowledgeRating IS NOT NULL AND er.isApproved = true")
    Double getAverageKnowledgeRating(@Param("expertId") Long expertId);

    @Query("SELECT AVG(er.communicationRating) FROM ExpertReview er WHERE er.expert.id = :expertId AND er.communicationRating IS NOT NULL AND er.isApproved = true")
    Double getAverageCommunicationRating(@Param("expertId") Long expertId);

    @Query("SELECT AVG(er.responsivenessRating) FROM ExpertReview er WHERE er.expert.id = :expertId AND er.responsivenessRating IS NOT NULL AND er.isApproved = true")
    Double getAverageResponsivenessRating(@Param("expertId") Long expertId);

    @Query("SELECT AVG(er.helpfulnessRating) FROM ExpertReview er WHERE er.expert.id = :expertId AND er.helpfulnessRating IS NOT NULL AND er.isApproved = true")
    Double getAverageHelpfulnessRating(@Param("expertId") Long expertId);

    long countByExpertIdAndIsApprovedTrue(Long expertId);

    // Rating distribution
    @Query("SELECT er.rating, COUNT(er) FROM ExpertReview er WHERE er.expert.id = :expertId AND er.isApproved = true GROUP BY er.rating ORDER BY er.rating")
    List<Object[]> getRatingDistribution(@Param("expertId") Long expertId);
}
