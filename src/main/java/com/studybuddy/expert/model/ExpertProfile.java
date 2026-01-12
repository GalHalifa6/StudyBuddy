package com.studybuddy.expert.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * ExpertProfile Entity - Extended profile information for Expert users
 * Contains credentials, specializations, ratings, and availability for consultations
 */
@Entity
@Table(name = "expert_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ExpertProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private com.studybuddy.user.model.User user;

    // Professional Information
    @Column(length = 100)
    private String title; // e.g., "Professor", "Teaching Assistant", "Industry Expert"

    @Column(length = 200)
    private String institution; // e.g., "MIT", "Google", "Freelance"

    @Column(columnDefinition = "TEXT")
    private String bio; // Detailed biography

    @Column(columnDefinition = "TEXT")
    private String qualifications; // Degrees, certifications

    @Builder.Default
    @Column(nullable = false)
    private Integer yearsOfExperience = 0;

    // Specializations and Expertise
    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "expert_specializations", joinColumns = @JoinColumn(name = "expert_id"))
    @Column(name = "specialization")
    private List<String> specializations = new ArrayList<>();

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "expert_skills", joinColumns = @JoinColumn(name = "expert_id"))
    @Column(name = "skill")
    private List<String> skills = new ArrayList<>();

    // Verification Status
    @Builder.Default
    @Column(nullable = false)
    private Boolean isVerified = false;

    @Column
    private LocalDateTime verifiedAt;

    @Column(length = 100)
    private String verifiedBy; // Admin username who verified

    // Ratings and Reviews
    @Builder.Default
    @Column(nullable = false)
    private Double averageRating = 0.0;

    @Builder.Default
    @Column(nullable = false)
    private Integer totalRatings = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer totalSessions = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer totalQuestionsAnswered = 0;

    // Availability for Office Hours / Sessions
    @Column(columnDefinition = "TEXT")
    private String weeklyAvailability; // JSON: {"monday": ["09:00-11:00", "14:00-16:00"], ...}

    @Builder.Default
    @Column(nullable = false)
    private Integer maxSessionsPerWeek = 10;

    @Builder.Default
    @Column(nullable = false)
    private Integer sessionDurationMinutes = 30; // Default session duration

    @Builder.Default
    @Column(nullable = false)
    private Boolean acceptingNewStudents = true;

    // Consultation Preferences
    @Builder.Default
    @Column(nullable = false)
    private Boolean offersGroupConsultations = true;

    @Builder.Default
    @Column(nullable = false)
    private Boolean offersOneOnOne = true;

    @Builder.Default
    @Column(nullable = false)
    private Boolean offersAsyncQA = true; // Asynchronous Q&A support

    // Response Times
    @Builder.Default
    @Column(nullable = false)
    private Integer typicalResponseHours = 24; // Typical response time in hours

    // Pricing (if applicable in future)
    @Builder.Default
    @Column(nullable = false)
    private Boolean isFree = true;

    @Column
    private Double hourlyRate;

    // Social/Contact Links (optional)
    @Column(length = 255)
    private String linkedInUrl;

    @Column(length = 255)
    private String personalWebsite;

    // Status
    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isAvailableNow = false; // Real-time availability status

    // Statistics
    @Builder.Default
    @Column(nullable = false)
    private Integer helpfulAnswers = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer studentsHelped = 0;

    // Courses they can help with
    @Builder.Default
    @ManyToMany
    @JoinTable(
            name = "expert_courses",
            joinColumns = @JoinColumn(name = "expert_id"),
            inverseJoinColumns = @JoinColumn(name = "course_id")
    )
    @JsonIgnoreProperties({"enrolledStudents", "groups", "experts"})
    private Set<com.studybuddy.course.model.Course> expertiseCourses = new HashSet<>();

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // Helper methods
    public void addRating(int rating) {
        double totalScore = this.averageRating * this.totalRatings;
        this.totalRatings++;
        this.averageRating = (totalScore + rating) / this.totalRatings;
    }

    public void incrementQuestionsAnswered() {
        this.totalQuestionsAnswered++;
    }

    public void incrementSessions() {
        this.totalSessions++;
    }

    public void incrementStudentsHelped() {
        this.studentsHelped++;
    }

    public void incrementHelpfulAnswers() {
        this.helpfulAnswers++;
    }
}
