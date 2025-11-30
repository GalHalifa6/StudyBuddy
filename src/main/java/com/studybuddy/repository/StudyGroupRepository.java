package com.studybuddy.repository;

import com.studybuddy.model.StudyGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for StudyGroup entity
 */
@Repository
public interface StudyGroupRepository extends JpaRepository<StudyGroup, Long> {
    
    List<StudyGroup> findByCourseId(Long courseId);
    
    List<StudyGroup> findByCourseIdAndIsActiveTrue(Long courseId);
    
    List<StudyGroup> findByCreatorId(Long creatorId);
    
    @Query("SELECT g FROM StudyGroup g JOIN g.members m WHERE m.id = :userId")
    List<StudyGroup> findGroupsByMemberId(@Param("userId") Long userId);
    
    @Query("SELECT COUNT(g) > 0 FROM StudyGroup g JOIN g.members m WHERE g.id = :groupId AND m.id = :userId")
    boolean isUserMemberOfGroup(@Param("groupId") Long groupId, @Param("userId") Long userId);
    
    @Query("SELECT g FROM StudyGroup g WHERE g.course.id = :courseId AND g.visibility = 'open' AND g.isActive = true")
    List<StudyGroup> findOpenGroupsByCourse(@Param("courseId") Long courseId);
}
