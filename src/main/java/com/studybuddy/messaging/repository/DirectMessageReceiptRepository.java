package com.studybuddy.messaging.repository;

import com.studybuddy.messaging.model.DirectMessageReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface DirectMessageReceiptRepository extends JpaRepository<DirectMessageReceipt, Long> {

    /**
     * Find receipt for a specific message and user
     */
    Optional<DirectMessageReceipt> findByMessageIdAndUserId(Long messageId, Long userId);

    /**
     * Mark all messages in a conversation as read for a user
     */
    @Modifying
    @Transactional
    @Query("UPDATE DirectMessageReceipt r SET r.isRead = true, r.readAt = :readAt " +
           "WHERE r.message.conversation.id = :conversationId AND r.user.id = :userId AND r.isRead = false")
    int markConversationAsRead(@Param("conversationId") Long conversationId, @Param("userId") Long userId, @Param("readAt") LocalDateTime readAt);

    /**
     * Count unread receipts for a user in a conversation
     */
    @Query("SELECT COUNT(r) FROM DirectMessageReceipt r " +
           "WHERE r.message.conversation.id = :conversationId " +
           "AND r.user.id = :userId " +
           "AND r.isRead = false")
    long countUnreadReceipts(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
}

