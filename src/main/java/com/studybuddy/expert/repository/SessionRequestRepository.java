package com.studybuddy.expert.repository;

import com.studybuddy.expert.model.SessionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SessionRequestRepository extends JpaRepository<SessionRequest, Long> {

    // Find requests by student
    List<SessionRequest> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    // Find requests by expert
    List<SessionRequest> findByExpertIdOrderByCreatedAtDesc(Long expertId);

    // Find pending requests for an expert
    @Query("SELECT sr FROM SessionRequest sr WHERE sr.expert.id = :expertId AND sr.status = 'PENDING' ORDER BY sr.createdAt ASC")
    List<SessionRequest> findPendingRequestsByExpert(@Param("expertId") Long expertId);

    // Find requests by status for expert
    List<SessionRequest> findByExpertIdAndStatusOrderByCreatedAtDesc(Long expertId, SessionRequest.RequestStatus status);

    // Find requests by status for student
    List<SessionRequest> findByStudentIdAndStatusOrderByCreatedAtDesc(Long studentId, SessionRequest.RequestStatus status);
}

