package com.studybuddy.repository;

import com.studybuddy.model.Topic;
import com.studybuddy.model.User;
import com.studybuddy.model.UserTopic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserTopicRepository extends JpaRepository<UserTopic, Long> {
    
    /**
     * Find all topics for a user
     */
    List<UserTopic> findByUser(User user);
    
    /**
     * Find all topics for a user by user ID
     */
    List<UserTopic> findByUserId(Long userId);
    
    /**
     * Check if user has a specific topic
     */
    Optional<UserTopic> findByUserAndTopic(User user, Topic topic);
    
    /**
     * Delete all topics for a user
     */
    void deleteByUser(User user);
    
    /**
     * Delete a specific user-topic association
     */
    void deleteByUserAndTopic(User user, Topic topic);
    
    /**
     * Count topics for a user
     */
    long countByUser(User user);
    
    /**
     * Find users with a specific topic
     */
    List<UserTopic> findByTopic(Topic topic);
    
    /**
     * Find users with a specific topic ID
     */
    List<UserTopic> findByTopicId(Long topicId);
    
    /**
     * Get topics for multiple users (useful for matching)
     */
    @Query("SELECT ut FROM UserTopic ut WHERE ut.user.id IN :userIds")
    List<UserTopic> findByUserIdIn(@Param("userIds") List<Long> userIds);
}
