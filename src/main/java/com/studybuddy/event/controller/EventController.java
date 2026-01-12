package com.studybuddy.event.controller;

import com.studybuddy.event.dto.CreateEventDto;
import com.studybuddy.event.dto.EventDto;
import com.studybuddy.user.model.User;
import com.studybuddy.user.repository.UserRepository;
import com.studybuddy.event.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for managing calendar events
 */
@RestController
@RequestMapping("/api/events")
public class EventController {

    @Autowired
    private EventService eventService;

    @Autowired
    private UserRepository userRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * Create a new event
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createEvent(@Valid @RequestBody CreateEventDto createEventDto) {
        try {
            System.out.println("Creating event: " + createEventDto);
            User currentUser = getCurrentUser();
            EventDto event = eventService.createEvent(createEventDto, currentUser.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(event);
        } catch (Exception e) {
            System.err.println("Error creating event: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }
    
    // Error response class
    static class ErrorResponse {
        public String message;
        public ErrorResponse(String message) {
            this.message = message;
        }
    }

    /**
     * Get all events for a specific group
     */
    @GetMapping("/group/{groupId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getGroupEvents(@PathVariable Long groupId) {
        try {
            System.out.println("Getting events for group: " + groupId);
            User currentUser = getCurrentUser();
            List<EventDto> events = eventService.getGroupEvents(groupId, currentUser.getId());
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            System.err.println("Error getting group events: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse(e.getMessage()));
        }
    }

    /**
     * Get upcoming events for a specific group
     */
    @GetMapping("/group/{groupId}/upcoming")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<EventDto>> getUpcomingGroupEvents(@PathVariable Long groupId) {
        User currentUser = getCurrentUser();
        List<EventDto> events = eventService.getUpcomingGroupEvents(groupId, currentUser.getId());
        return ResponseEntity.ok(events);
    }

    /**
     * Get all events for the authenticated user across all their groups
     */
    @GetMapping("/my-events")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<EventDto>> getMyEvents() {
        User currentUser = getCurrentUser();
        List<EventDto> events = eventService.getUserEvents(currentUser.getId());
        return ResponseEntity.ok(events);
    }

    /**
     * Get upcoming events for the authenticated user across all their groups
     */
    @GetMapping("/my-events/upcoming")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<EventDto>> getMyUpcomingEvents() {
        User currentUser = getCurrentUser();
        List<EventDto> events = eventService.getUpcomingUserEvents(currentUser.getId());
        return ResponseEntity.ok(events);
    }

    /**
     * Get a specific event by ID
     */
    @GetMapping("/{eventId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EventDto> getEvent(@PathVariable Long eventId) {
        User currentUser = getCurrentUser();
        EventDto event = eventService.getEventById(eventId, currentUser.getId());
        return ResponseEntity.ok(event);
    }

    /**
     * Update an event
     */
    @PutMapping("/{eventId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EventDto> updateEvent(
            @PathVariable Long eventId,
            @Valid @RequestBody CreateEventDto updateDto) {
        User currentUser = getCurrentUser();
        EventDto event = eventService.updateEvent(eventId, updateDto, currentUser.getId());
        return ResponseEntity.ok(event);
    }

    /**
     * Delete an event
     */
    @DeleteMapping("/{eventId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long eventId) {
        User currentUser = getCurrentUser();
        eventService.deleteEvent(eventId, currentUser.getId());
        return ResponseEntity.noContent().build();
    }
}
