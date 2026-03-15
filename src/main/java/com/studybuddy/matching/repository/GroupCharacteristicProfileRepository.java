package com.studybuddy.matching.repository;

import com.studybuddy.matching.model.GroupCharacteristicProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupCharacteristicProfileRepository extends JpaRepository<GroupCharacteristicProfile, Long> {

    /**
     * Find profile by group ID.
     */
    Optional<GroupCharacteristicProfile> findByGroupId(Long groupId);
    
    /**
     * Batch fetch profiles for multiple groups (prevents N+1 queries).
     */
    List<GroupCharacteristicProfile> findByGroupIdIn(List<Long> groupIds);

    /**
     * Find all profiles for groups that contain a specific user.
     * Used when a user's profile changes to update all their groups.
     */
    @Query("SELECT gp FROM GroupCharacteristicProfile gp WHERE gp.groupId IN " +
           "(SELECT g.id FROM StudyGroup g JOIN g.members m WHERE m.id = :userId)")
    List<GroupCharacteristicProfile> findByMemberUserId(@Param("userId") Long userId);

    /**
     * Delete profile by group ID.
     */
    void deleteByGroupId(Long groupId);
}
