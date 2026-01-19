package com.studybuddy.matching.listener;

import com.studybuddy.matching.event.GroupCreatedEvent;
import com.studybuddy.matching.event.GroupMemberJoinedEvent;
import com.studybuddy.matching.event.GroupMemberLeftEvent;
import com.studybuddy.matching.event.UserProfileUpdatedEvent;
import com.studybuddy.matching.service.GroupProfileCalculationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Listens to group and profile events to maintain GroupCharacteristicProfile data.
 * 
 * All listeners are @Async to avoid blocking the main operation (join/leave/quiz submission).
 * Each listener runs in a separate transaction to ensure failures don't rollback user actions.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class GroupProfileEventListener {
    
    private final GroupProfileCalculationService calculationService;
    
    /**
     * Handle new group creation.
     * Creates initial GroupCharacteristicProfile based on creator's profile.
     */
    @Async
    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleGroupCreated(GroupCreatedEvent event) {
        try {
            log.info("Handling GroupCreatedEvent: groupId={}, creatorId={}", 
                     event.getGroupId(), event.getCreatorId());
            
            calculationService.createInitialGroupProfile(event.getGroupId(), event.getCreatorId());
            
            log.info("Successfully created initial profile for group {}", event.getGroupId());
        } catch (Exception e) {
            log.error("Failed to create initial profile for group {}: {}", 
                      event.getGroupId(), e.getMessage(), e);
            // Don't throw - we don't want to break the main group creation flow
        }
    }
    
    /**
     * Handle member joining a group.
     * Recalculates the group's characteristic profile with the new member.
     */
    @Async
    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleMemberJoined(GroupMemberJoinedEvent event) {
        try {
            log.info("Handling GroupMemberJoinedEvent: groupId={}, userId={}", 
                     event.getGroupId(), event.getUserId());
            
            calculationService.recalculateGroupProfile(event.getGroupId());
            
            log.info("Successfully recalculated profile for group {} after member {} joined", 
                     event.getGroupId(), event.getUserId());
        } catch (Exception e) {
            log.error("Failed to update group profile for group {} after member {} joined: {}", 
                      event.getGroupId(), event.getUserId(), e.getMessage(), e);
            // Don't throw - we don't want to break the main join flow
        }
    }
    
    /**
     * Handle member leaving a group.
     * Recalculates the group's characteristic profile without the departed member.
     */
    @Async
    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleMemberLeft(GroupMemberLeftEvent event) {
        try {
            log.info("Handling GroupMemberLeftEvent: groupId={}, userId={}", 
                     event.getGroupId(), event.getUserId());
            
            calculationService.recalculateGroupProfile(event.getGroupId());
            
            log.info("Successfully recalculated profile for group {} after member {} left", 
                     event.getGroupId(), event.getUserId());
        } catch (Exception e) {
            log.error("Failed to update group profile for group {} after member {} left: {}", 
                      event.getGroupId(), event.getUserId(), e.getMessage(), e);
            // Don't throw - we don't want to break the main leave flow
        }
    }
    
    /**
     * Handle user profile update (quiz submission/retake).
     * Recalculates all groups that the user is a member of.
     */
    @Async
    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleProfileUpdated(UserProfileUpdatedEvent event) {
        try {
            log.info("Handling UserProfileUpdatedEvent: userId={}", event.getUserId());
            
            calculationService.recalculateGroupsForUser(event.getUserId());
            
            log.info("Successfully recalculated group profiles for user {}", event.getUserId());
        } catch (Exception e) {
            log.error("Failed to update group profiles for user {}: {}", 
                      event.getUserId(), e.getMessage(), e);
            // Don't throw - we don't want to break the quiz submission flow
        }
    }
}
