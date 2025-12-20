package com.studybuddy.service;

import com.studybuddy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Admin Statistics Service
 * Provides read-only statistics and metrics for admin dashboard
 * All methods are safe and don't modify any data
 */
@Service
public class AdminStatsService {

    @Autowired
    private UserRepository userRepository;

    /**
     * Get comprehensive admin statistics
     * All calculations are read-only and safe
     */
    public Map<String, Object> getAdminStatistics() {
        Map<String, Object> stats = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();
        
        // Active users (based on lastLoginAt)
        long activeUsers7d = userRepository.findAll().stream()
                .filter(user -> !user.getIsDeleted() && 
                        user.getLastLoginAt() != null &&
                        user.getLastLoginAt().isAfter(now.minusDays(7)))
                .count();
        
        long activeUsers30d = userRepository.findAll().stream()
                .filter(user -> !user.getIsDeleted() && 
                        user.getLastLoginAt() != null &&
                        user.getLastLoginAt().isAfter(now.minusDays(30)))
                .count();
        
        // New registrations
        long newUsersToday = userRepository.findAll().stream()
                .filter(user -> user.getCreatedAt() != null &&
                        user.getCreatedAt().isAfter(now.minusDays(1)))
                .count();
        
        long newUsersThisWeek = userRepository.findAll().stream()
                .filter(user -> user.getCreatedAt() != null &&
                        user.getCreatedAt().isAfter(now.minusDays(7)))
                .count();
        
        long newUsersThisMonth = userRepository.findAll().stream()
                .filter(user -> user.getCreatedAt() != null &&
                        user.getCreatedAt().isAfter(now.minusDays(30)))
                .count();
        
        // Week-over-week comparison (new users this week vs last week)
        long newUsersLastWeek = userRepository.findAll().stream()
                .filter(user -> user.getCreatedAt() != null &&
                        user.getCreatedAt().isAfter(now.minusDays(14)) &&
                        user.getCreatedAt().isBefore(now.minusDays(7)))
                .count();
        
        long weekOverWeekChange = newUsersThisWeek - newUsersLastWeek;
        double weekOverWeekPercent = newUsersLastWeek > 0 
                ? ((double) weekOverWeekChange / newUsersLastWeek) * 100 
                : (newUsersThisWeek > 0 ? 100.0 : 0.0);
        
        // Inactive users (30+ days)
        long inactiveUsers30d = userRepository.findAll().stream()
                .filter(user -> !user.getIsDeleted() && 
                        (user.getLastLoginAt() == null || 
                         user.getLastLoginAt().isBefore(now.minusDays(30))))
                .count();
        
        // Status counts
        long totalUsers = userRepository.findAll().stream()
                .filter(user -> !user.getIsDeleted())
                .count();
        
        long suspendedUsers = userRepository.findAll().stream()
                .filter(user -> !user.getIsDeleted() && 
                        user.getSuspendedUntil() != null &&
                        user.getSuspendedUntil().isAfter(now))
                .count();
        
        long bannedUsers = userRepository.findAll().stream()
                .filter(user -> !user.getIsDeleted() && 
                        user.getBannedAt() != null)
                .count();
        
        long deletedUsers = userRepository.findAll().stream()
                .filter(user -> user.getIsDeleted() != null && user.getIsDeleted())
                .count();
        
        long neverLoggedIn = userRepository.findAll().stream()
                .filter(user -> !user.getIsDeleted() && 
                        user.getLastLoginAt() == null)
                .count();
        
        // Email verification (if field exists)
        long verifiedUsers = userRepository.findAll().stream()
                .filter(user -> !user.getIsDeleted() && 
                        user.getIsEmailVerified() != null && 
                        user.getIsEmailVerified())
                .count();
        
        long unverifiedUsers = userRepository.findAll().stream()
                .filter(user -> !user.getIsDeleted() && 
                        (user.getIsEmailVerified() == null || !user.getIsEmailVerified()))
                .count();
        
        // Role distribution
        long studentCount = userRepository.findAll().stream()
                .filter(user -> !user.getIsDeleted() && 
                        user.getRole() != null &&
                        user.getRole().name().equals("USER"))
                .count();
        
        long expertCount = userRepository.findAll().stream()
                .filter(user -> !user.getIsDeleted() && 
                        user.getRole() != null &&
                        user.getRole().name().equals("EXPERT"))
                .count();
        
        long adminCount = userRepository.findAll().stream()
                .filter(user -> !user.getIsDeleted() && 
                        user.getRole() != null &&
                        user.getRole().name().equals("ADMIN"))
                .count();
        
        // Build response
        stats.put("activeUsers7d", activeUsers7d);
        stats.put("activeUsers30d", activeUsers30d);
        stats.put("newUsersToday", newUsersToday);
        stats.put("newUsersThisWeek", newUsersThisWeek);
        stats.put("newUsersThisMonth", newUsersThisMonth);
        stats.put("newUsersLastWeek", newUsersLastWeek);
        stats.put("weekOverWeekChange", weekOverWeekChange);
        stats.put("weekOverWeekPercent", Math.round(weekOverWeekPercent * 10.0) / 10.0);
        stats.put("inactiveUsers30d", inactiveUsers30d);
        stats.put("totalUsers", totalUsers);
        stats.put("suspendedUsers", suspendedUsers);
        stats.put("bannedUsers", bannedUsers);
        stats.put("deletedUsers", deletedUsers);
        stats.put("neverLoggedIn", neverLoggedIn);
        stats.put("verifiedUsers", verifiedUsers);
        stats.put("unverifiedUsers", unverifiedUsers);
        stats.put("studentCount", studentCount);
        stats.put("expertCount", expertCount);
        stats.put("adminCount", adminCount);
        
        return stats;
    }
}

