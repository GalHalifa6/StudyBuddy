package com.studybuddy.expert.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * SessionRequest Entity - Represents a student's request to book a 1:1 session with an expert
 * Expert can approve, reject, or counter-propose with alternative times
 */
@Entity
@Table(name = "session_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class SessionRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "student_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private com.studybuddy.user.model.User student;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "expert_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private com.studybuddy.user.model.User expert;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "course_id")
    @JsonIgnoreProperties({"enrolledStudents", "groups"})
    private com.studybuddy.course.model.Course course;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String agenda;

    // Store preferred time slots as JSON string: [{"start": "2024-01-15T10:00:00", "end": "2024-01-15T11:00:00"}, ...]
    @Column(columnDefinition = "TEXT")
    private String preferredTimeSlots; // JSON array of {start, end} objects

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String expertResponseMessage;

    @Column(columnDefinition = "TEXT")
    private String rejectionReason;

    // Chosen time when approved
    @Column
    private LocalDateTime chosenStart;

    @Column
    private LocalDateTime chosenEnd;

    // Link to created session (if approved)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    @JsonIgnoreProperties({"expert", "student", "studyGroup", "course"})
    private com.studybuddy.expert.model.ExpertSession createdSession;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    public enum RequestStatus {
        PENDING("Pending"),
        APPROVED("Approved"),
        REJECTED("Rejected"),
        COUNTER_PROPOSED("Counter Proposed"),
        CANCELLED("Cancelled");

        private final String displayName;

        RequestStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }
}

