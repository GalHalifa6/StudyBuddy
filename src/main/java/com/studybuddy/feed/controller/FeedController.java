package com.studybuddy.feed.controller;

import com.studybuddy.feed.dto.MiniFeedDto;
import com.studybuddy.quiz.dto.QuizDto;
import com.studybuddy.quiz.model.QuizStatus;
import com.studybuddy.user.model.User;
import com.studybuddy.event.repository.EventRepository;
import com.studybuddy.event.model.Event;
import com.studybuddy.expert.repository.ExpertSessionRepository;
import com.studybuddy.expert.model.ExpertSession;
import com.studybuddy.topic.repository.UserTopicRepository;
import com.studybuddy.topic.model.UserTopic;
import com.studybuddy.course.model.Course;
import com.studybuddy.matching.service.MatchingService;
import com.studybuddy.quiz.service.QuizService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Feed Controller - The Aggregator.
 * 
 * Provides personalized feed with:
 * - Quiz reminders (always first)
 * - Upcoming relevant events
 * - Group match recommendations
 * - Upcoming sessions you've registered for
 * - Recommended new sessions (with topic intersection)
 * 
 * Pagination: 4 items at a time
 * Ordering: Quiz first, then randomized categories, with internal sorting
 */
@RestController
@RequestMapping("/api/feed")
@RequiredArgsConstructor
@Slf4j
public class FeedController {
    
    private final MatchingService matchingService;
    private final QuizService quizService;
    private final ExpertSessionRepository sessionRepository;
    private final EventRepository eventRepository;
    private final com.studybuddy.user.repository.UserRepository userRepository;
    private final UserTopicRepository userTopicRepository;
    private final com.studybuddy.expert.repository.SessionParticipantRepository participantRepository;
    
