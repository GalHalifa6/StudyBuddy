package com.studybuddy.controller;

import com.studybuddy.dto.AuthDto;
import com.studybuddy.model.Role;
import com.studybuddy.model.User;
import com.studybuddy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin Controller
 * Handles admin-only operations
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userRepository.findAll();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> updateUserRole(@PathVariable Long id, @RequestBody RoleUpdateRequest request) {
        return userRepository.findById(id)
                .map(user -> {
                    try {
                        Role newRole = Role.valueOf(request.getRole().toUpperCase());
                        user.setRole(newRole);
                        userRepository.save(user);
                        return ResponseEntity.ok(new AuthDto.MessageResponse(
                                "User role updated to " + newRole.getDisplayName(), true));
                    } catch (IllegalArgumentException e) {
                        return ResponseEntity.badRequest()
                                .body(new AuthDto.MessageResponse("Invalid role", false));
                    }
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/users/{id}/status")
    public ResponseEntity<?> updateUserStatus(@PathVariable Long id, @RequestBody StatusUpdateRequest request) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setIsActive(request.isActive());
                    userRepository.save(user);
                    return ResponseEntity.ok(new AuthDto.MessageResponse(
                            "User status updated to " + (request.isActive() ? "active" : "inactive"), true));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.ok(new AuthDto.MessageResponse("User deleted successfully", true));
    }

    // Request DTOs
    public static class RoleUpdateRequest {
        private String role;
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }

    public static class StatusUpdateRequest {
        private boolean active;
        public boolean isActive() { return active; }
        public void setActive(boolean active) { this.active = active; }
    }
}
