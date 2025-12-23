package com.studybuddy.repository;

import com.studybuddy.model.AllowedEmailDomain;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for AllowedEmailDomain entity
 */
@Repository
public interface AllowedEmailDomainRepository extends JpaRepository<AllowedEmailDomain, Long> {
    
    Optional<AllowedEmailDomain> findByDomain(String domain);
    
    boolean existsByDomain(String domain);
}






