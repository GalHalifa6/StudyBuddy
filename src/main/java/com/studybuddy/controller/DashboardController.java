package com.studybuddy.controller;

import com.studybuddy.model.Course;
import com.studybuddy.model.ExpertProfile;
import com.studybuddy.model.ExpertQuestion;
import com.studybuddy.model.ExpertSession;
import com.studybuddy.model.Message;
import com.studybuddy.model.SessionParticipant;
import com.studybuddy.model.StudyGroup;
import com.studybuddy.model.User;
import com.studybuddy.repository.CourseRepository;
import com.studybuddy.repository.ExpertProfileRepository;
import com.studybuddy.repository.ExpertQuestionRepository;
import com.studybuddy.repository.ExpertSessionRepository;
import com.studybuddy.repository.MessageReceiptRepository;
import com.studybuddy.repository.MessageRepository;
import com.studybuddy.repository.SessionParticipantRepository;
import com.studybuddy.repository.StudyGroupRepository;
import com.studybuddy.repository.UserRepository;
import com.studybuddy.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudyGroupRepository studyGroupRepository;

    @Autowired
    private ExpertSessionRepository expertSessionRepository;

    @Autowired
    private ExpertProfileRepository expertProfileRepository;

    @Autowired
    private ExpertQuestionRepository expertQuestionRepository;

    @Autowired
    private MessageReceiptRepository messageReceiptRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private SessionParticipantRepository sessionParticipantRepository;

    @GetMapping("/overview")
    public ResponseEntity<?> getOverview() {
        User user = getCurrentUser();
        LocalDateTime now = LocalDateTime.now();

        List<StudyGroup> myGroups = studyGroupRepository.findGroupsByMemberId(user.getId());
        List<Course> courses = user.getCourses().stream()
                .map(course -> courseRepository.findById(course.getId()).orElse(course))
                .sorted(Comparator.comparing(Course::getName, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());

        Set<Long> trackedSessionIds = new HashSet<>();
        Set<Long> peersEngagedIds = new HashSet<>();
        LocalDateTime weekStart = now.minusDays(7);
        long focusMinutesThisWeek = 0L;

        for (StudyGroup group : myGroups) {
            if (group.getMembers() != null) {
                group.getMembers().stream()
                        .filter(Objects::nonNull)
                        .filter(member -> member.getId() != null && !member.getId().equals(user.getId()))
                        .forEach(member -> peersEngagedIds.add(member.getId()));
            }
            if (group.getCreator() != null && group.getCreator().getId() != null
                    && !group.getCreator().getId().equals(user.getId())) {
                peersEngagedIds.add(group.getCreator().getId());
            }
        }

        List<SessionParticipant> myParticipations = sessionParticipantRepository.findByUserId(user.getId());
        Set<Long> processedParticipationSessions = new HashSet<>();
        ExpertSession nextSession = null;

        List<ExpertSession> directSessions = expertSessionRepository
                .findByStudentIdAndScheduledStartTimeAfterOrderByScheduledStartTimeAsc(user.getId(), now);
        for (ExpertSession session : directSessions) {
            if (session.getScheduledEndTime().isAfter(now) && trackedSessionIds.add(session.getId())) {
                nextSession = selectEarlier(nextSession, session);
            }
        }

        List<Map<String, Object>> courseHighlights = new LinkedList<>();

        for (SessionParticipant participation : myParticipations) {
            ExpertSession session = participation.getSession();
            if (session == null || session.getId() == null
                    || session.getScheduledStartTime() == null || session.getScheduledEndTime() == null) {
                continue;
            }

            if (session.getScheduledEndTime().isAfter(now) && trackedSessionIds.add(session.getId())) {
                nextSession = selectEarlier(nextSession, session);
            }

            LocalDateTime sessionStart = session.getScheduledStartTime();
            LocalDateTime sessionEnd = session.getScheduledEndTime();

            if (!sessionEnd.isBefore(weekStart) && !sessionStart.isAfter(now)) {
                LocalDateTime clampedStart = sessionStart.isBefore(weekStart) ? weekStart : sessionStart;
                LocalDateTime clampedEnd = sessionEnd.isAfter(now) ? now : sessionEnd;
                if (clampedEnd.isAfter(clampedStart)) {
                    focusMinutesThisWeek += ChronoUnit.MINUTES.between(clampedStart, clampedEnd);
                }
            }

            if (session.getExpert() != null && session.getExpert().getId() != null
                    && !session.getExpert().getId().equals(user.getId())) {
                peersEngagedIds.add(session.getExpert().getId());
            }
            if (session.getStudent() != null && session.getStudent().getId() != null
                    && !session.getStudent().getId().equals(user.getId())) {
                peersEngagedIds.add(session.getStudent().getId());
            }

            if (processedParticipationSessions.add(session.getId())) {
                sessionParticipantRepository.findBySessionId(session.getId()).stream()
                        .map(SessionParticipant::getUser)
                        .filter(Objects::nonNull)
                        .filter(partner -> partner.getId() != null && !partner.getId().equals(user.getId()))
                        .forEach(partner -> peersEngagedIds.add(partner.getId()));
            }
        }

        for (Course course : courses) {
            List<StudyGroup> courseGroups = studyGroupRepository.findByCourseIdAndIsActiveTrue(course.getId());
            int openGroupCount = (int) courseGroups.stream()
                    .filter(group -> "open".equalsIgnoreCase(group.getVisibility()))
                    .count();

            List<ExpertSession> courseSessions = expertSessionRepository
                    .findByCourseIdAndScheduledEndTimeAfterOrderByScheduledStartTimeAsc(course.getId(), now);
            for (ExpertSession session : courseSessions) {
                if (session.getScheduledEndTime().isAfter(now) && trackedSessionIds.add(session.getId())) {
                    nextSession = selectEarlier(nextSession, session);
                }
            }

            ExpertSession upcomingCourseSession = courseSessions.stream().findFirst().orElse(null);

            List<ExpertProfile> courseExperts = expertProfileRepository.findByCourseId(course.getId());
            long questionCount = expertQuestionRepository.countByCourseIdAndIsPublicTrue(course.getId());
            ExpertQuestion latestQuestion = expertQuestionRepository
                    .findTop3ByCourseIdAndIsPublicTrueOrderByCreatedAtDesc(course.getId())
                    .stream()
                    .findFirst()
                    .orElse(null);

            Map<String, Object> highlight = new LinkedHashMap<>();
            highlight.put("courseId", course.getId());
            highlight.put("code", course.getCode());
            highlight.put("name", course.getName());
            highlight.put("groupCount", courseGroups.size());
            highlight.put("openGroupCount", openGroupCount);
            highlight.put("expertCount", courseExperts.size());
            highlight.put("questionCount", questionCount);
            highlight.put("enrolled", true);

            if (upcomingCourseSession != null) {
                highlight.put("upcomingSession", mapSessionSummary(upcomingCourseSession));
            }

            if (latestQuestion != null) {
                highlight.put("recentQuestion", mapQuestionSummary(latestQuestion));
            }

            courseHighlights.add(highlight);
        }

        for (StudyGroup group : myGroups) {
            List<ExpertSession> groupSessions = expertSessionRepository
                    .findByStudyGroupIdOrderByScheduledStartTimeDesc(group.getId());
            for (ExpertSession session : groupSessions) {
                if (session.getScheduledEndTime().isAfter(now) && trackedSessionIds.add(session.getId())) {
                    nextSession = selectEarlier(nextSession, session);
                }
            }
        }

        long totalUnreadMessages = messageReceiptRepository.countUnreadForUser(user.getId());
        List<Object[]> unreadByGroup = messageReceiptRepository.countUnreadByUserGrouped(user.getId());
        List<Map<String, Object>> unreadGroups = new ArrayList<>();

        for (Object[] row : unreadByGroup) {
            Long groupId = (Long) row[0];
            Long count = (Long) row[1];

            studyGroupRepository.findById(groupId).ifPresent(group -> {
                Map<String, Object> summary = new LinkedHashMap<>();
                summary.put("groupId", group.getId());
                summary.put("groupName", group.getName());
                summary.put("unreadCount", count.intValue());

                if (group.getCourse() != null) {
                    Map<String, Object> courseInfo = new LinkedHashMap<>();
                    courseInfo.put("id", group.getCourse().getId());
                    courseInfo.put("code", group.getCourse().getCode());
                    courseInfo.put("name", group.getCourse().getName());
                    summary.put("course", courseInfo);
                }

                Message lastMessage = messageRepository.findRecentMessagesByGroup(groupId).stream()
                        .findFirst()
                        .orElse(null);
                if (lastMessage != null) {
                    summary.put("lastMessageAt", lastMessage.getCreatedAt());
                    summary.put("lastMessagePreview", truncate(lastMessage.getContent(), 140));
                }

                unreadGroups.add(summary);
            });
        }

        long notificationCount = notificationService.getUnreadCount(user.getId());

        int focusMinutesDisplay = focusMinutesThisWeek > Integer.MAX_VALUE
            ? Integer.MAX_VALUE
            : (int) focusMinutesThisWeek;

        Map<String, Integer> metrics = new LinkedHashMap<>();
        metrics.put("enrolledCourses", courses.size());
        metrics.put("myGroups", myGroups.size());
        metrics.put("focusMinutesThisWeek", focusMinutesDisplay);
        metrics.put("studyPalsCount", peersEngagedIds.size());
        metrics.put("unreadMessages", (int) totalUnreadMessages);
        metrics.put("upcomingSessions", trackedSessionIds.size());
        metrics.put("notifications", (int) notificationCount);

        Map<String, Object> unreadSummary = new LinkedHashMap<>();
        unreadSummary.put("total", (int) totalUnreadMessages);
        unreadSummary.put("groups", unreadGroups);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("metrics", metrics);
        response.put("courseHighlights", courseHighlights.stream().limit(4).collect(Collectors.toList()));
        response.put("nextSession", nextSession != null ? mapSessionSummary(nextSession) : null);
        response.put("unreadMessages", unreadSummary);

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> mapSessionSummary(ExpertSession session) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", session.getId());
        map.put("title", session.getTitle());
        map.put("sessionType", session.getSessionType().name());
        map.put("status", session.getStatus().name());
        map.put("scheduledStartTime", session.getScheduledStartTime());
        map.put("scheduledEndTime", session.getScheduledEndTime());
        map.put("currentParticipants", session.getCurrentParticipants());
        map.put("maxParticipants", session.getMaxParticipants());

        if (session.getCourse() != null) {
            Map<String, Object> courseInfo = new LinkedHashMap<>();
            courseInfo.put("id", session.getCourse().getId());
            courseInfo.put("code", session.getCourse().getCode());
            courseInfo.put("name", session.getCourse().getName());
            map.put("course", courseInfo);
        }

        if (session.getStudyGroup() != null) {
            Map<String, Object> groupInfo = new LinkedHashMap<>();
            groupInfo.put("id", session.getStudyGroup().getId());
            groupInfo.put("name", session.getStudyGroup().getName());
            map.put("group", groupInfo);
        }

        if (session.getExpert() != null) {
            Map<String, Object> expertInfo = new LinkedHashMap<>();
            expertInfo.put("id", session.getExpert().getId());
            expertInfo.put("fullName", session.getExpert().getFullName());
            expertInfo.put("role", session.getExpert().getRole().name());
            map.put("expert", expertInfo);
        }

        return map;
    }

    private Map<String, Object> mapQuestionSummary(ExpertQuestion question) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", question.getId());
        map.put("title", question.getTitle());
        map.put("status", question.getStatus().getDisplayName());
        map.put("createdAt", question.getCreatedAt());
        map.put("answered", question.getAnswer() != null);
        return map;
    }

    private ExpertSession selectEarlier(ExpertSession current, ExpertSession candidate) {
        if (candidate == null) {
            return current;
        }
        if (current == null) {
            return candidate;
        }
        return candidate.getScheduledStartTime().isBefore(current.getScheduledStartTime()) ? candidate : current;
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private String truncate(String content, int limit) {
        if (content == null || content.length() <= limit) {
            return content;
        }
        return content.substring(0, Math.max(0, limit - 3)) + "...";
    }
}