    /**
     * GET /api/feed/student
     * 
     * Returns unified feed with prioritized items (paginated, 4 at a time).
     * 
     * Priority 1: Quiz Status (if incomplete) - ALWAYS FIRST
     * Then randomized between:
     * - Upcoming relevant events (from user's groups)
     * - Group match recommendations (by % match, high to low)
     * - Registered upcoming sessions (by date, sooner first)
     * - Recommended new sessions with topic overlap (by % match, high to low)
     * 
     * @param offset Starting index for pagination (default: 0)
     */
    @GetMapping("/student")
    public ResponseEntity<MiniFeedDto.Response> getStudentFeed(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int offset) {
        try {
            log.info("=== FEED ENDPOINT CALLED (offset={}) ===", offset);
            User currentUser = userRepository.findByUsername(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            log.info("Fetching unified feed for user {} ({})", currentUser.getId(), currentUser.getUsername());
            
            List<MiniFeedDto.FeedItem> allFeedItems = new ArrayList<>();
            
            // Step 1: ALWAYS add quiz reminder first (if applicable) - but only on first page
            if (offset == 0) {
                MiniFeedDto.FeedItem quizItem = createQuizReminderItem(currentUser);
                if (quizItem != null) {
                    log.info("Adding quiz reminder to feed");
                    allFeedItems.add(quizItem);
                }
            }
            
            // Step 2: Collect all feed items from each category
            List<MiniFeedDto.FeedItem> events = getUpcomingRelevantEvents(currentUser);
            List<MiniFeedDto.FeedItem> groupMatches = getGroupMatchItems(currentUser);
            List<MiniFeedDto.FeedItem> registeredSessions = getRegisteredUpcomingSessions(currentUser);
            List<MiniFeedDto.FeedItem> recommendedSessions = getRecommendedNewSessions(currentUser);
            
            log.info("Feed categories - Events: {}, GroupMatches: {}, RegisteredSessions: {}, RecommendedSessions: {}", 
                    events.size(), groupMatches.size(), registeredSessions.size(), recommendedSessions.size());
            
            // Step 3: Interleave categories in randomized order
            List<MiniFeedDto.FeedItem> interleavedItems = interleaveCategories(
                    events, groupMatches, registeredSessions, recommendedSessions);
            
            allFeedItems.addAll(interleavedItems);
            
            // Step 4: Apply pagination (4 items per page)
            int pageSize = 4;
            int startIndex = offset;
            int endIndex = Math.min(startIndex + pageSize, allFeedItems.size());
            
            List<MiniFeedDto.FeedItem> paginatedItems = startIndex < allFeedItems.size() ?
                    allFeedItems.subList(startIndex, endIndex) : new ArrayList<>();
            
            log.info("Returning {} items (offset={}, total available={})", 
                    paginatedItems.size(), offset, allFeedItems.size());
            
            // Log what types are being returned
            if (!paginatedItems.isEmpty()) {
                String itemTypes = paginatedItems.stream()
                        .map(item -> String.format("%s(%s)", 
                                item.getItemType(), 
                                item.getItemType().equals("UPCOMING_EVENT") ? item.getEventTitle() :
                                item.getItemType().equals("GROUP_MATCH") ? item.getGroupName() :
                                item.getItemType().equals("QUIZ_REMINDER") ? "quiz" :
                                item.getSessionTitle()))
                        .collect(Collectors.joining(", "));
                log.info("Paginated items: [{}]", itemTypes);
            }
            
            MiniFeedDto.ProfileSummary userProfile = getUserProfileSummary(currentUser);
            
            MiniFeedDto.Response response = MiniFeedDto.Response.builder()
                    .feedItems(paginatedItems)
                    .userProfile(userProfile)
                    .build();
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("=== FEED ENDPOINT ERROR ===", e);
            throw e;
        }
    }
    
    // ==================== Helper Methods ====================
    
    /**
     * Priority 1: Create quiz reminder item if profile incomplete.
     * Returns null if quiz is completed (no reminder needed).
     */
    private MiniFeedDto.FeedItem createQuizReminderItem(User user) {
        try {
            QuizDto.ProfileResponse profile = quizService.getUserProfile(user);
            
            if (profile == null) {
                return MiniFeedDto.FeedItem.builder()
                        .itemType("QUIZ_REMINDER")
                        .priority(1)
                        .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))
                        .quizMessage("Complete the quiz for personalized group matches")
                        .build();
            }
            
            // No reminder only for completed quizzes
            if (profile.getQuizStatus() == QuizStatus.COMPLETED) {
                return null;
            }
            
            // Show reminder for NOT_STARTED, IN_PROGRESS, or SKIPPED
            String message;
            if (profile.getQuizStatus() == QuizStatus.NOT_STARTED) {
                message = "Complete the quiz for personalized group matches";
            } else if (profile.getQuizStatus() == QuizStatus.IN_PROGRESS) {
                Double reliability = profile.getReliabilityPercentage() != null ? profile.getReliabilityPercentage() : 0.0;
                int percentage = (int) Math.round(reliability * 100);
                message = String.format("Complete the remaining quiz questions for better matches (%d%% done)", percentage);
            } else if (profile.getQuizStatus() == QuizStatus.SKIPPED) {
                message = "You skipped the quiz. Complete it now for better group recommendations!";
            } else {
                message = "Complete the quiz for better group matching";
            }
            
            return MiniFeedDto.FeedItem.builder()
                    .itemType("QUIZ_REMINDER")
                    .priority(1)
                    .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))
                    .quizMessage(message)
                    .build();
        } catch (Exception e) {
            log.error("Error creating quiz reminder item", e);
            return null;
        }
    }
    
    /**
     * Get upcoming relevant events from user's study groups.
     * Sorted by date (sooner first).
     */
    private List<MiniFeedDto.FeedItem> getUpcomingRelevantEvents(User student) {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime twoWeeksFromNow = now.plusWeeks(2);
            
            log.info("Fetching upcoming events for user {} (now: {}, twoWeeks: {})", 
                    student.getId(), now, twoWeeksFromNow);
            
            List<Event> upcomingEvents = eventRepository.findUpcomingEventsByUserId(student.getId(), now);
            
            log.info("Found {} raw events from repository", upcomingEvents != null ? upcomingEvents.size() : 0);
            
            if (upcomingEvents == null || upcomingEvents.isEmpty()) {
                log.info("No events found for user {}", student.getId());
                return new ArrayList<>();
            }
            
            List<MiniFeedDto.FeedItem> eventItems = upcomingEvents.stream()
                    .filter(event -> {
                        if (event == null || event.getStartDateTime() == null) {
                            log.warn("Skipping null event or event with null start time");
                            return false;
                        }
                        boolean isWithinWindow = event.getStartDateTime().isBefore(twoWeeksFromNow);
                        if (!isWithinWindow) {
                            log.debug("Event {} '{}' is beyond 2-week window: {}", 
                                    event.getId(), event.getTitle(), event.getStartDateTime());
                        }
                        return isWithinWindow;
                    })
                    .sorted(Comparator.comparing(Event::getStartDateTime))
                    .limit(20)
                    .map(event -> MiniFeedDto.FeedItem.builder()
                            .itemType("UPCOMING_EVENT")
                            .priority(2)
                            .timestamp(event.getStartDateTime().format(DateTimeFormatter.ISO_DATE_TIME))
                            .eventId(event.getId())
                            .eventTitle(event.getTitle())
                            .eventType(event.getEventType() != null ? event.getEventType().name() : null)
                            .eventDescription(event.getDescription())
                            .eventLocation(event.getLocation())
                            .eventMeetingLink(event.getMeetingLink())
                            .eventStartTime(event.getStartDateTime().format(DateTimeFormatter.ISO_DATE_TIME))
                            .eventEndTime(event.getEndDateTime() != null ? 
                                        event.getEndDateTime().format(DateTimeFormatter.ISO_DATE_TIME) : null)
                            .groupId(event.getGroup() != null ? event.getGroup().getId() : null)
                            .groupName(event.getGroup() != null ? event.getGroup().getName() : null)
                            .build())
                    .collect(Collectors.toList());
            
            log.info("Returning {} event items after filtering", eventItems.size());
            return eventItems;
        } catch (Exception e) {
            log.error("Error fetching upcoming events for user {}", student.getId(), e);
            return new ArrayList<>();
        }
    }
    
    /**
     * Get high % match study groups.
     * Sorted by match quality (high to low).
     */
    private List<MiniFeedDto.FeedItem> getGroupMatchItems(User student) {
        try {
            List<MiniFeedDto.GroupRecommendation> matches = matchingService.getTopGroups(student);
            
            return matches.stream()
                    .filter(match -> match.getCurrentSize() < match.getMaxSize())
                    .sorted((m1, m2) -> Integer.compare(m2.getMatchPercentage(), m1.getMatchPercentage()))
                    .limit(20)
                    .map(match -> MiniFeedDto.FeedItem.builder()
                            .itemType("GROUP_MATCH")
                            .priority(3)
                            .timestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_DATE_TIME))
                            .groupId(match.getGroupId())
                            .groupName(match.getGroupName())
                            .courseName(match.getCourseName())
                            .matchPercentage(match.getMatchPercentage())
                            .matchReason(match.getMatchReason())
                            .currentSize(match.getCurrentSize())
                            .maxSize(match.getMaxSize())
                            .build())
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error fetching group matches", e);
            return new ArrayList<>();
        }
    }
    
    /**
     * Get upcoming sessions the user has registered for.
     * Sorted by date (sooner first).
     */
    private List<MiniFeedDto.FeedItem> getRegisteredUpcomingSessions(User student) {
        try {
            LocalDateTime now = LocalDateTime.now();
            
            // Get sessions user has registered for through SessionParticipant
            List<ExpertSession> registeredSessions = participantRepository.findByUserId(student.getId())
                    .stream()
                    .map(participant -> participant.getSession())
                    .filter(session -> session != null && 
                                     session.getScheduledStartTime() != null &&
                                     session.getScheduledStartTime().isAfter(now))
                    .collect(Collectors.toList());
            
            log.info("Found {} registered sessions for user {}", registeredSessions.size(), student.getId());
            
            return registeredSessions.stream()
                    .filter(session -> session.getStatus() == ExpertSession.SessionStatus.SCHEDULED &&
                                     !Boolean.TRUE.equals(session.getIsCancelled()))
                    .sorted(Comparator.comparing(ExpertSession::getScheduledStartTime))
                    .limit(20)
                    .map(session -> {
                        log.debug("Adding registered session to feed: {}", session.getTitle());
                        return MiniFeedDto.FeedItem.builder()
                                .itemType("REGISTERED_SESSION")
                                .priority(4)
                                .timestamp(session.getScheduledStartTime().format(DateTimeFormatter.ISO_DATE_TIME))
                                .sessionId(session.getId())
                                .sessionTitle(session.getTitle())
                                .expertName(session.getExpert() != null ? session.getExpert().getFullName() : "Expert")
                                .courseName(session.getCourse() != null ? session.getCourse().getName() : "General")
                                .scheduledAt(session.getScheduledStartTime().format(DateTimeFormatter.ISO_DATE_TIME))
                                .availableSpots(session.getMaxParticipants() - session.getCurrentParticipants())
                                .currentSize(session.getCurrentParticipants())
                                .isRegistered(true)
                                .build();
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error fetching registered sessions", e);
            return new ArrayList<>();
        }
    }
    
    /**
     * Get recommended new sessions with topic overlap.
     * Sorted by topic match percentage (high to low).
     */
    private List<MiniFeedDto.FeedItem> getRecommendedNewSessions(User student) {
        try {
            Set<Course> studentCourses = student.getCourses();
            Set<Long> enrolledCourseIds = new HashSet<>();
            
            if (studentCourses != null && !studentCourses.isEmpty()) {
                enrolledCourseIds = studentCourses.stream()
                        .map(Course::getId)
                        .collect(Collectors.toSet());
                log.info("User {} enrolled in {} courses: {}", student.getId(), enrolledCourseIds.size(), enrolledCourseIds);
            } else {
                log.info("User {} has no enrolled courses", student.getId());
            }
            
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime oneMonthFromNow = now.plusMonths(1);
            
            Set<String> userTopicNames = getUserTopicNames(student);
            log.info("User {} topics: {}", student.getId(), userTopicNames);
            
            List<ExpertSession> allSessions = sessionRepository.findAll();
            if (allSessions == null) {
                return new ArrayList<>();
            }
            
            log.info("Total sessions in DB: {}", allSessions.size());
            
            List<ExpertSession> upcomingSessions = allSessions.stream()
                    .filter(session -> session.getScheduledStartTime() != null &&
                                     session.getScheduledStartTime().isAfter(now) &&
                                     session.getScheduledStartTime().isBefore(oneMonthFromNow))
                    .collect(Collectors.toList());
            log.info("Upcoming sessions (within 1 month): {}", upcomingSessions.size());
            
            // Log each upcoming session with its course
            upcomingSessions.forEach(session -> {
                log.debug("Session: '{}' - Course ID: {} ({}), Status: {}, Spots: {}/{}", 
                    session.getTitle(),
                    session.getCourse() != null ? session.getCourse().getId() : "NULL",
                    session.getCourse() != null ? session.getCourse().getName() : "NULL",
                    session.getStatus(),
                    session.getCurrentParticipants(),
                    session.getMaxParticipants());
            });
            
            // Filter and score sessions: show if enrolled in course OR topics match
            Set<Long> finalEnrolledCourseIds = enrolledCourseIds;
            
            // Get sessions user is already registered for to exclude from recommendations
            Set<Long> registeredSessionIds = allSessions.stream()
                    .filter(session -> participantRepository.existsBySessionIdAndUserId(session.getId(), student.getId()))
                    .map(ExpertSession::getId)
                    .collect(Collectors.toSet());
            
            log.debug("User {} is registered for {} sessions: {}", student.getId(), registeredSessionIds.size(), registeredSessionIds);
            
            List<SessionWithScore> scoredSessions = allSessions.stream()
                    .filter(session -> session.getScheduledStartTime() != null &&
                                     session.getScheduledStartTime().isAfter(now) &&
                                     session.getScheduledStartTime().isBefore(oneMonthFromNow))
                    .filter(session -> session.getStatus() == ExpertSession.SessionStatus.SCHEDULED &&
                                     !Boolean.TRUE.equals(session.getIsCancelled()))
                    .filter(session -> session.getMaxParticipants() - session.getCurrentParticipants() > 0)
                    .filter(session -> session.getStudent() == null || 
                                     !session.getStudent().getId().equals(student.getId()))
                    .filter(session -> !registeredSessionIds.contains(session.getId())) // Exclude already registered sessions
                    .map(session -> {
                        // Check if enrolled in session's course
                        boolean enrolledInCourse = session.getCourse() != null && 
                                                  finalEnrolledCourseIds.contains(session.getCourse().getId());
                        
                        // Calculate topic match score
                        int topicScore = calculateTopicMatch(session, userTopicNames);
                        
                        // Session qualifies if enrolled in course OR topics match
                        // If enrolled in course, give at least 75% score
                        int finalScore = enrolledInCourse ? Math.max(topicScore, 75) : topicScore;
                        
                        log.debug("Session '{}' - Course: {}, Enrolled: {}, Topic match: {}%, Final score: {}%", 
                            session.getTitle(),
                            session.getCourse() != null ? session.getCourse().getName() : "NONE",
                            enrolledInCourse, 
                            topicScore, 
                            finalScore);
                        
                        return new SessionWithScore(session, finalScore);
                    })
                    .filter(sws -> {
                        if (sws.score == 0) {
                            log.debug("Session '{}' filtered: not enrolled in course and 0% topic match", sws.session.getTitle());
                        }
                        return sws.score > 0;
                    })
                    .sorted((sws1, sws2) -> Integer.compare(sws2.score, sws1.score))
                    .limit(20)
                    .collect(Collectors.toList());
            
            log.info("Found {} recommended sessions for user {}", scoredSessions.size(), student.getId());
            
            return scoredSessions.stream()
                    .map(sws -> {
                        ExpertSession session = sws.session;
                        return MiniFeedDto.FeedItem.builder()
                                .itemType("RECOMMENDED_SESSION")
                                .priority(5)
                                .timestamp(session.getScheduledStartTime().format(DateTimeFormatter.ISO_DATE_TIME))
                                .sessionId(session.getId())
                                .sessionTitle(session.getTitle())
                                .expertName(session.getExpert() != null ? session.getExpert().getFullName() : "Expert")
                                .courseName(session.getCourse() != null ? session.getCourse().getName() : "General")
                                .scheduledAt(session.getScheduledStartTime().format(DateTimeFormatter.ISO_DATE_TIME))
                                .availableSpots(session.getMaxParticipants() - session.getCurrentParticipants())
                                .isRegistered(false)
                                .topicMatchPercentage(sws.score)
                                .build();
                    })
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.error("Error fetching recommended sessions", e);
            return new ArrayList<>();
        }
    }
    
    /**
     * Helper class to hold session with its topic match score
     */
    private static class SessionWithScore {
        ExpertSession session;
        int score;
        
        SessionWithScore(ExpertSession session, int score) {
            this.session = session;
            this.score = score;
        }
    }
    
    /**
     * Get user's topic names from their groups and courses
     */
    private Set<String> getUserTopicNames(User user) {
        Set<String> topicNames = new HashSet<>();
        
        // Get actual topics from UserTopic table
        List<UserTopic> userTopics = userTopicRepository.findByUser(user);
        
        if (userTopics != null && !userTopics.isEmpty()) {
            userTopics.stream()
                    .filter(ut -> ut.getTopic() != null)
                    .map(ut -> {
                        com.studybuddy.topic.model.Topic topic = ut.getTopic();
                        return topic != null ? topic.getName() : null;
                    })
                    .filter(topicName -> topicName != null)
                    .forEach(topicName -> {
                        log.debug("Adding user topic: '{}'", topicName);
                        topicNames.add(topicName);
                    });
        }
        
        log.info("User {} has {} topics: {}", user.getId(), topicNames.size(), topicNames);
        return topicNames;
    }
    
    /**
     * Calculate topic match score between session and user topics
     */
    private int calculateTopicMatch(ExpertSession session, Set<String> userTopicNames) {
        log.debug("calculateTopicMatch - User topics: {}", userTopicNames);
        
        if (session.getSessionTopics() == null || session.getSessionTopics().isEmpty()) {
            log.debug("calculateTopicMatch - Session has no topics");
            if (session.getCourse() != null) {
                String courseName = session.getCourse().getName();
                if (courseName != null && userTopicNames.stream()
                        .anyMatch(topic -> topic.toLowerCase().contains(courseName.toLowerCase()) ||
                                         courseName.toLowerCase().contains(topic.toLowerCase()))) {
                    return 50;
                }
            }
            return 0;
        }
        
        Set<String> sessionTopicNames = session.getSessionTopics().stream()
                .filter(st -> st.getTopic() != null)
                .map(st -> st.getTopic().getName())
                .collect(Collectors.toSet());
        
        log.debug("calculateTopicMatch - Session topics: {}", sessionTopicNames);
        
        long matchCount = session.getSessionTopics().stream()
                .filter(st -> st.getTopic() != null)
                .map(st -> st.getTopic().getName().toLowerCase().trim())
                .filter(topicName -> {
                    boolean matches = userTopicNames.stream()
                            .anyMatch(userTopic -> {
                                String normalizedUserTopic = userTopic.toLowerCase().trim();
                                // Check for exact match or substring match
                                boolean match = normalizedUserTopic.equals(topicName) ||
                                               normalizedUserTopic.contains(topicName) || 
                                               topicName.contains(normalizedUserTopic);
                                log.debug("Comparing session topic '{}' with user topic '{}': {}", 
                                    topicName, normalizedUserTopic, match);
                                return match;
                            });
                    log.debug("Session topic '{}' overall match: {}", topicName, matches);
                    return matches;
                })
                .count();
        
        int totalTopics = session.getSessionTopics().size();
        int score = (int) ((matchCount * 100.0) / Math.max(totalTopics, 1));
        log.debug("calculateTopicMatch - Match count: {}, Total topics: {}, Score: {}%", 
            matchCount, totalTopics, score);
        return score;
    }
    
    /**
     * Interleave categories in randomized order while maintaining internal sorting.
     * Ensures at least one item from each category appears in the first page for diversity.
     */
    private List<MiniFeedDto.FeedItem> interleaveCategories(
            List<MiniFeedDto.FeedItem> events,
            List<MiniFeedDto.FeedItem> groupMatches,
            List<MiniFeedDto.FeedItem> registeredSessions,
            List<MiniFeedDto.FeedItem> recommendedSessions) {
        
        // Create a list of category wrappers for tracking
        List<CategoryWrapper> categories = new ArrayList<>();
        if (!events.isEmpty()) categories.add(new CategoryWrapper("Events", new ArrayList<>(events)));
        if (!groupMatches.isEmpty()) categories.add(new CategoryWrapper("GroupMatches", new ArrayList<>(groupMatches)));
        if (!registeredSessions.isEmpty()) categories.add(new CategoryWrapper("RegisteredSessions", new ArrayList<>(registeredSessions)));
        if (!recommendedSessions.isEmpty()) categories.add(new CategoryWrapper("RecommendedSessions", new ArrayList<>(recommendedSessions)));
        
        // Shuffle the order of categories
        Collections.shuffle(categories, new Random());
        
        List<MiniFeedDto.FeedItem> result = new ArrayList<>();
        
        // Phase 1: Ensure diversity - take first item from each category for the first page
        // (Quiz reminder already added separately, so we have 3 slots left for first page diversity)
        int diversitySlots = Math.min(3, categories.size()); // Room for 3 more items after quiz
        for (int i = 0; i < diversitySlots && i < categories.size(); i++) {
            CategoryWrapper category = categories.get(i);
            if (!category.items.isEmpty()) {
                result.add(category.items.remove(0));
                log.debug("Added diversity item from {}", category.name);
            }
        }
        
        // Phase 2: Round-robin through remaining items
        int maxSize = categories.stream()
                .mapToInt(cat -> cat.items.size())
                .max()
                .orElse(0);
        
        for (int i = 0; i < maxSize; i++) {
            for (CategoryWrapper category : categories) {
                if (i < category.items.size()) {
                    result.add(category.items.get(i));
                }
            }
        }
        
        log.info("Interleaved {} total items with diversity-first approach", result.size());
        return result;
    }
    
    /**
     * Helper wrapper class for category tracking
     */
    private static class CategoryWrapper {
        String name;
        List<MiniFeedDto.FeedItem> items;
        
        CategoryWrapper(String name, List<MiniFeedDto.FeedItem> items) {
            this.name = name;
            this.items = items;
        }
    }
    
    /**
     * Get user profile summary.
     */
    private MiniFeedDto.ProfileSummary getUserProfileSummary(User user) {
        QuizDto.ProfileResponse profile = quizService.getUserProfile(user);
        
        if (profile == null) {
            return MiniFeedDto.ProfileSummary.builder()
                    .hasProfile(false)
                    .message("Complete the quiz to get personalized recommendations")
                    .build();
        }
        
        return MiniFeedDto.ProfileSummary.builder()
                .hasProfile(true)
                .message("Profile active - receiving personalized matches")
                .build();
    }
}
