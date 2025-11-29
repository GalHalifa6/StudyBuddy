package com.studybuddy.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * ExpertReview Entity - Reviews and ratings for experts from students
 */
@Entity
@Table(name = "expert_reviews")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ExpertReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "expert_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private User expert;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "student_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private User student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id")
    @JsonIgnoreProperties({"expert", "student", "studyGroup"})
    private ExpertSession session; // Optional - review can be from a session

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    @JsonIgnoreProperties({"student", "expert", "followUpQuestions"})
    private ExpertQuestion question; // Optional - review can be from Q&A

    @Column(nullable = false)
    private Integer rating; // 1-5 stars

    // Detailed ratings
    @Column
    private Integer knowledgeRating; // 1-5: How knowledgeable was the expert?

    @Column
    private Integer communicationRating; // 1-5: How well did they communicate?

    @Column
    private Integer responsivenessRating; // 1-5: How responsive were they?

    @Column
    private Integer helpfulnessRating; // 1-5: How helpful was the interaction?

    @Column(columnDefinition = "TEXT")
    private String review; // Written review

    @Column(columnDefinition = "TEXT")
    private String highlights; // What was particularly good

    @Column(columnDefinition = "TEXT")
    private String improvements; // Suggestions for improvement

    // Visibility
    @Column(nullable = false)
    private Boolean isAnonymous = false;

    @Column(nullable = false)
    private Boolean isPublic = true;

    // Moderation
    @Column(nullable = false)
    private Boolean isApproved = true; // For moderation purposes

    @Column(nullable = false)
    private Boolean isFlagged = false;

    @Column(columnDefinition = "TEXT")
    private String flagReason;

    // Helpfulness of the review itself
    @Column(nullable = false)
    private Integer helpfulCount = 0;

    @Column(nullable = false)
    private Integer reportCount = 0;

    // Expert response
    @Column(columnDefinition = "TEXT")
    private String expertResponse;

    @Column
    private LocalDateTime expertRespondedAt;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Helper methods
    public void markAsHelpful() {
        this.helpfulCount++;
    }

    public void flag(String reason) {
        this.isFlagged = true;
        this.flagReason = reason;
        this.reportCount++;
    }

    public void respondAsExpert(String response) {
        this.expertResponse = response;
        this.expertRespondedAt = LocalDateTime.now();
    }

    public double getAverageDetailedRating() {
        int count = 0;
        int sum = 0;
        
        if (knowledgeRating != null) { sum += knowledgeRating; count++; }
        if (communicationRating != null) { sum += communicationRating; count++; }
        if (responsivenessRating != null) { sum += responsivenessRating; count++; }
        if (helpfulnessRating != null) { sum += helpfulnessRating; count++; }
        
        return count > 0 ? (double) sum / count : rating;
    }
}
