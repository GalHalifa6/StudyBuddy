package com.studybuddy.config;

import com.studybuddy.model.Topic;
import com.studybuddy.model.TopicCategory;
import com.studybuddy.repository.TopicRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * Initialize default topics if they don't exist
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class TopicsDataInitializer implements CommandLineRunner {

    private final TopicRepository topicRepository;

    @Override
    public void run(String... args) {
        log.info("Initializing default topics...");
        
        List<TopicData> defaultTopics = Arrays.asList(
            // EDUCATION topics
            new TopicData("Calculus", TopicCategory.EDUCATION, "Differential and integral calculus"),
            new TopicData("Linear Algebra", TopicCategory.EDUCATION, "Matrices, vectors, and linear transformations"),
            new TopicData("Statistics", TopicCategory.EDUCATION, "Statistical analysis and probability"),
            new TopicData("Psychology", TopicCategory.EDUCATION, "Human behavior and mental processes"),
            new TopicData("Biology", TopicCategory.EDUCATION, "Life sciences and living organisms"),
            new TopicData("Chemistry", TopicCategory.EDUCATION, "Matter, elements, and chemical reactions"),
            new TopicData("Physics", TopicCategory.EDUCATION, "Matter, energy, and fundamental forces"),
            new TopicData("Computer Science", TopicCategory.EDUCATION, "Computing theory and algorithms"),
            new TopicData("Data Structures", TopicCategory.EDUCATION, "Organizing and storing data efficiently"),
            new TopicData("Algorithms", TopicCategory.EDUCATION, "Problem-solving procedures"),
            new TopicData("Machine Learning", TopicCategory.EDUCATION, "AI and predictive modeling"),
            new TopicData("Web Development", TopicCategory.EDUCATION, "Building web applications"),
            new TopicData("Mobile Development", TopicCategory.EDUCATION, "iOS and Android app development"),
            new TopicData("Python", TopicCategory.EDUCATION, "Python programming language"),
            new TopicData("Java", TopicCategory.EDUCATION, "Java programming language"),
            new TopicData("JavaScript", TopicCategory.EDUCATION, "JavaScript programming language"),
            new TopicData("C++", TopicCategory.EDUCATION, "C++ programming language"),
            new TopicData("SQL", TopicCategory.EDUCATION, "Database query language"),
            new TopicData("Economics", TopicCategory.EDUCATION, "Economic theory and markets"),
            new TopicData("Business", TopicCategory.EDUCATION, "Business management and strategy"),
            new TopicData("Marketing", TopicCategory.EDUCATION, "Marketing principles and practices"),
            new TopicData("Finance", TopicCategory.EDUCATION, "Financial management and investing"),
            new TopicData("History", TopicCategory.EDUCATION, "Historical events and civilizations"),
            new TopicData("Literature", TopicCategory.EDUCATION, "Literary analysis and writing"),
            new TopicData("Philosophy", TopicCategory.EDUCATION, "Philosophical thought and ethics"),
            new TopicData("Political Science", TopicCategory.EDUCATION, "Government and political systems"),
            new TopicData("Sociology", TopicCategory.EDUCATION, "Society and social behavior"),
            new TopicData("Environmental Science", TopicCategory.EDUCATION, "Environmental issues and sustainability"),
            
            // CASUAL topics
            new TopicData("Resume Writing", TopicCategory.CASUAL, "CV and resume refinement"),
            new TopicData("Interview Prep", TopicCategory.CASUAL, "Job interview preparation"),
            new TopicData("Public Speaking", TopicCategory.CASUAL, "Presentation and speaking skills"),
            new TopicData("Time Management", TopicCategory.CASUAL, "Productivity and organization"),
            new TopicData("Study Skills", TopicCategory.CASUAL, "Effective learning techniques"),
            new TopicData("Career Development", TopicCategory.CASUAL, "Career planning and advancement"),
            new TopicData("Networking", TopicCategory.CASUAL, "Professional networking"),
            new TopicData("Leadership", TopicCategory.CASUAL, "Leadership and team management"),
            new TopicData("Communication", TopicCategory.CASUAL, "Effective communication skills"),
            new TopicData("Critical Thinking", TopicCategory.CASUAL, "Analytical and logical reasoning"),
            new TopicData("Test Prep", TopicCategory.CASUAL, "Standardized test preparation"),
            new TopicData("Writing", TopicCategory.CASUAL, "General writing improvement"),
            new TopicData("Research Skills", TopicCategory.CASUAL, "Academic research methods"),
            new TopicData("Note-Taking", TopicCategory.CASUAL, "Effective note-taking strategies"),
            
            // HOBBY topics
            new TopicData("Guitar", TopicCategory.HOBBY, "Playing guitar"),
            new TopicData("Piano", TopicCategory.HOBBY, "Playing piano"),
            new TopicData("Photography", TopicCategory.HOBBY, "Photography skills and techniques"),
            new TopicData("Drawing", TopicCategory.HOBBY, "Sketching and illustration"),
            new TopicData("Painting", TopicCategory.HOBBY, "Painting and visual arts"),
            new TopicData("Cooking", TopicCategory.HOBBY, "Culinary skills and recipes"),
            new TopicData("Fitness", TopicCategory.HOBBY, "Physical fitness and exercise"),
            new TopicData("Yoga", TopicCategory.HOBBY, "Yoga practice and mindfulness"),
            new TopicData("Running", TopicCategory.HOBBY, "Running and endurance training"),
            new TopicData("Basketball", TopicCategory.HOBBY, "Basketball skills and strategy"),
            new TopicData("Soccer", TopicCategory.HOBBY, "Soccer/football skills"),
            new TopicData("Chess", TopicCategory.HOBBY, "Chess strategy and tactics"),
            new TopicData("Gaming", TopicCategory.HOBBY, "Video games and esports"),
            new TopicData("Reading", TopicCategory.HOBBY, "Book clubs and literature"),
            new TopicData("Writing Creative", TopicCategory.HOBBY, "Creative writing and storytelling"),
            new TopicData("Film", TopicCategory.HOBBY, "Movies and cinematography"),
            new TopicData("Music Production", TopicCategory.HOBBY, "Creating and producing music"),
            new TopicData("Dance", TopicCategory.HOBBY, "Dancing and choreography"),
            new TopicData("Hiking", TopicCategory.HOBBY, "Outdoor hiking and nature"),
            new TopicData("Traveling", TopicCategory.HOBBY, "Travel and exploration"),
            new TopicData("Languages", TopicCategory.HOBBY, "Learning foreign languages"),
            new TopicData("Meditation", TopicCategory.HOBBY, "Meditation and mindfulness"),
            new TopicData("Gardening", TopicCategory.HOBBY, "Gardening and plant care"),
            new TopicData("Volunteering", TopicCategory.HOBBY, "Community service and volunteering")
        );
        
        int created = 0;
        for (TopicData data : defaultTopics) {
            if (topicRepository.findByNameIgnoreCaseAndCategory(data.name, data.category).isEmpty()) {
                Topic topic = Topic.builder()
                        .name(data.name)
                        .category(data.category)
                        .description(data.description)
                        .isActive(true)
                        .build();
                topicRepository.save(topic);
                created++;
            }
        }
        
        log.info("Topics initialization complete. Created {} new topics", created);
    }
    
    private record TopicData(String name, TopicCategory category, String description) {}
}
