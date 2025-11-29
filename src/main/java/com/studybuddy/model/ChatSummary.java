package com.studybuddy.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.List;

/**
 * ChatSummary Entity - Represents an auto-generated summary of group chat sessions
 */
@Entity
@Table(name = "chat_summaries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class ChatSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long groupId;

    @NotBlank
    @Column(columnDefinition = "TEXT", nullable = false)
    private String summary;

    @ElementCollection
    @CollectionTable(name = "summary_action_items", joinColumns = @JoinColumn(name = "summary_id"))
    @Column(name = "action_item")
    private List<String> actionItems;

    @Column(nullable = false)
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
