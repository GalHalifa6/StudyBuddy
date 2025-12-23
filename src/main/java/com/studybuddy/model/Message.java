package com.studybuddy.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

/**
 * Message Entity - Represents a chat message in a study group
 */
@Entity
@Table(name = "messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@EntityListeners(AuditingEntityListener.class)
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @NotBlank
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(length = 20, nullable = false)
    private String messageType = "text"; // text, file, system, event

    @Column(nullable = false)
    private Boolean isPinned = false;

    // Reference to attached file (if messageType is "file")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "file_id")
    @JsonIgnoreProperties({"group", "uploader", "extractedText", "contentEmbedding", "filePath", "hibernateLazyInitializer", "handler"})
    private FileUpload attachedFile;

    // Reference to event (if messageType is "event")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    @JsonIgnoreProperties({"group", "creator", "hibernateLazyInitializer", "handler"})
    private Event event;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "password", "hibernateLazyInitializer", "handler"})
    private User sender;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    @JsonIgnoreProperties({"members", "creator", "messages", "files", "hibernateLazyInitializer", "handler"})
    private StudyGroup group;

    @OneToMany(mappedBy = "message", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties({"message"})
    private Set<MessageReceipt> receipts = new HashSet<>();
}
