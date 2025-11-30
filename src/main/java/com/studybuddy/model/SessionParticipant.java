package com.studybuddy.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * SessionParticipant Entity - Tracks users who join expert sessions
 */
@Entity
@Table(name = "session_participants", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"session_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SessionParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "session_id", nullable = false)
    @JsonIgnoreProperties({"participants"})
    private ExpertSession session;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ParticipantStatus status = ParticipantStatus.REGISTERED;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime registeredAt;

    @Column
    private LocalDateTime joinedAt; // When they actually joined the session

    @Column
    private LocalDateTime leftAt; // If they left early

    @Column
    private Integer rating; // Their rating of the session (1-5)

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column
    @Builder.Default
    private Boolean attended = false;

    public enum ParticipantStatus {
        REGISTERED("Registered"),
        CONFIRMED("Confirmed"),
        ATTENDED("Attended"),
        NO_SHOW("No Show"),
        CANCELLED("Cancelled");

        private final String displayName;

        ParticipantStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    // Helper methods
    public void markAttended() {
        this.status = ParticipantStatus.ATTENDED;
        this.attended = true;
        this.joinedAt = LocalDateTime.now();
    }

    public void cancel() {
        this.status = ParticipantStatus.CANCELLED;
    }
}
