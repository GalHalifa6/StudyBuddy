package com.studybuddy.notification.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Notification Entity - Reusable notification system for various events
 */
@Entity
@Table(name = "notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding", "notifications"})
    private com.studybuddy.user.model.User user; // The user who receives this notification

    @Column(nullable = false)
    private String type; // GROUP_JOIN_REQUEST, GROUP_INVITE, EXPERT_SESSION, MESSAGE_MENTION, etc.

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String message;

    // Direct link to navigate to (e.g., /session/123)
    @Column(length = 500)
    private String link;

    // Reference IDs for linking to related entities
    private Long referenceId; // e.g., groupId, sessionId, etc.
    private String referenceType; // e.g., "GROUP", "SESSION", "MESSAGE"

    // For actions that need approval
    private Long actorId; // The user who triggered the notification (e.g., user requesting to join)
    
    @Column(nullable = false)
    private Boolean isRead = false;

    @Column(nullable = false)
    private Boolean isActionable = false; // If true, requires accept/reject action

    private String actionStatus; // PENDING, ACCEPTED, REJECTED

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime readAt;
    private LocalDateTime actionTakenAt;
}
