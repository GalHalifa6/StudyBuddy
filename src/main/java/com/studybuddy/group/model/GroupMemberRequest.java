package com.studybuddy.group.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * GroupMemberRequest Entity - Tracks join requests and invites for groups
 */
@Entity
@Table(name = "group_member_requests", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"group_id", "user_id", "request_type", "status"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class GroupMemberRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "group_id", nullable = false)
    @JsonIgnoreProperties({"members", "messages", "files", "roomShares"})
    private com.studybuddy.group.model.StudyGroup group;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private com.studybuddy.user.model.User user; // The user being invited or requesting to join

    @Column(name = "request_type", nullable = false)
    private String requestType; // JOIN_REQUEST (user requests) or INVITE (creator invites)

    @Builder.Default
    @Column(nullable = false)
    private String status = "PENDING"; // PENDING, ACCEPTED, REJECTED, CANCELLED

    @Column(columnDefinition = "TEXT")
    private String message; // Optional message from requester or inviter

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "invited_by_id")
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private com.studybuddy.user.model.User invitedBy; // For invites, who sent the invite

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime respondedAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "responded_by_id")
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private com.studybuddy.user.model.User respondedBy;
}
