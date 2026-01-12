package com.studybuddy.event.service;

import com.studybuddy.event.dto.CreateEventDto;
import com.studybuddy.event.dto.EventDto;
import com.studybuddy.event.model.Event;
import com.studybuddy.messaging.model.Message;
import com.studybuddy.group.model.StudyGroup;
import com.studybuddy.user.model.User;
import com.studybuddy.event.repository.EventRepository;
import com.studybuddy.messaging.repository.MessageRepository;
import com.studybuddy.group.repository.StudyGroupRepository;
import com.studybuddy.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for managing calendar events
 */
@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository eventRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Create a new event
     */
    @Transactional
    public EventDto createEvent(CreateEventDto createEventDto, Long userId) {
        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        StudyGroup group = studyGroupRepository.findById(createEventDto.getGroupId())
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        // Check if user is a member of the group
        boolean isMember = group.getMembers().stream()
                .anyMatch(member -> member.getId().equals(userId));

        if (!isMember) {
            throw new AccessDeniedException("You must be a member of the group to create events");
        }

        Event event = new Event();
        event.setTitle(createEventDto.getTitle());
        event.setDescription(createEventDto.getDescription());
        event.setEventType(createEventDto.getEventType());
        event.setStartDateTime(createEventDto.getStartDateTime());
        event.setEndDateTime(createEventDto.getEndDateTime());
        event.setLocation(createEventDto.getLocation());
        event.setMeetingLink(createEventDto.getMeetingLink());
        event.setCreator(creator);
        event.setGroup(group);

        Event savedEvent = eventRepository.save(event);

        // Create a system message in the group chat to announce the event
        createEventMessage(savedEvent, creator, group, "created");

        return convertToDto(savedEvent);
    }

    /**
     * Get all events for a group
     */
    @Transactional(readOnly = true)
    public List<EventDto> getGroupEvents(Long groupId, Long userId) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        // Check if user is a member of the group
        boolean isMember = group.getMembers().stream()
                .anyMatch(member -> member.getId().equals(userId));

        if (!isMember) {
            throw new AccessDeniedException("You must be a member of the group to view events");
        }

        List<Event> events = eventRepository.findByGroupId(groupId);
        return events.stream().map(this::convertToDto).collect(Collectors.toList());
    }

    /**
     * Get upcoming events for a group
     */
    @Transactional(readOnly = true)
    public List<EventDto> getUpcomingGroupEvents(Long groupId, Long userId) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        // Check if user is a member of the group
        boolean isMember = group.getMembers().stream()
                .anyMatch(member -> member.getId().equals(userId));

        if (!isMember) {
            throw new AccessDeniedException("You must be a member of the group to view events");
        }

        List<Event> events = eventRepository.findUpcomingEventsByGroupId(groupId, LocalDateTime.now());
        return events.stream().map(this::convertToDto).collect(Collectors.toList());
    }

    /**
     * Get all events for a user across all their groups
     */
    @Transactional(readOnly = true)
    public List<EventDto> getUserEvents(Long userId) {
        List<Event> events = eventRepository.findEventsByUserId(userId);
        return events.stream().map(this::convertToDto).collect(Collectors.toList());
    }

    /**
     * Get upcoming events for a user across all their groups
     */
    @Transactional(readOnly = true)
    public List<EventDto> getUpcomingUserEvents(Long userId) {
        List<Event> events = eventRepository.findUpcomingEventsByUserId(userId, LocalDateTime.now());
        return events.stream().map(this::convertToDto).collect(Collectors.toList());
    }

    /**
     * Get a specific event by ID
     */
    @Transactional(readOnly = true)
    public EventDto getEventById(Long eventId, Long userId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        // Check if user is a member of the group
        boolean isMember = event.getGroup().getMembers().stream()
                .anyMatch(member -> member.getId().equals(userId));

        if (!isMember) {
            throw new AccessDeniedException("You must be a member of the group to view this event");
        }

        return convertToDto(event);
    }

    /**
     * Update an event
     */
    @Transactional
    public EventDto updateEvent(Long eventId, CreateEventDto updateDto, Long userId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        // Only the creator or group admin can update events
        if (!event.getCreator().getId().equals(userId)) {
            throw new AccessDeniedException("Only the event creator can update this event");
        }

        if (updateDto.getTitle() != null) {
            event.setTitle(updateDto.getTitle());
        }
        if (updateDto.getDescription() != null) {
            event.setDescription(updateDto.getDescription());
        }
        if (updateDto.getEventType() != null) {
            event.setEventType(updateDto.getEventType());
        }
        if (updateDto.getStartDateTime() != null) {
            event.setStartDateTime(updateDto.getStartDateTime());
        }
        if (updateDto.getEndDateTime() != null) {
            event.setEndDateTime(updateDto.getEndDateTime());
        }
        if (updateDto.getLocation() != null) {
            event.setLocation(updateDto.getLocation());
        }
        if (updateDto.getMeetingLink() != null) {
            event.setMeetingLink(updateDto.getMeetingLink());
        }

        Event updatedEvent = eventRepository.save(event);
        return convertToDto(updatedEvent);
    }

    /**
     * Delete an event
     */
    @Transactional
    public void deleteEvent(Long eventId, Long userId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        // Only the creator can delete events
        if (!event.getCreator().getId().equals(userId)) {
            throw new AccessDeniedException("Only the event creator can delete this event");
        }

        eventRepository.delete(event);
    }

    /**
     * Convert Event entity to EventDto
     */
    private EventDto convertToDto(Event event) {
        EventDto dto = new EventDto();
        dto.setId(event.getId());
        dto.setTitle(event.getTitle());
        dto.setDescription(event.getDescription());
        dto.setEventType(event.getEventType());
        dto.setStartDateTime(event.getStartDateTime());
        dto.setEndDateTime(event.getEndDateTime());
        dto.setLocation(event.getLocation());
        dto.setMeetingLink(event.getMeetingLink());
        dto.setCreatedAt(event.getCreatedAt());
        dto.setUpdatedAt(event.getUpdatedAt());

        if (event.getCreator() != null) {
            dto.setCreatorId(event.getCreator().getId());
            dto.setCreatorName(event.getCreator().getFullName() != null ? 
                event.getCreator().getFullName() : event.getCreator().getUsername());
        }

        if (event.getGroup() != null) {
            dto.setGroupId(event.getGroup().getId());
            dto.setGroupName(event.getGroup().getName());
        }

        return dto;
    }

    /**
     * Create a system message in the group chat to announce an event
     */
    private void createEventMessage(Event event, User creator, StudyGroup group, String action) {
        try {
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' h:mm a");
            String formattedDate = event.getStartDateTime().format(formatter);
            
            String messageContent = String.format("%s %s an event: %s on %s",
                    creator.getFullName() != null ? creator.getFullName() : creator.getUsername(),
                    action,
                    event.getTitle(),
                    formattedDate);

            Message message = new Message();
            message.setContent(messageContent);
            message.setMessageType("event");
            message.setSender(creator);
            message.setGroup(group);
            message.setEvent(event);
            message.setIsPinned(false);

            Message savedMessage = messageRepository.save(message);
            messageRepository.flush(); // Ensure createdAt is populated

            // Broadcast the event message via WebSocket
            Map<String, Object> messageMap = convertMessageToMap(savedMessage);
            messagingTemplate.convertAndSend("/topic/group/" + group.getId(), messageMap);
        } catch (Exception e) {
            // Log but don't fail event creation if notification fails
            System.err.println("Failed to create event notification message: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Convert Message to a safe Map for WebSocket broadcast
     */
    private Map<String, Object> convertMessageToMap(Message message) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", message.getId());
        map.put("content", message.getContent());
        map.put("messageType", message.getMessageType());
        map.put("isPinned", message.getIsPinned());
        map.put("createdAt", message.getCreatedAt());

        if (message.getSender() != null) {
            Map<String, Object> sender = new HashMap<>();
            sender.put("id", message.getSender().getId());
            sender.put("username", message.getSender().getUsername());
            sender.put("fullName", message.getSender().getFullName());
            map.put("sender", sender);
        }

        if (message.getGroup() != null) {
            Map<String, Object> group = new HashMap<>();
            group.put("id", message.getGroup().getId());
            group.put("name", message.getGroup().getName());
            map.put("group", group);
        }

        if (message.getEvent() != null) {
            Map<String, Object> event = new HashMap<>();
            event.put("id", message.getEvent().getId());
            event.put("title", message.getEvent().getTitle());
            event.put("eventType", message.getEvent().getEventType());
            event.put("startDateTime", message.getEvent().getStartDateTime());
            event.put("endDateTime", message.getEvent().getEndDateTime());
            event.put("location", message.getEvent().getLocation());
            event.put("meetingLink", message.getEvent().getMeetingLink());
            map.put("event", event);
            map.put("eventId", message.getEvent().getId());
        }

        return map;
    }
}
