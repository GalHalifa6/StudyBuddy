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

/**
 * FileUpload Entity - Represents an uploaded file in a study group
 */
@Entity
@Table(name = "file_uploads")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@EntityListeners(AuditingEntityListener.class)
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class FileUpload {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String filename;

    @NotBlank
    @Column(nullable = false)
    private String originalFilename;

    @NotBlank
    @Column(nullable = false)
    private String filePath;

    private String fileType;

    private Long fileSize;

    // Extracted text for Q&A
    @Column(columnDefinition = "TEXT")
    private String extractedText;

    // Content embedding for semantic search
    @Column(columnDefinition = "TEXT")
    private String contentEmbedding;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime uploadedAt;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploader_id", nullable = false)
    @JsonIgnoreProperties({"groups", "createdGroups", "password", "hibernateLazyInitializer", "handler"})
    private User uploader;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    @JsonIgnoreProperties({"members", "creator", "messages", "files", "hibernateLazyInitializer", "handler"})
    private StudyGroup group;
}
