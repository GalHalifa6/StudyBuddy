package com.studybuddy.model;

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
 * ExpertQuestion Entity - Represents questions asked by students to experts
 * Supports async Q&A functionality
 */
@Entity
@Table(name = "expert_questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class ExpertQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "student_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private User student;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "expert_id")
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private User expert; // Can be null initially if question is open to all experts

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "course_id")
    @JsonIgnoreProperties({"enrolledStudents", "groups"})
    private Course course;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "group_id")
    @JsonIgnoreProperties({"members", "messages", "files", "roomShares"})
    private StudyGroup studyGroup;

    @Column(nullable = false, length = 300)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content; // The actual question

    @Column(columnDefinition = "TEXT")
    private String codeSnippet; // If the question includes code

    @Column(length = 50)
    private String programmingLanguage; // Language of the code snippet

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuestionStatus status = QuestionStatus.OPEN;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuestionPriority priority = QuestionPriority.NORMAL;

    @ElementCollection
    @CollectionTable(name = "question_tags", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "tag")
    private List<String> tags = new ArrayList<>();

    // Answer
    @Column(columnDefinition = "TEXT")
    private String answer;

    @Column
    private LocalDateTime answeredAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "answered_by_id")
    @JsonIgnoreProperties({"groups", "createdGroups", "courses", "messages", "files", "password", "profileEmbedding"})
    private User answeredBy;

    // Visibility
    @Column(nullable = false)
    private Boolean isPublic = true; // If false, only visible to student and expert

    @Column(nullable = false)
    private Boolean isAnonymous = false; // Hide student identity

    // Follow-up support
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_question_id")
    @JsonIgnoreProperties({"followUpQuestions"})
    private ExpertQuestion parentQuestion; // For follow-up questions

    @OneToMany(mappedBy = "parentQuestion", cascade = CascadeType.ALL)
    @JsonIgnoreProperties({"parentQuestion"})
    private List<ExpertQuestion> followUpQuestions = new ArrayList<>();

    // Engagement metrics
    @Column(nullable = false)
    private Integer viewCount = 0;

    @Column(nullable = false)
    private Integer upvotes = 0;

    @Column(nullable = false)
    private Integer downvotes = 0;

    // Helpfulness
    @Column
    private Boolean isAnswerAccepted = false;

    @Column
    private Boolean isAnswerHelpful;

    @Column(columnDefinition = "TEXT")
    private String studentFeedback;

    // Attachments
    @ElementCollection
    @CollectionTable(name = "question_attachments", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "attachment_url")
    private List<String> attachments = new ArrayList<>();

    // Resolution
    @Column
    private LocalDateTime resolvedAt;

    @Column(columnDefinition = "TEXT")
    private String resolutionNotes;

    // Deadlines
    @Column
    private LocalDateTime dueDate; // If student needs answer by certain time

    @Column(nullable = false)
    private Boolean isUrgent = false;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;

    // Enums
    public enum QuestionStatus {
        OPEN("Open"),
        ASSIGNED("Assigned to Expert"),
        IN_PROGRESS("Being Answered"),
        ANSWERED("Answered"),
        CLOSED("Closed"),
        RESOLVED("Resolved");

        private final String displayName;

        QuestionStatus(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    public enum QuestionPriority {
        LOW("Low"),
        NORMAL("Normal"),
        HIGH("High"),
        URGENT("Urgent");

        private final String displayName;

        QuestionPriority(String displayName) {
            this.displayName = displayName;
        }

        public String getDisplayName() {
            return displayName;
        }
    }

    // Helper methods
    public void incrementViews() {
        this.viewCount++;
    }

    public void upvote() {
        this.upvotes++;
    }

    public void downvote() {
        this.downvotes++;
    }

    public void assignToExpert(User expert) {
        this.expert = expert;
        this.status = QuestionStatus.ASSIGNED;
    }

    public void answerQuestion(String answer, User answeredBy) {
        this.answer = answer;
        this.answeredBy = answeredBy;
        this.answeredAt = LocalDateTime.now();
        this.status = QuestionStatus.ANSWERED;
    }

    public void acceptAnswer() {
        this.isAnswerAccepted = true;
        this.status = QuestionStatus.RESOLVED;
        this.resolvedAt = LocalDateTime.now();
    }

    public void markAsHelpful(boolean helpful, String feedback) {
        this.isAnswerHelpful = helpful;
        this.studentFeedback = feedback;
    }

    public int getNetVotes() {
        return upvotes - downvotes;
    }
}
