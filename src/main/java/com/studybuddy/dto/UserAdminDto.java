package com.studybuddy.dto;

import com.studybuddy.model.Role;
import com.studybuddy.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for Admin user management - prevents circular reference issues
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserAdminDto {
    private Long id;
    private String username;
    private String email;
    private String fullName;
    private Role role;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int coursesCount;
    private int groupsCount;

    public static UserAdminDto fromUser(User user) {
        UserAdminDto dto = new UserAdminDto();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setRole(user.getRole());
        dto.setIsActive(user.getIsActive());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setUpdatedAt(user.getUpdatedAt());
        dto.setCoursesCount(user.getCourses() != null ? user.getCourses().size() : 0);
        dto.setGroupsCount(user.getGroups() != null ? user.getGroups().size() : 0);
        return dto;
    }
}
