package com.studybuddy.expert.repository;

import com.studybuddy.expert.model.ExpertProfile;
import com.studybuddy.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExpertProfileRepository extends JpaRepository<ExpertProfile, Long>, JpaSpecificationExecutor<ExpertProfile> {

    Optional<ExpertProfile> findByUser(User user);
    
    Optional<ExpertProfile> findByUserId(Long userId);
    
    boolean existsByUserId(Long userId);

    // Find verified experts
    List<ExpertProfile> findByIsVerifiedTrueAndIsActiveTrue();
    
    // Find all active experts
    List<ExpertProfile> findByIsActiveTrue();

    // Find experts by specialization
    @Query("SELECT ep FROM ExpertProfile ep JOIN ep.specializations s WHERE LOWER(s) LIKE LOWER(CONCAT('%', :specialization, '%')) AND ep.isActive = true")
    List<ExpertProfile> findBySpecialization(@Param("specialization") String specialization);

    // Find experts by skill
    @Query("SELECT ep FROM ExpertProfile ep JOIN ep.skills s WHERE LOWER(s) LIKE LOWER(CONCAT('%', :skill, '%')) AND ep.isActive = true")
    List<ExpertProfile> findBySkill(@Param("skill") String skill);

    // Find experts by course
    @Query("SELECT ep FROM ExpertProfile ep JOIN ep.expertiseCourses c WHERE c.id = :courseId AND ep.isActive = true")
    List<ExpertProfile> findByCourseId(@Param("courseId") Long courseId);

    // Find top rated experts
    @Query("SELECT ep FROM ExpertProfile ep WHERE ep.isActive = true AND ep.isVerified = true ORDER BY ep.averageRating DESC")
    List<ExpertProfile> findTopRatedExperts();

    // Find available experts (accepting new students)
    List<ExpertProfile> findByAcceptingNewStudentsTrueAndIsActiveTrueAndIsVerifiedTrue();

    // Find experts available now
    List<ExpertProfile> findByIsAvailableNowTrueAndIsActiveTrue();

    // Search experts by multiple criteria
    @Query("SELECT DISTINCT ep FROM ExpertProfile ep " +
           "LEFT JOIN ep.specializations s " +
           "LEFT JOIN ep.skills sk " +
           "WHERE ep.isActive = true " +
           "AND (LOWER(ep.user.fullName) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(ep.bio) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(s) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(sk) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<ExpertProfile> searchExperts(@Param("query") String query);

    // Find unverified experts (for admin)
    List<ExpertProfile> findByIsVerifiedFalseAndIsActiveTrue();

    // Statistics queries
    @Query("SELECT COUNT(ep) FROM ExpertProfile ep WHERE ep.isActive = true")
    long countActiveExperts();

    @Query("SELECT COUNT(ep) FROM ExpertProfile ep WHERE ep.isVerified = true AND ep.isActive = true")
    long countVerifiedExperts();

    @Query("SELECT AVG(ep.averageRating) FROM ExpertProfile ep WHERE ep.isActive = true AND ep.totalRatings > 0")
    Double getOverallAverageRating();
    
    // Delete expert profile by user ID (for foreign key constraint handling)
    @Modifying
    @Query("DELETE FROM ExpertProfile ep WHERE ep.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
