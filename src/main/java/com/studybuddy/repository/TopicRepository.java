package com.studybuddy.repository;

import com.studybuddy.model.Topic;
import com.studybuddy.model.TopicCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TopicRepository extends JpaRepository<Topic, Long> {
    
    /**
     * Find all active topics
     */
    List<Topic> findByIsActiveTrue();
    
    /**
     * Find active topics by category
     */
    List<Topic> findByCategoryAndIsActiveTrue(TopicCategory category);
    
    /**
     * Find topic by name (case-insensitive)
     */
    Optional<Topic> findByNameIgnoreCase(String name);
    
    /**
     * Find topic by name and category
     */
    Optional<Topic> findByNameIgnoreCaseAndCategory(String name, TopicCategory category);
}
