package com.studybuddy.topic.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Topic Entity - Represents topics/hashtags that users and experts can associate with
 */
@Entity
@Table(name = "topics", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"name", "category"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Topic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name; // e.g., "Calculus", "Python", "Guitar"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TopicCategory category; // EDUCATION, CASUAL, HOBBY

    @Column(length = 500)
    private String description; // Optional description for clarity

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true; // For soft deletion/deactivation

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
