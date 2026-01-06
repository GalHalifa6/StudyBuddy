package com.studybuddy.admin.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Admin Audit Log Entity
 * Tracks all admin actions for accountability and safety
 */
@Entity
@Table(name = "admin_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class AdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long adminUserId;

    @Column(nullable = false, length = 50)
    private String actionType; // SUSPEND, BAN, DELETE, ROLE_CHANGE, etc.

    @Column(nullable = false, length = 50)
    private String targetType; // USER, COURSE, GROUP

    @Column(nullable = false)
    private Long targetId;

    @Column(columnDefinition = "TEXT")
    private String reason;

    @Column(columnDefinition = "TEXT")
    private String metadata; // JSON string for additional context

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}




