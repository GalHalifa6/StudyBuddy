#!/bin/bash

# Script to generate remaining StudyBuddy backend files

BASE_DIR="/home/claude/studybuddy-backend/src/main/java/com/studybuddy"

# Create remaining controllers
echo "Creating controllers..."

# Course Controller
cat > "$BASE_DIR/controller/CourseController.java" <<'EOF'
package com.studybuddy.controller;

import com.studybuddy.model.Course;
import com.studybuddy.repository.CourseRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    @Autowired
    private CourseRepository courseRepository;

    @GetMapping
    public ResponseEntity<List<Course>> getAllCourses() {
        return ResponseEntity.ok(courseRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Course> getCourseById(@PathVariable Long id) {
        return courseRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Course> createCourse(@Valid @RequestBody Course course) {
        Course savedCourse = courseRepository.save(course);
        return ResponseEntity.ok(savedCourse);
    }

    @GetMapping("/search")
    public ResponseEntity<List<Course>> searchCourses(@RequestParam String query) {
        List<Course> courses = courseRepository.findByNameContainingIgnoreCase(query);
        return ResponseEntity.ok(courses);
    }
}
EOF

# Group Controller
cat > "$BASE_DIR/controller/GroupController.java" <<'EOF'
package com.studybuddy.controller;

import com.studybuddy.model.StudyGroup;
import com.studybuddy.model.User;
import com.studybuddy.repository.CourseRepository;
import com.studybuddy.repository.StudyGroupRepository;
import com.studybuddy.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    @Autowired
    private StudyGroupRepository groupRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @PostMapping
    public ResponseEntity<?> createGroup(@Valid @RequestBody StudyGroup group) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User creator = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        group.setCreator(creator);
        group.getMembers().add(creator);
        
        StudyGroup savedGroup = groupRepository.save(group);
        return ResponseEntity.ok(savedGroup);
    }

    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<StudyGroup>> getGroupsByCourse(@PathVariable Long courseId) {
        List<StudyGroup> groups = groupRepository.findByCourseIdAndIsActiveTrue(courseId);
        return ResponseEntity.ok(groups);
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudyGroup> getGroupById(@PathVariable Long id) {
        return groupRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<?> joinGroup(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        StudyGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        if (group.getMembers().size() >= group.getMaxSize()) {
            return ResponseEntity.badRequest().body("Group is full");
        }

        group.getMembers().add(user);
        groupRepository.save(group);

        return ResponseEntity.ok("Joined group successfully");
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<?> leaveGroup(@PathVariable Long id) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        StudyGroup group = groupRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        group.getMembers().remove(user);
        groupRepository.save(group);

        return ResponseEntity.ok("Left group successfully");
    }

    @GetMapping("/my-groups")
    public ResponseEntity<List<StudyGroup>> getMyGroups() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<StudyGroup> groups = groupRepository.findGroupsByMemberId(user.getId());
        return ResponseEntity.ok(groups);
    }
}
EOF

echo "Controllers created successfully!"
echo "Build complete! Now zipping..."
