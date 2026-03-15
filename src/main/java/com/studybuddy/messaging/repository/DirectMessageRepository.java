package com.studybuddy.messaging.repository;

import com.studybuddy.messaging.model.DirectMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DirectMessageRepository extends JpaRepository<DirectMessage, Long> {

    /**
     * Find all messages in a conversation, ordered by creation date
     */
    List<DirectMessage> findByConversationIdOrderByCreatedAtAsc(Long conversationId);

    /**
     * Find messages in a conversation with pagination support
     */
    @Query("SELECT dm FROM DirectMessage dm WHERE dm.conversation.id = :conversationId ORDER BY dm.createdAt DESC")
    List<DirectMessage> findRecentMessagesByConversationId(@Param("conversationId") Long conversationId);

    /**
     * Count unread messages in a conversation for a user
     */
    @Query("SELECT COUNT(dm) FROM DirectMessage dm " +
           "LEFT JOIN dm.receipts r ON r.user.id = :userId " +
           "WHERE dm.conversation.id = :conversationId " +
           "AND dm.sender.id != :userId " +
           "AND (r IS NULL OR r.isRead = false)")
    long countUnreadMessages(@Param("conversationId") Long conversationId, @Param("userId") Long userId);
}

