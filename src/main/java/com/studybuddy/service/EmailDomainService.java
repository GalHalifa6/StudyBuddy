package com.studybuddy.service;

import com.studybuddy.model.AllowedEmailDomain;
import com.studybuddy.repository.AllowedEmailDomainRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Service for validating email domains against the allowed domain list
 */
@Service
public class EmailDomainService {

    @Autowired
    private AllowedEmailDomainRepository domainRepository;

    /**
     * Validates if an email domain is allowed
     * @param email The email address to validate
     * @return true if the domain is in the database and has ALLOW status
     */
    public boolean isEmailDomainAllowed(String email) {
        String domain = extractDomain(email);
        if (domain == null) {
            return false;
        }

        Optional<AllowedEmailDomain> allowedDomain = domainRepository.findByDomain(domain);
        return allowedDomain.isPresent() && 
               allowedDomain.get().getStatus() == AllowedEmailDomain.DomainStatus.ALLOW;
    }

    /**
     * Gets the institution name for an email domain
     * @param email The email address
     * @return Institution name if available, otherwise the domain itself
     */
    public String getInstitutionName(String email) {
        String domain = extractDomain(email);
        if (domain == null) {
            return null;
        }

        Optional<AllowedEmailDomain> allowedDomain = domainRepository.findByDomain(domain);
        if (allowedDomain.isPresent()) {
            String institutionName = allowedDomain.get().getInstitutionName();
            return institutionName != null ? institutionName : domain;
        }
        return domain;
    }

    /**
     * Extracts domain from email address
     * @param email The email address
     * @return Domain part (e.g., "tau.ac.il" from "student@tau.ac.il")
     */
    public String extractDomain(String email) {
        if (email == null || !email.contains("@")) {
            return null;
        }
        return email.substring(email.indexOf("@") + 1).toLowerCase();
    }
}






