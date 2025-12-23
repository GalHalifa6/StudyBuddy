package com.studybuddy.security;

import com.studybuddy.model.User;
import com.studybuddy.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.UUID;

/**
 * Custom UserDetailsService implementation for Spring Security
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private static final Logger logger = LoggerFactory.getLogger(UserDetailsServiceImpl.class);

    @Autowired
    private UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User Not Found with username: " + username));

        // Create authority based on user role
        String authority = "ROLE_" + user.getRole().name();
        logger.info("Loading user: {} with role: {} -> authority: {}", username, user.getRole(), authority);
        SimpleGrantedAuthority grantedAuthority = new SimpleGrantedAuthority(authority);

        // Google/OAuth users may not have a password in the DB. Spring Security's User constructor
        // rejects null/empty passwords, so we provide a BCrypt-hashed random placeholder.
        // This preserves behavior: password-based login for OAuth users remains effectively impossible.
        String password = user.getPassword();
        if (password == null || password.isBlank()) {
            password = new BCryptPasswordEncoder().encode("oauth2-user-" + UUID.randomUUID());
        }

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                password,
                Collections.singletonList(grantedAuthority)
        );
    }
}
