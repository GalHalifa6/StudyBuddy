package com.studybuddy.repository;

import com.studybuddy.model.GroupMemberRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for GroupMemberRequest entity
 */
@Repository
public interface GroupMemberRequestRepository extends JpaRepository<GroupMemberRequest, Long> {

    // Find pending requests for a group
    List<GroupMemberRequest> findByGroupIdAndRequestTypeAndStatus(Long groupId, String requestType, String status);

    // Find all requests for a group
    List<GroupMemberRequest> findByGroupIdOrderByCreatedAtDesc(Long groupId);

    // Find pending invites for a user
    List<GroupMemberRequest> findByUserIdAndRequestTypeAndStatus(Long userId, String requestType, String status);

    // Find all requests/invites for a user
    List<GroupMemberRequest> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Check if a pending request/invite exists for user in group
    @Query("SELECT r FROM GroupMemberRequest r WHERE r.group.id = :groupId AND r.user.id = :userId " +
           "AND r.requestType = :requestType AND r.status = 'PENDING'")
    Optional<GroupMemberRequest> findPendingRequest(
            @Param("groupId") Long groupId, 
            @Param("userId") Long userId, 
            @Param("requestType") String requestType);

    // Check if user has any pending request for a group
    @Query("SELECT COUNT(r) > 0 FROM GroupMemberRequest r WHERE r.group.id = :groupId AND r.user.id = :userId " +
           "AND r.status = 'PENDING'")
    boolean existsPendingRequestForUser(@Param("groupId") Long groupId, @Param("userId") Long userId);

    // Get all pending join requests for groups created by a user
    @Query("SELECT r FROM GroupMemberRequest r WHERE r.group.creator.id = :creatorId " +
           "AND r.requestType = 'JOIN_REQUEST' AND r.status = 'PENDING' ORDER BY r.createdAt DESC")
    List<GroupMemberRequest> findPendingJoinRequestsForCreator(@Param("creatorId") Long creatorId);
}
