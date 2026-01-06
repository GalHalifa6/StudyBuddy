package com.studybuddy.user.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import com.studybuddy.course.model.Course;
import com.studybuddy.group.model.StudyGroup;
import com.studybuddy.messaging.model.Message;
import com.studybuddy.file.model.FileUpload;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * User Entity - Represents a student in the system
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @NotBlank
    @Column(unique = true, nullable = false)
    private String username;

    @NotBlank
    @Email
    @Column(unique = true, nullable = false)
    private String email;

    // Password is nullable for Google OAuth users
    @Column(nullable = true)
    @JsonIgnore
    private String password;

    // Google OAuth identifier (sub claim from Google)
    @Column(unique = true, nullable = true)
    private String googleSub;

    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private Role role = Role.USER;

    // Profile preferences stored as JSON-like strings
    @ElementCollection
    @CollectionTable(name = "user_topics", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "topic")
    private List<String> topicsOfInterest;

    @Column(length = 20)
    private String proficiencyLevel = "intermediate"; // beginner, intermediate, advanced

    @ElementCollection
    @CollectionTable(name = "user_languages", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "language")
    private List<String> preferredLanguages;

    @Column(length = 20)
    private String collaborationStyle = "balanced"; // quiet_focus, discussion_heavy, balanced

    // Availability stored as JSON string in real implementation
    @Column(columnDefinition = "TEXT")
    private String availability; // Store as JSON string: {"monday": ["10:00-12:00"], ...}

    // Profile embedding for NLP matching (stored as comma-separated values)
    @Column(columnDefinition = "TEXT")
    private String profileEmbedding;

    @ElementCollection
    @CollectionTable(name = "user_questionnaire_responses", joinColumns = @JoinColumn(name = "user_id"))
    @MapKeyColumn(name = "question_key")
    @Column(name = "answer", columnDefinition = "TEXT")
    private Map<String, String> questionnaireResponses = new HashMap<>();

    @Column(nullable = false)
    private Boolean onboardingCompleted = false;

    private LocalDateTime onboardingCompletedAt;

    @Column(nullable = false)
    private Boolean isActive = true;

    // Admin management fields
    private LocalDateTime lastLoginAt;
    
    @Column(nullable = false)
    private Boolean isDeleted = false;
    
    private LocalDateTime deletedAt;
    
    private LocalDateTime suspendedUntil;
    
    @Column(columnDefinition = "TEXT")
    private String suspensionReason;
    
    private LocalDateTime bannedAt;
    
    @Column(columnDefinition = "TEXT")
    private String banReason;
    
    @Column(nullable = false)
    private Boolean isEmailVerified = false;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
    
    // Helper methods for account status
    public boolean isSuspended() {
        // Use !isBefore to make the check inclusive: suspended until exactly now is still suspended
        return suspendedUntil != null && !suspendedUntil.isBefore(LocalDateTime.now());
    }
    
    public boolean isBanned() {
        return bannedAt != null;
    }
    
    public boolean canLogin() {
        // Use Boolean.TRUE.equals() to safely handle null values
        // Default to false if null (safer for existing records)
        boolean active = Boolean.TRUE.equals(isActive);
        boolean notDeleted = !Boolean.TRUE.equals(isDeleted);
        return active && notDeleted && !isBanned() && !isSuspended();
    }

    // Relationships
    @ManyToMany
    @JoinTable(
            name = "course_enrollments",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    @JsonIgnoreProperties({"enrolledStudents", "groups"})
    private Set<Course> courses = new HashSet<>();

    @ManyToMany
    @JoinTable(
            name = "group_members",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "group_id")
    )
    @JsonIgnoreProperties({"members", "creator", "messages", "files", "roomShares"})
    private Set<StudyGroup> groups = new HashSet<>();

    @OneToMany(mappedBy = "creator", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<StudyGroup> createdGroups = new HashSet<>();

    @OneToMany(mappedBy = "sender", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<Message> messages = new HashSet<>();

    @OneToMany(mappedBy = "uploader", cascade = CascadeType.ALL)
    @JsonIgnore
    private Set<FileUpload> files = new HashSet<>();
}
