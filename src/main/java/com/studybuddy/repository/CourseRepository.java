package com.studybuddy.repository;

import com.studybuddy.model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository for Course entity
 */
@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    
    Optional<Course> findByCode(String code);
    
    List<Course> findByNameContainingIgnoreCase(String name);
    
    List<Course> findByCodeContainingIgnoreCase(String code);
    
    Boolean existsByCode(String code);
}
