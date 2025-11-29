package com.studybuddy.controller;

import com.studybuddy.model.Course;
import com.studybuddy.repository.CourseRepository;
import com.studybuddy.repository.StudyGroupRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> getAllCourses() {
        List<Course> courses = courseRepository.findAll();
        
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
        List<Course> courses = courseRepository.findByNameContainingIgnoreCase(query);
        
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
}
