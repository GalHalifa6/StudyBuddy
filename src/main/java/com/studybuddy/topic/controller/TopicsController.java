package com.studybuddy.topic.controller;

import com.studybuddy.topic.dto.TopicDto;
import com.studybuddy.user.model.User;
import com.studybuddy.user.repository.UserRepository;
import com.studybuddy.topic.service.TopicsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Topics Controller - Manages topics/hashtags and user-topic associations
 * 
 * User Endpoints:
 * - GET /api/topics - Get all active topics (grouped by category)
 * - GET /api/topics/list - Get all active topics (flat list)
 * - GET /api/topics/my - Get current user's topics
 * - PUT /api/topics/my - Update current user's topics
 * - POST /api/topics/my/{topicId} - Add a topic to current user
 * - DELETE /api/topics/my/{topicId} - Remove a topic from current user
 * 
 * Admin Endpoints:
 * - POST /api/topics - Create a new topic
 * - DELETE /api/topics/{topicId} - Deactivate a topic
 */
@RestController
@RequestMapping("/api/topics")
@RequiredArgsConstructor
@Slf4j
public class TopicsController {

    private final TopicsService topicsService;
    private final UserRepository userRepository;

    /**
     * GET /api/topics
     * 
     * Get all active topics grouped by category.
     * Available to all authenticated users.
     */
    @GetMapping
    public ResponseEntity<TopicDto.TopicsByCategoryResponse> getTopicsByCategory() {
        log.info("Fetching topics grouped by category");
        TopicDto.TopicsByCategoryResponse response = topicsService.getTopicsByCategory();
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/topics/list
     * 
     * Get all active topics as a flat list.
     * Available to all authenticated users.
     */
    @GetMapping("/list")
    public ResponseEntity<List<TopicDto.TopicResponse>> getAllTopics() {
        log.info("Fetching all active topics");
        List<TopicDto.TopicResponse> response = topicsService.getAllActiveTopics();
        return ResponseEntity.ok(response);
    }

    /**
     * GET /api/topics/my
     * 
     * Get topics for the current authenticated user.
     */
    @GetMapping("/my")
    public ResponseEntity<TopicDto.UserTopicsResponse> getMyTopics(Authentication authentication) {
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        log.info("Fetching topics for user {}", currentUser.getId());
        TopicDto.UserTopicsResponse response = topicsService.getUserTopics(currentUser);
        return ResponseEntity.ok(response);
    }

    /**
     * PUT /api/topics/my
     * 
     * Update topics for the current authenticated user.
     * Replaces all existing topics with the provided list.
     */
    @PutMapping("/my")
    public ResponseEntity<TopicDto.UserTopicsResponse> updateMyTopics(
            @Valid @RequestBody TopicDto.UpdateUserTopicsRequest request,
            Authentication authentication) {
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        log.info("Updating topics for user {}", currentUser.getId());
        TopicDto.UserTopicsResponse response = topicsService.updateUserTopics(currentUser, request);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/topics/my/{topicId}
     * 
     * Add a single topic to current user's interests.
     */
    @PostMapping("/my/{topicId}")
    public ResponseEntity<TopicDto.UserTopicsResponse> addTopicToMyInterests(
            @PathVariable Long topicId,
            Authentication authentication) {
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        log.info("Adding topic {} to user {}", topicId, currentUser.getId());
        TopicDto.UserTopicsResponse response = topicsService.addTopicToUser(currentUser, topicId);
        return ResponseEntity.ok(response);
    }

    /**
     * DELETE /api/topics/my/{topicId}
     * 
     * Remove a topic from current user's interests.
     */
    @DeleteMapping("/my/{topicId}")
    public ResponseEntity<TopicDto.UserTopicsResponse> removeTopicFromMyInterests(
            @PathVariable Long topicId,
            Authentication authentication) {
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        log.info("Removing topic {} from user {}", topicId, currentUser.getId());
        TopicDto.UserTopicsResponse response = topicsService.removeTopicFromUser(currentUser, topicId);
        return ResponseEntity.ok(response);
    }

    // ========== ADMIN ENDPOINTS ==========

    /**
     * POST /api/topics
     * 
     * Create a new topic (Admin only).
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TopicDto.TopicOperationResponse> createTopic(
            @Valid @RequestBody TopicDto.CreateTopicRequest request,
            Authentication authentication) {
        log.info("Admin {} creating new topic: {}", authentication.getName(), request.getName());
        TopicDto.TopicOperationResponse response = topicsService.createTopic(request);
        return ResponseEntity.ok(response);
    }

    /**
     * DELETE /api/topics/{topicId}
     * 
     * Deactivate a topic (Admin only).
     */
    @DeleteMapping("/{topicId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TopicDto.TopicOperationResponse> deactivateTopic(
            @PathVariable Long topicId,
            Authentication authentication) {
        log.info("Admin {} deactivating topic {}", authentication.getName(), topicId);
        TopicDto.TopicOperationResponse response = topicsService.deactivateTopic(topicId);
        return ResponseEntity.ok(response);
    }
}
