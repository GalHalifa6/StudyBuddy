package com.studybuddy.matching.controller;

import com.studybuddy.matching.dto.GroupMatchDto;
import com.studybuddy.user.model.User;
import com.studybuddy.user.repository.UserRepository;
import com.studybuddy.matching.service.MatchingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Matching Controller - Provides group recommendations with match percentages.
 * 
 * Uses the same variance reduction algorithm from MatchingService
 * to calculate match scores for all available groups.
 */
@RestController
@RequestMapping("/api/matching")
@RequiredArgsConstructor
@Slf4j
public class MatchingController {
    
    private final MatchingService matchingService;
    private final UserRepository userRepository;
    
    /**
     * GET /api/matching/groups
     * 
     * Returns all available groups with match percentages for the authenticated user.
     * Groups are filtered by:
     * - User's enrolled courses
     * - Available capacity
     * - Not already a member
     * - Not private groups
     * 
     * Match percentage is calculated using variance reduction algorithm.
     */
    @GetMapping("/groups")
    public ResponseEntity<List<GroupMatchDto>> getMatchedGroups(
            Authentication authentication,
            @RequestParam(required = false) Long courseId,
            @RequestParam(required = false) String visibility,
            @RequestParam(required = false) String availability
    ) {
        try {
            User currentUser = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            log.info("Fetching matched groups for user {} with filters - course: {}, visibility: {}, availability: {}", 
                    currentUser.getId(), courseId, visibility, availability);
            
            List<GroupMatchDto> matches = matchingService.getAllMatchedGroups(
                    currentUser, courseId, visibility, availability
            );
            
            log.info("Returning {} matched groups", matches.size());
            return ResponseEntity.ok(matches);
            
        } catch (Exception e) {
            log.error("Error fetching matched groups: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * GET /api/matching/groups/{groupId}/score
     * 
     * Get detailed match score for a specific group.
     */
    @GetMapping("/groups/{groupId}/score")
    public ResponseEntity<GroupMatchDto> getGroupMatchScore(
            @PathVariable Long groupId,
            Authentication authentication
    ) {
        try {
            User currentUser = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            
            log.info("Fetching match score for group {} and user {}", groupId, currentUser.getId());
            
            GroupMatchDto match = matchingService.getGroupMatchScore(currentUser, groupId);
            
            if (match == null) {
                return ResponseEntity.notFound().build();
            }
            
            return ResponseEntity.ok(match);
            
        } catch (Exception e) {
            log.error("Error fetching group match score: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
