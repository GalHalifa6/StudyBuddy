package com.studybuddy.topic.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.studybuddy.user.model.User;
import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * UserTopic Entity - Many-to-many relationship between Users and Topics
 */
@Entity
@Table(name = "user_topics_mapping",
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "topic_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class UserTopic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"password", "profileEmbedding", "groups", "createdGroups", "courses", "messages", "files"})
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "topic_id", nullable = false)
    private Topic topic;

    @CreatedDate
    @Column(name = "added_at", nullable = false, updatable = false)
    private LocalDateTime addedAt;
}
