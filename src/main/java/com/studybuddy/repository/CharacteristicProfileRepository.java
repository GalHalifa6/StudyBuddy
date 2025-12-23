package com.studybuddy.repository;

import com.studybuddy.model.CharacteristicProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CharacteristicProfileRepository extends JpaRepository<CharacteristicProfile, Long> {
    
    Optional<CharacteristicProfile> findByUserId(Long userId);
    
    boolean existsByUserId(Long userId);
}
