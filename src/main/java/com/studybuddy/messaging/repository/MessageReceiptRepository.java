package com.studybuddy.messaging.repository;

import com.studybuddy.messaging.model.MessageReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MessageReceiptRepository extends JpaRepository<MessageReceipt, Long> {

    @Query("SELECT mr.message.group.id, COUNT(mr) FROM MessageReceipt mr " +
            "WHERE mr.user.id = :userId AND mr.isRead = false GROUP BY mr.message.group.id")
    List<Object[]> countUnreadByUserGrouped(@Param("userId") Long userId);

    @Query("SELECT COUNT(mr) FROM MessageReceipt mr WHERE mr.user.id = :userId AND mr.isRead = false")
    long countUnreadForUser(@Param("userId") Long userId);

    @Query("SELECT COUNT(mr) FROM MessageReceipt mr WHERE mr.user.id = :userId AND mr.message.group.id = :groupId AND mr.isRead = false")
    long countUnreadForGroup(@Param("userId") Long userId, @Param("groupId") Long groupId);

    @Modifying
    @Query("UPDATE MessageReceipt mr SET mr.isRead = true, mr.readAt = :readAt " +
            "WHERE mr.user.id = :userId AND mr.message.group.id = :groupId AND mr.isRead = false")
    int markGroupAsRead(@Param("userId") Long userId,
                        @Param("groupId") Long groupId,
                        @Param("readAt") LocalDateTime readAt);
}
