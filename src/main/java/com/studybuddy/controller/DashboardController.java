package com.studybuddy.controller;

import com.studybuddy.model.User;
import com.studybuddy.repository.UserRepository;
import com.studybuddy.repository.StudyGroupRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudyGroupRepository studyGroupRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> getOverview() {
        User user = getCurrentUser();
        
        // Get user's groups
        int myGroupsCount = user.getGroups() != null ? user.getGroups().size() : 0;
        
        // Get user's enrolled courses
        int enrolledCoursesCount = user.getCourses() != null ? user.getCourses().size() : 0;
        
        // Build metrics
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("myGroups", myGroupsCount);
        metrics.put("enrolledCourses", enrolledCoursesCount);
        metrics.put("focusMinutesThisWeek", 0); // Placeholder
        metrics.put("studyPalsCount", 0); // Placeholder
        
        // Build course highlights (user's enrolled courses)
        List<Map<String, Object>> courseHighlights = user.getCourses() != null ? user.getCourses().stream()
                .map(course -> {
                    Map<String, Object> highlight = new HashMap<>();
                    highlight.put("id", course.getId());
                    highlight.put("code", course.getCode());
                    highlight.put("name", course.getName());
                    highlight.put("faculty", course.getFaculty());
                    // Get group count for this course
                    int groupCount = studyGroupRepository.findByCourseIdAndIsActiveTrue(course.getId()).size();
                    highlight.put("groupCount", groupCount);
                    return highlight;
                })
                .collect(Collectors.toList()) : List.of();
        
        // Build response
        Map<String, Object> overview = new HashMap<>();
        overview.put("metrics", metrics);
        overview.put("courseHighlights", courseHighlights);
        overview.put("nextSession", null); // Placeholder
        overview.put("unreadMessages", Map.of(
            "total", 0,
            "groups", List.of()
        ));
        
        return ResponseEntity.ok(overview);
    }
}

