package com.studybuddy.event.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Event Entity - Represents a calendar event for a study group
 */
@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@EntityListeners(AuditingEntityListener.class)
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @NotNull
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private EventType eventType;

    @NotNull
    @Column(nullable = false)
    private LocalDateTime startDateTime;

    @Column
    private LocalDateTime endDateTime;

    @Column
    private String location;

    @Column
    private String meetingLink;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "creator_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "password", "hibernateLazyInitializer", "handler"})
    private com.studybuddy.user.model.User creator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    @JsonIgnoreProperties({"members", "creator", "messages", "files", "events", "hibernateLazyInitializer", "handler"})
    private com.studybuddy.group.model.StudyGroup group;

    /**
     * Event type enumeration
     */
    public enum EventType {
        STUDY_SESSION,
        MEETING,
        EXAM,
        ASSIGNMENT_DUE,
        PROJECT_DEADLINE,
        PRESENTATION,
        REVIEW_SESSION,
        OTHER
    }
}
