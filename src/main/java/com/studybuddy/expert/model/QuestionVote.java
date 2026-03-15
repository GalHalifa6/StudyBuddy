package com.studybuddy.expert.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Entity to track votes on questions to prevent duplicate voting
 */
@Entity
@Table(name = "question_votes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"question_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)

public class QuestionVote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private com.studybuddy.expert.model.ExpertQuestion question;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private com.studybuddy.user.model.User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private VoteType voteType;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum VoteType {
        UPVOTE,
        DOWNVOTE
    }
}
