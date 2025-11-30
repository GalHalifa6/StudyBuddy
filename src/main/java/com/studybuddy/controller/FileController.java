package com.studybuddy.controller;

import com.studybuddy.model.FileUpload;
import com.studybuddy.model.StudyGroup;
import com.studybuddy.model.User;
import com.studybuddy.repository.FileUploadRepository;
import com.studybuddy.repository.StudyGroupRepository;
import com.studybuddy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/files")
public class FileController {

    @Autowired
    private FileUploadRepository fileUploadRepository;

    @Autowired
    private StudyGroupRepository groupRepository;

    @Autowired
    private UserRepository userRepository;

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    private Path uploadPath;

    // Allowed file types
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(
            "pdf", "doc", "docx", "txt", "ppt", "pptx", "xls", "xlsx",
            "png", "jpg", "jpeg", "gif", "webp",
            "zip", "rar", "7z"
    );

    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

    @PostConstruct
    public void init() {
        uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(uploadPath);
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory", e);
        }
    }

    @PostMapping("/upload/group/{groupId}")
    public ResponseEntity<?> uploadFile(
            @PathVariable Long groupId,
            @RequestParam("file") MultipartFile file) {
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User uploader = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        StudyGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        // Validate file
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("Please select a file to upload");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body("File size exceeds maximum limit of 50MB");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isEmpty()) {
            return ResponseEntity.badRequest().body("Invalid filename");
        }

        String extension = getFileExtension(originalFilename).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            return ResponseEntity.badRequest().body("File type not allowed. Allowed types: " + String.join(", ", ALLOWED_EXTENSIONS));
        }

        try {
            // Generate unique filename
            String uniqueFilename = UUID.randomUUID().toString() + "_" + originalFilename;
            
            // Create group subdirectory
            Path groupDir = uploadPath.resolve("group_" + groupId);
            Files.createDirectories(groupDir);
            
            // Save file
            Path filePath = groupDir.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Create database record
            FileUpload fileUpload = new FileUpload();
            fileUpload.setFilename(uniqueFilename);
            fileUpload.setOriginalFilename(originalFilename);
            fileUpload.setFilePath(filePath.toString());
            fileUpload.setFileType(file.getContentType());
            fileUpload.setFileSize(file.getSize());
            fileUpload.setUploader(uploader);
            fileUpload.setGroup(group);

            FileUpload saved = fileUploadRepository.save(fileUpload);
            return ResponseEntity.ok(toFileMap(saved));

        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Failed to upload file: " + e.getMessage());
        }
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<Map<String, Object>>> getGroupFiles(@PathVariable Long groupId) {
        List<FileUpload> files = fileUploadRepository.findByGroupIdOrderByUploadedAtDesc(groupId);
        List<Map<String, Object>> result = files.stream()
            .map(this::toFileMap)
            .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @GetMapping("/download/{fileId}")
    public ResponseEntity<?> downloadFile(@PathVariable Long fileId) {
        FileUpload fileUpload = fileUploadRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        try {
            Path filePath = Paths.get(fileUpload.getFilePath());
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            String contentType = fileUpload.getFileType();
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "attachment; filename=\"" + fileUpload.getOriginalFilename() + "\"")
                    .body(resource);

        } catch (MalformedURLException e) {
            return ResponseEntity.internalServerError().body("Error downloading file");
        }
    }

    @GetMapping("/view/{fileId}")
    public ResponseEntity<?> viewFile(@PathVariable Long fileId) {
        FileUpload fileUpload = fileUploadRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        try {
            Path filePath = Paths.get(fileUpload.getFilePath());
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists()) {
                return ResponseEntity.notFound().build();
            }

            String contentType = fileUpload.getFileType();
            if (contentType == null) {
                contentType = "application/octet-stream";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, 
                            "inline; filename=\"" + fileUpload.getOriginalFilename() + "\"")
                    .body(resource);

        } catch (MalformedURLException e) {
            return ResponseEntity.internalServerError().body("Error viewing file");
        }
    }

    @DeleteMapping("/{fileId}")
    public ResponseEntity<?> deleteFile(@PathVariable Long fileId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        FileUpload fileUpload = fileUploadRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));

        // Only uploader or admin can delete
        if (!fileUpload.getUploader().getId().equals(user.getId()) && 
            !user.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(403).body("Not authorized to delete this file");
        }

        try {
            // Delete physical file
            Path filePath = Paths.get(fileUpload.getFilePath());
            Files.deleteIfExists(filePath);

            // Delete database record
            fileUploadRepository.delete(fileUpload);

            return ResponseEntity.ok("File deleted successfully");
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error deleting file");
        }
    }

    @GetMapping("/info/{fileId}")
    public ResponseEntity<?> getFileInfo(@PathVariable Long fileId) {
        FileUpload fileUpload = fileUploadRepository.findById(fileId)
                .orElseThrow(() -> new RuntimeException("File not found"));
        return ResponseEntity.ok(toFileMap(fileUpload));
    }

    private String getFileExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex > 0 && dotIndex < filename.length() - 1) {
            return filename.substring(dotIndex + 1);
        }
        return "";
    }
    
    /**
     * Convert FileUpload entity to a safe Map without circular references
     */
    private Map<String, Object> toFileMap(FileUpload file) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", file.getId());
        map.put("filename", file.getFilename());
        map.put("originalFilename", file.getOriginalFilename());
        map.put("fileName", file.getOriginalFilename()); // Alias for frontend compatibility
        map.put("fileType", file.getFileType());
        map.put("fileSize", file.getFileSize());
        map.put("uploadedAt", file.getUploadedAt());
        
        // Safe uploader info
        if (file.getUploader() != null) {
            Map<String, Object> uploader = new HashMap<>();
            uploader.put("id", file.getUploader().getId());
            uploader.put("username", file.getUploader().getUsername());
            uploader.put("fullName", file.getUploader().getFullName());
            map.put("uploader", uploader);
        }
        
        // Safe group info (minimal)
        if (file.getGroup() != null) {
            Map<String, Object> group = new HashMap<>();
            group.put("id", file.getGroup().getId());
            group.put("name", file.getGroup().getName());
            map.put("group", group);
        }
        
        return map;
    }
}
