package com.studybuddy.repository;

import com.studybuddy.model.FileUpload;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for FileUpload entity
 */
@Repository
public interface FileUploadRepository extends JpaRepository<FileUpload, Long> {
    
    List<FileUpload> findByGroupId(Long groupId);
    
    List<FileUpload> findByUploaderId(Long uploaderId);
    
    List<FileUpload> findByGroupIdOrderByUploadedAtDesc(Long groupId);
}
