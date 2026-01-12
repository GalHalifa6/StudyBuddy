package com.studybuddy.admin.controller;

import com.studybuddy.admin.model.AllowedEmailDomain;
import com.studybuddy.admin.repository.AllowedEmailDomainRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * Admin Controller for managing allowed email domains
 * Protected with ADMIN role
 */
@RestController
@RequestMapping("/api/admin/domains")
@PreAuthorize("hasRole('ADMIN')")
public class DomainAdminController {

    @Autowired
    private AllowedEmailDomainRepository domainRepository;

    /**
     * Get all allowed domains
     */
    @GetMapping
    public ResponseEntity<List<AllowedEmailDomain>> getAllDomains() {
        return ResponseEntity.ok(domainRepository.findAll());
    }

    /**
     * Get domain by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getDomainById(@PathVariable Long id) {
        return domainRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Add a new domain
     */
    @PostMapping
    public ResponseEntity<?> addDomain(@Valid @RequestBody DomainRequest request) {
        // Normalize domain to lowercase for consistent storage and checking
        String normalizedDomain = request.getDomain().toLowerCase();
        
        // Check if domain already exists (using normalized lowercase)
        if (domainRepository.existsByDomain(normalizedDomain)) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse("Domain already exists"));
        }

        AllowedEmailDomain domain = new AllowedEmailDomain();
        domain.setDomain(normalizedDomain);
        domain.setStatus(request.getStatus() != null ? 
                request.getStatus() : AllowedEmailDomain.DomainStatus.ALLOW);
        domain.setInstitutionName(request.getInstitutionName());

        domainRepository.save(domain);
        return ResponseEntity.ok(domain);
    }

    /**
     * Update an existing domain
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateDomain(@PathVariable Long id, 
                                          @Valid @RequestBody DomainRequest request) {
        return domainRepository.findById(id)
                .map(domain -> {
                    // If domain is being updated, check for duplicates (excluding current domain)
                    if (request.getDomain() != null) {
                        String normalizedDomain = request.getDomain().toLowerCase();
                        
                        // Check if another domain with the same normalized name exists (excluding current)
                        Optional<AllowedEmailDomain> existingDomain = domainRepository.findByDomain(normalizedDomain);
                        if (existingDomain.isPresent() && !existingDomain.get().getId().equals(id)) {
                            return ResponseEntity.badRequest()
                                    .body(new ErrorResponse("Domain already exists"));
                        }
                        
                        domain.setDomain(normalizedDomain);
                    }
                    if (request.getStatus() != null) {
                        domain.setStatus(request.getStatus());
                    }
                    if (request.getInstitutionName() != null) {
                        domain.setInstitutionName(request.getInstitutionName());
                    }
                    domainRepository.save(domain);
                    return ResponseEntity.ok(domain);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Delete a domain
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDomain(@PathVariable Long id) {
        if (!domainRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        domainRepository.deleteById(id);
        return ResponseEntity.ok(new SuccessResponse("Domain deleted successfully"));
    }

    // DTOs
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DomainRequest {
        @NotBlank(message = "Domain is required")
        private String domain;
        
        private AllowedEmailDomain.DomainStatus status;
        
        private String institutionName;
    }

    @Data
    @AllArgsConstructor
    public static class ErrorResponse {
        private String message;
    }

    @Data
    @AllArgsConstructor
    public static class SuccessResponse {
        private String message;
    }
}






