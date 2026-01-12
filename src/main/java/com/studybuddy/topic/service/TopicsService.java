package com.studybuddy.topic.service;

import com.studybuddy.topic.dto.TopicDto;
import com.studybuddy.topic.model.Topic;
import com.studybuddy.topic.model.TopicCategory;
import com.studybuddy.user.model.User;
import com.studybuddy.topic.model.UserTopic;
import com.studybuddy.topic.repository.TopicRepository;
import com.studybuddy.topic.repository.UserTopicRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing topics and user-topic associations
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TopicsService {

    private final TopicRepository topicRepository;
    private final UserTopicRepository userTopicRepository;

    /**
     * Get all active topics
     */
    public List<TopicDto.TopicResponse> getAllActiveTopics() {
        log.info("Fetching all active topics");
        return topicRepository.findByIsActiveTrue().stream()
                .map(this::mapToTopicResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get all active topics grouped by category
     */
    public TopicDto.TopicsByCategoryResponse getTopicsByCategory() {
        log.info("Fetching topics grouped by category");
        
        List<Topic> allTopics = topicRepository.findByIsActiveTrue();
        
        List<TopicDto.TopicResponse> education = allTopics.stream()
                .filter(t -> t.getCategory() == TopicCategory.EDUCATION)
                .map(this::mapToTopicResponse)
                .collect(Collectors.toList());
        
        List<TopicDto.TopicResponse> casual = allTopics.stream()
                .filter(t -> t.getCategory() == TopicCategory.CASUAL)
                .map(this::mapToTopicResponse)
                .collect(Collectors.toList());
        
        List<TopicDto.TopicResponse> hobby = allTopics.stream()
                .filter(t -> t.getCategory() == TopicCategory.HOBBY)
                .map(this::mapToTopicResponse)
                .collect(Collectors.toList());
        
        return TopicDto.TopicsByCategoryResponse.builder()
                .education(education)
                .casual(casual)
                .hobby(hobby)
                .build();
    }

    /**
     * Get topics for a specific user
     */
    public TopicDto.UserTopicsResponse getUserTopics(User user) {
        log.info("Fetching topics for user {}", user.getId());
        
        List<UserTopic> userTopics = userTopicRepository.findByUser(user);
        List<TopicDto.TopicResponse> topics = userTopics.stream()
                .map(ut -> mapToTopicResponse(ut.getTopic()))
                .collect(Collectors.toList());
        
        LocalDateTime lastUpdated = userTopics.stream()
                .map(UserTopic::getAddedAt)
                .max(LocalDateTime::compareTo)
                .orElse(null);
        
        return TopicDto.UserTopicsResponse.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .topics(topics)
                .lastUpdated(lastUpdated)
                .build();
    }

    /**
     * Update user's topics (replaces all existing topics)
     */
    @Transactional
    public TopicDto.UserTopicsResponse updateUserTopics(User user, TopicDto.UpdateUserTopicsRequest request) {
        log.info("Updating topics for user {}", user.getId());
        
        // Delete all existing user topics
        userTopicRepository.deleteByUser(user);
        
        // Add new topics
        List<UserTopic> newUserTopics = new ArrayList<>();
        for (Long topicId : request.getTopicIds()) {
            Topic topic = topicRepository.findById(topicId)
                    .orElseThrow(() -> new RuntimeException("Topic not found: " + topicId));
            
            if (!topic.getIsActive()) {
                throw new RuntimeException("Topic is not active: " + topic.getName());
            }
            
            UserTopic userTopic = UserTopic.builder()
                    .user(user)
                    .topic(topic)
                    .build();
            
            newUserTopics.add(userTopicRepository.save(userTopic));
        }
        
        log.info("Updated {} topics for user {}", newUserTopics.size(), user.getId());
        
        return getUserTopics(user);
    }

    /**
     * Add a single topic to user's interests
     */
    @Transactional
    public TopicDto.UserTopicsResponse addTopicToUser(User user, Long topicId) {
        log.info("Adding topic {} to user {}", topicId, user.getId());
        
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new RuntimeException("Topic not found: " + topicId));
        
        if (!topic.getIsActive()) {
            throw new RuntimeException("Topic is not active: " + topic.getName());
        }
        
        // Check if user already has this topic
        if (userTopicRepository.findByUserAndTopic(user, topic).isPresent()) {
            log.info("User {} already has topic {}", user.getId(), topicId);
            return getUserTopics(user);
        }
        
        UserTopic userTopic = UserTopic.builder()
                .user(user)
                .topic(topic)
                .build();
        
        userTopicRepository.save(userTopic);
        
        return getUserTopics(user);
    }

    /**
     * Remove a topic from user's interests
     */
    @Transactional
    public TopicDto.UserTopicsResponse removeTopicFromUser(User user, Long topicId) {
        log.info("Removing topic {} from user {}", topicId, user.getId());
        
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new RuntimeException("Topic not found: " + topicId));
        
        userTopicRepository.deleteByUserAndTopic(user, topic);
        
        return getUserTopics(user);
    }

    /**
     * Create a new topic (admin only)
     */
    @Transactional
    public TopicDto.TopicOperationResponse createTopic(TopicDto.CreateTopicRequest request) {
        log.info("Creating new topic: {}", request.getName());
        
        // Check if topic already exists with same name and category
        if (topicRepository.findByNameIgnoreCaseAndCategory(request.getName(), request.getCategory()).isPresent()) {
            throw new RuntimeException("Topic already exists: " + request.getName() + " in category " + request.getCategory());
        }
        
        Topic topic = Topic.builder()
                .name(request.getName())
                .category(request.getCategory())
                .description(request.getDescription())
                .isActive(true)
                .build();
        
        Topic savedTopic = topicRepository.save(topic);
        
        return TopicDto.TopicOperationResponse.builder()
                .message("Topic created successfully")
                .topic(mapToTopicResponse(savedTopic))
                .build();
    }

    /**
     * Deactivate a topic (admin only)
     */
    @Transactional
    public TopicDto.TopicOperationResponse deactivateTopic(Long topicId) {
        log.info("Deactivating topic {}", topicId);
        
        Topic topic = topicRepository.findById(topicId)
                .orElseThrow(() -> new RuntimeException("Topic not found: " + topicId));
        
        topic.setIsActive(false);
        Topic savedTopic = topicRepository.save(topic);
        
        return TopicDto.TopicOperationResponse.builder()
                .message("Topic deactivated successfully")
                .topic(mapToTopicResponse(savedTopic))
                .build();
    }

    /**
     * Map Topic entity to TopicResponse DTO
     */
    private TopicDto.TopicResponse mapToTopicResponse(Topic topic) {
        return TopicDto.TopicResponse.builder()
                .id(topic.getId())
                .name(topic.getName())
                .category(topic.getCategory())
                .description(topic.getDescription())
                .isActive(topic.getIsActive())
                .build();
    }
}
