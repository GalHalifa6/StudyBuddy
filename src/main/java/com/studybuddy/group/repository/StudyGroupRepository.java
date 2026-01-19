package com.studybuddy.group.repository;

import com.studybuddy.group.model.StudyGroup;
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
    
    /**
     * Find groups that are matchable for a student based on hard filters:
     * - Group is in one of student's enrolled courses
     * - Group is not full (has available space)
     * - Student is not already a member
     * - Group is not private
     */
    @Query("SELECT g FROM StudyGroup g WHERE " +
           "g.course.id IN :courseIds AND " +
           "SIZE(g.members) < g.maxSize AND " +
           "g.visibility != 'PRIVATE' AND " +
           ":studentId NOT MEMBER OF g.members")
    List<StudyGroup> findMatchableGroups(
        @Param("courseIds") java.util.Set<Long> courseIds,
        @Param("studentId") Long studentId
    );
    
    // Eagerly fetch groups with members for admin panel
    @Query("SELECT DISTINCT g FROM StudyGroup g LEFT JOIN FETCH g.members LEFT JOIN FETCH g.course LEFT JOIN FETCH g.creator WHERE g.id IN :ids")
    List<StudyGroup> findByIdsWithMembers(@Param("ids") List<Long> ids);
    
    // Eagerly fetch a single group with members for admin panel
    @Query("SELECT DISTINCT g FROM StudyGroup g LEFT JOIN FETCH g.members LEFT JOIN FETCH g.course LEFT JOIN FETCH g.creator WHERE g.id = :id")
    java.util.Optional<StudyGroup> findByIdWithMembers(@Param("id") Long id);
}
