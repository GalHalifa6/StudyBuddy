package com.studybuddy.common.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple per-IP rate limiter using Bucket4j.
 * Limits each IP to 100 requests per minute for API endpoints.
 * Auth endpoints (login/register) are more tightly limited to prevent brute-force.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    // General API: 100 requests/minute per IP
    private final Map<String, Bucket> generalBuckets = new ConcurrentHashMap<>();

    // Auth endpoints: 20 requests/minute per IP (brute-force protection)
    private final Map<String, Bucket> authBuckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();

        // Skip non-API paths
        if (!path.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        Bucket bucket;

        if (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/register")) {
            bucket = authBuckets.computeIfAbsent(clientIp, this::createAuthBucket);
        } else {
            bucket = generalBuckets.computeIfAbsent(clientIp, this::createGeneralBucket);
        }

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"success\":false,\"message\":\"Too many requests. Please try again later.\",\"status\":429}");
        }
    }

    private Bucket createGeneralBucket(String key) {
        return Bucket.builder()
                .addLimit(Bandwidth.simple(100, Duration.ofMinutes(1)))
                .build();
    }

    private Bucket createAuthBucket(String key) {
        return Bucket.builder()
                .addLimit(Bandwidth.simple(20, Duration.ofMinutes(1)))
                .build();
    }

    private String getClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isEmpty()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
