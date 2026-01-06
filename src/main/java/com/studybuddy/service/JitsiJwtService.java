package com.studybuddy.service;

import com.studybuddy.model.User;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Generates JaaS JWTs for Jitsi to bypass lobby/login.
 */
@Slf4j
@Service
public class JitsiJwtService {

    @Value("${jitsi.jaas.app-id:}")
    private String appId;

    @Value("${jitsi.jaas.kid:}")
    private String keyId;

    @Value("${jitsi.jaas.private-key:}")
    private String privateKeyPem;

    @Value("${jitsi.jaas.issuer:chat}")
    private String issuer;

    @Value("${jitsi.jaas.audience:jitsi}")
    private String audience;

    @Value("${jitsi.jaas.expiry-seconds:7200}")
    private long expirySeconds;

    private volatile PrivateKey cachedPrivateKey;

    public boolean isConfigured() {
        return StringUtils.hasText(appId) && StringUtils.hasText(keyId) && StringUtils.hasText(privateKeyPem);
    }

    public Instant getExpiryInstant() {
        return Instant.now().plusSeconds(expirySeconds);
    }

    public String generateToken(String roomName, User user, boolean isModerator) {
        if (!isConfigured()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Jitsi JaaS is not configured (appId/kid/private key missing)");
        }

        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(expirySeconds);

        Map<String, Object> userContext = new HashMap<>();
        userContext.put("moderator", isModerator);
        userContext.put("name", user.getFullName() != null ? user.getFullName() : user.getUsername());
        userContext.put("id", "user-" + user.getId());
        userContext.put("email", user.getEmail());
        userContext.put("avatar", "");
        userContext.put("hidden-from-recorder", false);

        Map<String, Object> features = new HashMap<>();
        features.put("livestreaming", true);
        features.put("file-upload", true);
        features.put("outbound-call", true);
        features.put("sip-outbound-call", false);
        features.put("transcription", true);
        features.put("list-visitors", false);
        features.put("recording", true);
        features.put("flip", false);

        Map<String, Object> context = new HashMap<>();
        context.put("user", userContext);
        context.put("features", features);

        try {
            return Jwts.builder()
                    .setHeaderParam("kid", keyId)
                    .setHeaderParam("typ", "JWT")
                    .setAudience(audience)
                    .setIssuer(issuer)
                    .setSubject(appId)
                    .setId(UUID.randomUUID().toString())
                    .setIssuedAt(Date.from(now))
                    .setNotBefore(Date.from(now.minusSeconds(5)))
                    .setExpiration(Date.from(expiresAt))
                    .claim("room", roomName)
                    .claim("context", context)
                    .signWith(resolvePrivateKey(), SignatureAlgorithm.RS256)
                    .compact();
        } catch (Exception e) {
            log.error("Failed to generate Jitsi JWT", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate meeting token");
        }
    }

    private PrivateKey resolvePrivateKey() {
        if (cachedPrivateKey != null) {
            return cachedPrivateKey;
        }
        try {
            String sanitized = privateKeyPem
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s", "");
            byte[] keyBytes = Base64.getDecoder().decode(sanitized);
            PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            cachedPrivateKey = keyFactory.generatePrivate(spec);
            return cachedPrivateKey;
        } catch (Exception e) {
            log.error("Failed to parse Jitsi private key", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Invalid Jitsi private key");
        }
    }
}
