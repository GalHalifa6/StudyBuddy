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
 * ExpertSession Entity - Represents scheduled sessions between experts and students
 * Can be one-on-one or group consultation sessions
 */
@Entity
@Table(name = "expert_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ExpertSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "expert_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private com.studybuddy.user.model.User expert;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "student_id")
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private com.studybuddy.user.model.User student; // For one-on-one sessions

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "group_id")
    @JsonIgnoreProperties({"members", "messages", "files", "roomShares"})
    private com.studybuddy.group.model.StudyGroup studyGroup; // For group consultations

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "course_id")
    @JsonIgnoreProperties({"enrolledStudents", "groups"})
    private com.studybuddy.course.model.Course course;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String agenda; // Topics to be covered

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SessionType sessionType = SessionType.ONE_ON_ONE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SessionStatus status = SessionStatus.SCHEDULED;

    @Column(nullable = false)
    private LocalDateTime scheduledStartTime;

    @Column(nullable = false)
    private LocalDateTime scheduledEndTime;

    @Column
    private LocalDateTime actualStartTime;

    @Column
    private LocalDateTime actualEndTime;

    @Column(nullable = false)
    @Builder.Default
    private Integer maxParticipants = 1; // 1 for one-on-one, more for group

    @Column(nullable = false)
    @Builder.Default
    private Integer currentParticipants = 0;

    // Meeting link (for video calls)
    @Column(length = 500)
    private String meetingLink;

    @Column(length = 50)
    private String meetingPlatform; // zoom, meet, teams, in-app

    // Session Notes
    @Column(columnDefinition = "TEXT")
    private String expertNotes; // Notes from the expert

    @Column(columnDefinition = "TEXT")
    private String sessionSummary; // Summary after session ends

    // Resources shared
    @ElementCollection
    @CollectionTable(name = "session_resources", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "resource_url")
    private List<String> sharedResources = new ArrayList<>();

    // Ratings
    @Column
    private Integer studentRating; // 1-5 rating from student

    @Column(columnDefinition = "TEXT")
    private String studentFeedback;

    @Column
    private Integer expertRating; // 1-5 rating from expert

    @Column(columnDefinition = "TEXT")
    private String expertFeedback;

    // Cancellation
    @Column
    @Builder.Default
    private Boolean isCancelled = false;

    @Column(columnDefinition = "TEXT")
    private String cancellationReason;

    @Column
    private LocalDateTime cancelledAt;

    @Column(length = 50)
    private String cancelledBy; // 'expert' or 'student' username

    // Recurring sessions
    @Column(nullable = false)
    @Builder.Default
    private Boolean isRecurring = false;

    @Column(length = 20)
    private String recurrencePattern; // weekly, biweekly, monthly

    @Column
    private Long parentSessionId; // Reference to first session in recurring series

    // Session Topics - many-to-many relationship
    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @Builder.Default
    private List<com.studybuddy.expert.model.SessionTopic> sessionTopics = new ArrayList<>();

    // Reminder sent
    @Column(nullable = false)
    @Builder.Default
    private Boolean reminderSent = false;

    @Column
    private LocalDateTime reminderSentAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // Enums
    public enum SessionType {
        ONE_ON_ONE("One-on-One Consultation"),
        GROUP("Group Consultation"),
        OFFICE_HOURS("Office Hours"),
        WORKSHOP("Workshop"),
        Q_AND_A("Q&A Session");

        private final String displayName;

        SessionType(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    public enum SessionStatus {
        SCHEDULED("Scheduled"),
        IN_PROGRESS("In Progress"),
        COMPLETED("Completed"),
        CANCELLED("Cancelled"),
        NO_SHOW("No Show"),
        RESCHEDULED("Rescheduled");

        private final String displayName;

        SessionStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    // Helper methods
    public boolean isUpcoming() {
        return status == SessionStatus.SCHEDULED && scheduledStartTime.isAfter(LocalDateTime.now());
    }

    public boolean canJoin() {
        // Can join/register if session is scheduled and not full
        return (status == SessionStatus.SCHEDULED || status == SessionStatus.IN_PROGRESS) && 
               currentParticipants < maxParticipants &&
               !Boolean.TRUE.equals(isCancelled);
    }
    
    public boolean canEnterRoom() {
        // Can enter the live room if session is in progress or about to start (5 min window)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime joinWindow = scheduledStartTime.minusMinutes(5);
        return (status == SessionStatus.IN_PROGRESS || 
               (status == SessionStatus.SCHEDULED && now.isAfter(joinWindow))) && 
               now.isBefore(scheduledEndTime.plusMinutes(30));
    }

    public void start() {
        this.status = SessionStatus.IN_PROGRESS;
        this.actualStartTime = LocalDateTime.now();
    }

    public void complete() {
        this.status = SessionStatus.COMPLETED;
        this.actualEndTime = LocalDateTime.now();
    }

    public void cancel(String reason, String cancelledByUsername) {
        this.status = SessionStatus.CANCELLED;
        this.isCancelled = true;
        this.cancellationReason = reason;
        this.cancelledAt = LocalDateTime.now();
        this.cancelledBy = cancelledByUsername;
    }
}
