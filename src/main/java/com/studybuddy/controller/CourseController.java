package com.studybuddy.controller;

import com.studybuddy.model.Course;
import com.studybuddy.model.User;
import com.studybuddy.repository.CourseRepository;
import com.studybuddy.repository.StudyGroupRepository;
import com.studybuddy.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private StudyGroupRepository studyGroupRepository;

    @Autowired
    private UserRepository userRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllCourses() {
        // Only show non-archived courses to regular users
        List<Course> courses = courseRepository.findByIsArchivedFalse();
        
        // Add group count to each course
        List<Map<String, Object>> result = courses.stream().map(course -> {
            Map<String, Object> courseMap = new HashMap<>();
            courseMap.put("id", course.getId());
            courseMap.put("code", course.getCode());
            courseMap.put("name", course.getName());
            courseMap.put("description", course.getDescription());
            courseMap.put("faculty", course.getFaculty());
            courseMap.put("semester", course.getSemester());
            courseMap.put("createdAt", course.getCreatedAt());
            // Get actual group count from repository
            int groupCount = studyGroupRepository.findByCourseIdAndIsActiveTrue(course.getId()).size();
            courseMap.put("groupCount", groupCount);
            return courseMap;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCourseById(@PathVariable Long id) {
        return courseRepository.findById(id)
                .map(course -> {
                    Map<String, Object> courseMap = new HashMap<>();
                    courseMap.put("id", course.getId());
                    courseMap.put("code", course.getCode());
                    courseMap.put("name", course.getName());
                    courseMap.put("description", course.getDescription());
                    courseMap.put("faculty", course.getFaculty());
                    courseMap.put("semester", course.getSemester());
                    courseMap.put("createdAt", course.getCreatedAt());
                    int groupCount = studyGroupRepository.findByCourseIdAndIsActiveTrue(course.getId()).size();
                    courseMap.put("groupCount", groupCount);
                    return ResponseEntity.ok(courseMap);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Course> createCourse(@Valid @RequestBody Course course) {
        Course savedCourse = courseRepository.save(course);
        return ResponseEntity.ok(savedCourse);
    }

    @GetMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> searchCourses(@RequestParam String query) {
        // Only search non-archived courses
        List<Course> allCourses = courseRepository.findByNameContainingIgnoreCase(query);
        List<Course> courses = allCourses.stream()
                .filter(course -> course.getIsArchived() == null || !course.getIsArchived())
                .collect(Collectors.toList());
        
        List<Map<String, Object>> result = courses.stream().map(course -> {
            Map<String, Object> courseMap = new HashMap<>();
            courseMap.put("id", course.getId());
            courseMap.put("code", course.getCode());
            courseMap.put("name", course.getName());
            courseMap.put("description", course.getDescription());
            courseMap.put("faculty", course.getFaculty());
            courseMap.put("semester", course.getSemester());
            courseMap.put("createdAt", course.getCreatedAt());
            int groupCount = studyGroupRepository.findByCourseIdAndIsActiveTrue(course.getId()).size();
            courseMap.put("groupCount", groupCount);
            return courseMap;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /**
     * Enroll current user in a course
     */
    @PostMapping("/{id}/enroll")
    public ResponseEntity<?> enrollInCourse(@PathVariable Long id) {
        try {
            User user = getCurrentUser();
            Course course = courseRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Course not found"));

            // Check if already enrolled
            if (user.getCourses().contains(course)) {
                return ResponseEntity.badRequest().body(Map.of("message", "Already enrolled in this course"));
            }

            // Enroll user
            user.getCourses().add(course);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Successfully enrolled in course"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Get my enrolled courses
     */
    @GetMapping("/my-courses")
    public ResponseEntity<List<Map<String, Object>>> getMyCourses() {
        User user = getCurrentUser();
        
        List<Map<String, Object>> result = user.getCourses().stream().map(course -> {
            Map<String, Object> courseMap = new HashMap<>();
            courseMap.put("id", course.getId());
            courseMap.put("code", course.getCode());
            courseMap.put("name", course.getName());
            courseMap.put("description", course.getDescription());
            courseMap.put("faculty", course.getFaculty());
            courseMap.put("semester", course.getSemester());
            courseMap.put("createdAt", course.getCreatedAt());
            int groupCount = studyGroupRepository.findByCourseIdAndIsActiveTrue(course.getId()).size();
            courseMap.put("groupCount", groupCount);
            return courseMap;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }
}
