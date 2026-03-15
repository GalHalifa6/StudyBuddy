package com.studybuddy.admin.dto;

import com.studybuddy.admin.model.AdminAuditLog;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for Admin Audit Log response
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogDto {
    private Long id;
    private Long adminUserId;
    private String actionType;
    private String targetType;
    private Long targetId;
    private String reason;
    private String metadata;
    private LocalDateTime createdAt;

    public static AuditLogDto fromAuditLog(AdminAuditLog log) {
        AuditLogDto dto = new AuditLogDto();
        dto.setId(log.getId());
        dto.setAdminUserId(log.getAdminUserId());
        dto.setActionType(log.getActionType());
        dto.setTargetType(log.getTargetType());
        dto.setTargetId(log.getTargetId());
        dto.setReason(log.getReason());
        dto.setMetadata(log.getMetadata());
        dto.setCreatedAt(log.getCreatedAt());
        return dto;
    }
}

