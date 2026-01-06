package com.studybuddy.messaging.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.studybuddy.user.model.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Conversation Entity - Represents a direct message conversation between two users
 */
@Entity
@Table(name = "conversations", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user_a_id", "user_b_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ConversationType type = ConversationType.DIRECT;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_a_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private com.studybuddy.user.model.User userA;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_b_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private com.studybuddy.user.model.User userB;

    // Track last message time for sorting
    @Column
    private LocalDateTime lastMessageAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum ConversationType {
        DIRECT
    }

    /**
     * Check if a user is part of this conversation
     */
    public boolean hasParticipant(User user) {
        return userA.getId().equals(user.getId()) || userB.getId().equals(user.getId());
    }

    /**
     * Get the other participant in the conversation
     */
    public User getOtherParticipant(User user) {
        if (userA.getId().equals(user.getId())) {
            return userB;
        } else if (userB.getId().equals(user.getId())) {
            return userA;
        }
        return null;
    }
}

