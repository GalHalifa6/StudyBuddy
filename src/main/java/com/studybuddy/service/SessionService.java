package com.studybuddy.service;

import com.studybuddy.dto.SessionDto;
import com.studybuddy.dto.SessionStateDto;
import com.studybuddy.model.ExpertSession;
import com.studybuddy.model.SessionParticipant;
import com.studybuddy.model.User;
import com.studybuddy.repository.ExpertSessionRepository;
import com.studybuddy.repository.SessionParticipantRepository;
import com.studybuddy.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SessionService {

    private final ExpertSessionRepository sessionRepository;
    private final SessionParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public SessionDto joinSession(Long sessionId, Long userId) {
        ExpertSession session = loadSessionForUpdate(sessionId);
        validateSessionAvailability(session);
        ensureJoinEligibility(session, userId);

        // Check if already registered - if so, just return the session (idempotent)
        if (participantRepository.existsBySessionIdAndUserId(sessionId, userId)) {
            return persistAndBroadcast(session);
        }

        int currentCount = refreshParticipantCount(session);
        if (session.getMaxParticipants() != null && currentCount >= session.getMaxParticipants()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Session is full");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        SessionParticipant participant = SessionParticipant.builder()
                .session(session)
                .user(user)
                .status(SessionParticipant.ParticipantStatus.REGISTERED)
                .registeredAt(LocalDateTime.now())
                .build();

        participantRepository.save(participant);

        return persistAndBroadcast(session);
    }

    @Transactional
    public SessionDto leaveSession(Long sessionId, Long userId) {
        ExpertSession session = loadSessionForUpdate(sessionId);

        SessionParticipant participant = participantRepository.findBySessionIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not registered for this session"));

        participantRepository.delete(participant);

        return persistAndBroadcast(session);
    }

    private ExpertSession loadSessionForUpdate(Long sessionId) {
        return sessionRepository.findByIdForUpdate(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
    }

    private void validateSessionAvailability(ExpertSession session) {
        if (Boolean.TRUE.equals(session.getIsCancelled())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Session has been cancelled");
        }

        ExpertSession.SessionStatus status = session.getStatus();
        if (status != ExpertSession.SessionStatus.SCHEDULED && status != ExpertSession.SessionStatus.IN_PROGRESS) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Session is not accepting participants");
        }
    }

    private void ensureJoinEligibility(ExpertSession session, Long userId) {
        if (session.getStudent() != null) {
            Long assignedStudentId = session.getStudent().getId();
            if (assignedStudentId != null && !assignedStudentId.equals(userId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Session is reserved for another student");
            }
        }
    }

    private SessionDto persistAndBroadcast(ExpertSession session) {
        refreshParticipantCount(session);
        ExpertSession saved = sessionRepository.save(session);
        SessionStateDto stateDto = SessionStateDto.from(saved);
        messagingTemplate.convertAndSend("/topic/session/" + saved.getId() + "/state", stateDto);
        return SessionDto.from(saved);
    }

    public void broadcastStatusUpdate(ExpertSession session) {
        if (session == null || session.getId() == null || session.getStatus() == null) {
            return;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("status", session.getStatus().getDisplayName());
        payload.put("statusKey", session.getStatus().name());
        payload.put("timestamp", LocalDateTime.now().toString());

        messagingTemplate.convertAndSend("/topic/session/" + session.getId() + "/status", payload);
    }

    private int refreshParticipantCount(ExpertSession session) {
        long count = participantRepository.countBySessionId(session.getId());
        int updatedCount = Math.toIntExact(count);
        session.setCurrentParticipants(updatedCount);
        return updatedCount;
    }
}
