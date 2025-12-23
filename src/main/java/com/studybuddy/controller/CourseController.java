package com.studybuddy.controller;

import com.studybuddy.model.Course;
import com.studybuddy.model.ExpertProfile;
import com.studybuddy.model.ExpertQuestion;
import com.studybuddy.model.ExpertSession;
import com.studybuddy.model.Role;
import com.studybuddy.model.StudyGroup;
import com.studybuddy.model.User;
import com.studybuddy.repository.CourseRepository;
import com.studybuddy.repository.ExpertProfileRepository;
import com.studybuddy.repository.ExpertQuestionRepository;
import com.studybuddy.repository.ExpertSessionRepository;
import com.studybuddy.repository.StudyGroupRepository;
import com.studybuddy.repository.UserRepository;
import com.studybuddy.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    @Autowired
    private ExpertSessionRepository expertSessionRepository;

    @Autowired
    private ExpertProfileRepository expertProfileRepository;

    @Autowired
    private ExpertQuestionRepository expertQuestionRepository;

    @Autowired
    private NotificationService notificationService;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || "anonymousUser".equalsIgnoreCase(auth.getName())) {
            throw new RuntimeException("User not authenticated");
        }
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllCourses() {
        // Only show non-archived courses to regular users
        List<Course> courses = courseRepository.findByIsArchivedFalse();
        
        User currentUser = null;
        try {
            currentUser = getCurrentUser();
        } catch (RuntimeException ignored) {
            // Access allowed without authentication; we'll omit enrollment flags when unavailable
        }
        
        final Set<Long> enrolledCourseIds = currentUser != null
                ? currentUser.getCourses().stream().map(Course::getId).collect(Collectors.toSet())
                : Collections.<Long>emptySet();
        
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
            courseMap.put("enrolled", enrolledCourseIds.contains(course.getId()));
            return courseMap;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getCourseById(@PathVariable Long id) {
        User currentUser;
        try {
            currentUser = getCurrentUser();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "message", "Please log in to access course details"
            ));
        }

        return courseRepository.findById(id)
                .map(course -> {
                    boolean isAdminOrExpert = currentUser.getRole() == Role.ADMIN || currentUser.getRole() == Role.EXPERT;
                    boolean isEnrolled = currentUser.getCourses().stream()
                            .anyMatch(enrolled -> enrolled.getId().equals(course.getId()));

                    if (!isAdminOrExpert && !isEnrolled) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                                "message", "Enroll in this course to view its details"
                        ));
                    }

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
                    courseMap.put("enrolled", isEnrolled || isAdminOrExpert);
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
        
        User currentUser = null;
        try {
            currentUser = getCurrentUser();
        } catch (RuntimeException ignored) {
            // Anonymous access allowed
        }
        
        final Set<Long> enrolledCourseIds = currentUser != null
                ? currentUser.getCourses().stream().map(Course::getId).collect(Collectors.toSet())
                : Collections.<Long>emptySet();
        
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
            courseMap.put("enrolled", enrolledCourseIds.contains(course.getId()));
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

            notificationService.createNotification(
                    user,
                    "COURSE_ENROLLMENT",
                    "Welcome to " + course.getCode(),
                    "You're now enrolled in " + course.getName() + ". Explore study groups, Q&A, and upcoming sessions to get started.",
                    "/courses/" + course.getId()
            );

            return ResponseEntity.ok(Map.of("message", "Successfully enrolled in course"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Unenroll current user from a course
     */
    @DeleteMapping("/{id}/enroll")
    public ResponseEntity<?> unenrollFromCourse(@PathVariable Long id) {
        try {
            User user = getCurrentUser();
            Course course = courseRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Course not found"));

            if (!user.getCourses().contains(course)) {
                return ResponseEntity.badRequest().body(Map.of("message", "You are not enrolled in this course"));
            }

            user.getCourses().remove(course);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "You have been unenrolled from the course"));
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
            courseMap.put("enrolled", true);
            return courseMap;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/extras")
    public ResponseEntity<?> getCourseExtras(@PathVariable Long id) {
        User user = getCurrentUser();
        Course course = courseRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Course not found"));

        boolean isEnrolled = user.getCourses().stream()
                .anyMatch(enrolled -> enrolled.getId().equals(course.getId()));

        if (!isEnrolled) {
            return ResponseEntity.status(403).body(Map.of(
                    "message", "Enroll in this course to unlock personalized resources"
            ));
        }

        LocalDateTime now = LocalDateTime.now();

        List<StudyGroup> allGroups = studyGroupRepository.findByCourseIdAndIsActiveTrue(id);
        List<Map<String, Object>> groupHighlights = allGroups.stream()
                .sorted(Comparator.comparingInt((StudyGroup group) -> group.getMembers() != null ? group.getMembers().size() : 0).reversed())
                .limit(3)
                .map(group -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", group.getId());
                    map.put("name", group.getName());
                    map.put("topic", group.getTopic());
                    map.put("memberCount", group.getMembers() != null ? group.getMembers().size() : 0);
                    map.put("visibility", group.getVisibility());
                    boolean isMember = group.getMembers() != null && group.getMembers().stream()
                            .anyMatch(member -> member.getId().equals(user.getId()));
                    map.put("isMember", isMember);
                    return map;
                })
                .collect(Collectors.toList());

        List<ExpertSession> upcomingSessions = expertSessionRepository
                .findByCourseIdAndScheduledEndTimeAfterOrderByScheduledStartTimeAsc(id, now);

        List<Map<String, Object>> sessionHighlights = upcomingSessions.stream()
                .limit(3)
                .map(session -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", session.getId());
                    map.put("title", session.getTitle());
                    map.put("sessionType", session.getSessionType().name());
                    map.put("status", session.getStatus().name());
                    map.put("scheduledStartTime", session.getScheduledStartTime());
                    map.put("scheduledEndTime", session.getScheduledEndTime());
                    map.put("currentParticipants", session.getCurrentParticipants());
                    map.put("maxParticipants", session.getMaxParticipants());
                    if (session.getExpert() != null) {
                        Map<String, Object> expertInfo = new LinkedHashMap<>();
                        expertInfo.put("id", session.getExpert().getId());
                        expertInfo.put("fullName", session.getExpert().getFullName());
                        expertInfo.put("title", session.getExpert().getRole().name());
                        map.put("expert", expertInfo);
                    }
                    return map;
                })
                .collect(Collectors.toList());

        List<ExpertProfile> experts = expertProfileRepository.findByCourseId(id);
        List<Map<String, Object>> expertHighlights = experts.stream()
            .sorted(Comparator.comparingDouble(ExpertProfile::getAverageRating).reversed())
                .limit(3)
                .map(profile -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("userId", profile.getUser().getId());
                    map.put("fullName", profile.getUser().getFullName());
                    map.put("title", profile.getTitle());
                    map.put("institution", profile.getInstitution());
                    map.put("averageRating", profile.getAverageRating());
                    map.put("totalQuestionsAnswered", profile.getTotalQuestionsAnswered());
                    map.put("specializations", profile.getSpecializations());
                    return map;
                })
                .collect(Collectors.toList());

        long questionCount = expertQuestionRepository.countByCourseIdAndIsPublicTrue(id);
        List<ExpertQuestion> topQuestions = expertQuestionRepository
            .findTop3ByCourseIdAndIsPublicTrueOrderByCreatedAtDesc(id);

        List<Map<String, Object>> questionHighlights = topQuestions.stream()
                .map(question -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", question.getId());
                    map.put("title", question.getTitle());
                    map.put("status", question.getStatus().getDisplayName());
                    map.put("createdAt", question.getCreatedAt());
                    map.put("answered", question.getAnswer() != null);
                    if (question.getAnsweredBy() != null) {
                        Map<String, Object> expertInfo = new LinkedHashMap<>();
                        expertInfo.put("id", question.getAnsweredBy().getId());
                        expertInfo.put("fullName", question.getAnsweredBy().getFullName());
                        map.put("answeredBy", expertInfo);
                    }
                    return map;
                })
                .collect(Collectors.toList());

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("groupCount", allGroups.size());
        stats.put("upcomingSessionCount", upcomingSessions.size());
        stats.put("expertCount", experts.size());
        stats.put("questionCount", questionCount);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("stats", stats);
        response.put("recommendedGroups", groupHighlights);
        response.put("upcomingSessions", sessionHighlights);
        response.put("featuredExperts", expertHighlights);
        response.put("questionHighlights", questionHighlights);

        return ResponseEntity.ok(response);
    }
}
