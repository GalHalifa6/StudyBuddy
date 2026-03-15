package com.studybuddy.messaging.repository;

import com.studybuddy.messaging.model.Conversation;
import com.studybuddy.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    /**
     * Find or create conversation between two users
     * Returns existing conversation if found, or creates a new one
     */
    @Query("SELECT c FROM Conversation c WHERE " +
           "(c.userA.id = :userId1 AND c.userB.id = :userId2) OR " +
           "(c.userA.id = :userId2 AND c.userB.id = :userId1)")
    Optional<Conversation> findConversationBetweenUsers(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    /**
     * Find all conversations for a user
     */
    @Query("SELECT c FROM Conversation c WHERE c.userA.id = :userId OR c.userB.id = :userId ORDER BY c.lastMessageAt DESC NULLS LAST, c.createdAt DESC")
    List<Conversation> findByUserIdOrderByLastMessageAtDesc(@Param("userId") Long userId);

    /**
     * Check if conversation exists between two users
     */
    @Query("SELECT COUNT(c) > 0 FROM Conversation c WHERE " +
           "(c.userA.id = :userId1 AND c.userB.id = :userId2) OR " +
           "(c.userA.id = :userId2 AND c.userB.id = :userId1)")
    boolean existsBetweenUsers(@Param("userId1") Long userId1, @Param("userId2") Long userId2);
}

