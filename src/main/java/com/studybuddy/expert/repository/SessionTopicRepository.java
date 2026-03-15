package com.studybuddy.expert.repository;

import com.studybuddy.expert.model.SessionTopic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SessionTopicRepository extends JpaRepository<SessionTopic, Long> {
    
    List<SessionTopic> findBySessionId(Long sessionId);
    
    void deleteBySessionId(Long sessionId);
    
    @Query("SELECT st.session.id FROM SessionTopic st WHERE st.topic.id IN :topicIds GROUP BY st.session.id")
    List<Long> findSessionIdsByTopicIds(@Param("topicIds") List<Long> topicIds);
}
