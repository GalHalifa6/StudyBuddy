package com.studybuddy.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Service for generating meeting links for video conferencing platforms
 */
@Service
public class MeetingService {

    @Value("${jitsi.jaas.app-id:}")
    private String jaasAppId;

    @Value("${jitsi.jaas.meeting-prefix:studybuddy}")
    private String meetingPrefix;

    @Value("${jitsi.jaas.enabled:true}")
    private boolean jaasEnabled;

    /**
     * Generate a stable Jitsi meeting room URL
     * Format: https://meet.jit.si/studybuddy-{sessionId}-{shortToken}
     * 
     * @param sessionId The session ID
     * @return Jitsi meeting room URL
     */
    public String generateJitsiMeetingLink(Long sessionId) {
        String roomName = buildRoomName(sessionId);

        // Prefer JaaS (8x8.vc) when configured, otherwise fall back to public meet.jit.si
        if (jaasEnabled && jaasAppId != null && !jaasAppId.isEmpty()) {
            return "https://8x8.vc/" + jaasAppId + "/" + roomName;
        }

        return "https://meet.jit.si/" + roomName;
    }

    /**
     * Room name used for JWT signing (without appId path).
     */
    public String buildRoomName(Long sessionId) {
        String shortToken = generateShortToken(sessionId);
        return meetingPrefix + "-" + sessionId + "-" + shortToken;
    }

    /**
     * Generate a short token from session ID for room name uniqueness
     */
    private String generateShortToken(Long sessionId) {
        // Use session ID to generate a deterministic short token
        // This ensures same session always gets same room
        UUID uuid = UUID.nameUUIDFromBytes(("studybuddy-session-" + sessionId).getBytes());
        return uuid.toString().substring(0, 8).replace("-", "");
    }
}

