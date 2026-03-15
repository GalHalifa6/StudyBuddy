package com.studybuddy.messaging.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * MessageReceipt Entity - Tracks read state of messages per user
 */
@Entity
@Table(name = "message_receipts", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"message_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@EntityListeners(AuditingEntityListener.class)
public class MessageReceipt {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    @JsonIgnoreProperties({"group", "sender", "attachedFile", "receipts", "hibernateLazyInitializer", "handler"})
    private com.studybuddy.messaging.model.Message message;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding", "hibernateLazyInitializer", "handler"})
    private com.studybuddy.user.model.User user;

    @Column(nullable = false)
    private Boolean isRead = false;

    @Column
    private LocalDateTime readAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
