package com.studybuddy.common.initializer;

import com.studybuddy.user.model.*;
import com.studybuddy.course.model.*;
import com.studybuddy.group.model.*;
import com.studybuddy.expert.model.*;
import com.studybuddy.messaging.model.*;
import com.studybuddy.admin.model.*;
import com.studybuddy.quiz.model.*;
import com.studybuddy.matching.model.*;
import com.studybuddy.user.repository.*;
import com.studybuddy.course.repository.*;
import com.studybuddy.group.repository.*;
import com.studybuddy.expert.repository.*;
import com.studybuddy.messaging.repository.*;
import com.studybuddy.admin.repository.*;
import com.studybuddy.quiz.repository.*;
import com.studybuddy.matching.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;


/**
 * Data Initializer - Seeds the database with demo data for MVP presentation
 * This runs automatically on application startup if the database is empty
 */
@Component
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final StudyGroupRepository studyGroupRepository;
    private final ExpertProfileRepository expertProfileRepository;
    private final ExpertQuestionRepository expertQuestionRepository;
    private final ExpertSessionRepository expertSessionRepository;
    private final SessionParticipantRepository sessionParticipantRepository;
    private final MessageRepository messageRepository;
    private final AllowedEmailDomainRepository allowedEmailDomainRepository;
    private final QuizQuestionRepository quizQuestionRepository;
    private final CharacteristicProfileRepository characteristicProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        // Always seed domains if table is empty (independent of users)
        if (allowedEmailDomainRepository.count() == 0) {
            log.info("📧 Seeding allowed email domains...");
            seedIsraeliUniversities();
        } else {
            log.info("Allowed email domains already exist. Skipping domain seeding.");
        }

        // Only initialize missing demo data - check each entity individually
        log.info("🔍 Checking for missing demo data...");
        
        // Create Users - only if they don't exist
        User admin = userRepository.findByUsername("admin").orElse(null);
        if (admin == null) {
            log.info("Creating admin user...");
            admin = createAdmin();
        } else {
            log.info("Admin user already exists. Skipping.");
        }
        
        User expert1 = userRepository.findByUsername("dr.cohen").orElse(null);
        if (expert1 == null) {
            log.info("Creating expert1...");
            expert1 = createExpert1();
        } else {
            log.info("Expert1 already exists. Skipping.");
        }
        
        User expert2 = userRepository.findByUsername("prof.levi").orElse(null);
        if (expert2 == null) {
            log.info("Creating expert2...");
            expert2 = createExpert2();
        } else {
            log.info("Expert2 already exists. Skipping.");
        }
        
        User student1 = userRepository.findByUsername("sarah.student").orElse(null);
        if (student1 == null) {
            log.info("Creating student1...");
            student1 = createStudent1();
        } else {
            log.info("Student1 already exists. Skipping.");
        }
        
        User student2 = userRepository.findByUsername("david.learner").orElse(null);
        if (student2 == null) {
            log.info("Creating student2...");
            student2 = createStudent2();
        } else {
            log.info("Student2 already exists. Skipping.");
        }
        
        User student3 = userRepository.findByUsername("maya.coder").orElse(null);
        if (student3 == null) {
            log.info("Creating student3...");
            student3 = createStudent3();
        } else {
            log.info("Student3 already exists. Skipping.");
        }
        
        // Check if we should skip remaining initialization
        boolean allUsersExist = admin != null && expert1 != null && expert2 != null && 
                                student1 != null && student2 != null && student3 != null;
        
        if (allUsersExist && courseRepository.count() > 0 && quizQuestionRepository.count() > 0) {
            log.info("All demo data already exists. Skipping remaining initialization.");
            return;
        }
        
        log.info("🚀 Initializing missing demo data...");

        // ==================== MATCHING SYSTEM ====================
        
        // Step 1: Create 4 Courses (only if missing)
        log.info("Checking courses...");
        Course cs101 = courseRepository.findByCode("CS101").orElse(null);
        if (cs101 == null) {
            cs101 = createCourse("CS101", "Computer Science 101", "Introduction to programming and algorithms", "Computer Science", "Fall 2024");
        }
        
        Course linearAlgebra = courseRepository.findByCode("MATH201").orElse(null);
        if (linearAlgebra == null) {
            linearAlgebra = createCourse("MATH201", "Linear Algebra", "Vectors, matrices, and linear transformations", "Mathematics", "Fall 2024");
        }
        
        Course psychology = courseRepository.findByCode("PSY101").orElse(null);
        if (psychology == null) {
            psychology = createCourse("PSY101", "Introduction to Psychology", "Fundamentals of human behavior and cognition", "Psychology", "Fall 2024");
        }
        
        Course economics = courseRepository.findByCode("ECON101").orElse(null);
        if (economics == null) {
            economics = createCourse("ECON101", "Macroeconomics", "Economic principles at the macro level", "Economics", "Fall 2024");
        }
        
        // Step 2: Create 20 Quiz Questions (only if missing)
        // NOTE: This is a fallback for initial seeding. Admins should manage questions via the Admin Panel.
        if (quizQuestionRepository.count() == 0) {
            log.info("Creating quiz questions (fallback seeding - admins should manage via Admin Panel)...");
            createQuizQuestions();
        } else {
            log.info("Quiz questions already exist. Skipping. Admins can manage questions via Admin Panel.");
        }
        
        // Step 3: Create 50 Students with profiles (only if not many users exist yet)
        List<User> allStudents = new ArrayList<>();
        if (userRepository.count() < 20) {
            log.info("Creating 50 students with characteristic profiles...");
            allStudents = createStudentsWithProfiles(cs101, linearAlgebra, psychology, economics);
        } else {
            log.info("Many users already exist. Skipping bulk student creation.");
        }
        
        // Step 4: Create 10 Study Groups with intentional deficits (only if not many groups exist)
        if (studyGroupRepository.count() < 10 && !allStudents.isEmpty()) {
            log.info("Creating study groups with role deficits...");
            createStudyGroupsWithDeficits(allStudents, cs101, linearAlgebra, psychology, economics);
        } else {
            log.info("Study groups already exist. Skipping group creation.");
        }
        
        // Old demo data for backward compatibility (only create if missing)
        Course calculus = courseRepository.findByCode("MATH101").orElse(null);
        if (calculus == null) {
            calculus = createCourse("MATH101", "Calculus I", "Introduction to differential and integral calculus", "Mathematics", "Fall 2024");
        }
        
        Course dataStructures = courseRepository.findByCode("CS201").orElse(null);
        if (dataStructures == null) {
            dataStructures = createCourse("CS201", "Data Structures", "Fundamental data structures and algorithms", "Computer Science", "Fall 2024");
        }
        
        Course physics = courseRepository.findByCode("PHYS101").orElse(null);
        if (physics == null) {
            physics = createCourse("PHYS101", "Physics I", "Mechanics, thermodynamics, and waves", "Physics", "Fall 2024");
        }
        
        Course webDev = courseRepository.findByCode("CS301").orElse(null);
        if (webDev == null) {
            webDev = createCourse("CS301", "Web Development", "Full-stack web development with modern frameworks", "Computer Science", "Fall 2024");
        }

        // Enroll students in courses (only if not already enrolled)
        if (student1 != null) {
            enrollStudent(student1, calculus, dataStructures, physics);
        }
        if (student2 != null) {
            enrollStudent(student2, calculus, linearAlgebra, webDev);
        }
        if (student3 != null) {
            enrollStudent(student3, dataStructures, webDev, physics);
        }

        // Create Expert Profiles (only if they don't exist)
        if (expert1 != null && expertProfileRepository.findByUser(expert1).isEmpty()) {
            log.info("Creating expert profile 1...");
            ExpertProfile expertProfile1 = createExpertProfile(expert1, 
                "Professor", "Tel Aviv University",
                "PhD in Computer Science with 15+ years of teaching experience. Specialized in algorithms and data structures.",
                "PhD Computer Science, MSc Mathematics",
                12,
                new ArrayList<>(List.of("Algorithms", "Data Structures", "Java", "Python")),
                new ArrayList<>(List.of("Problem Solving", "Algorithm Design", "Code Review", "System Design"))
            );
            expertProfile1.getExpertiseCourses().add(dataStructures);
            expertProfile1.getExpertiseCourses().add(webDev);
            expertProfileRepository.save(expertProfile1);
        } else {
            log.info("Expert profile 1 already exists. Skipping.");
        }

        if (expert2 != null && expertProfileRepository.findByUser(expert2).isEmpty()) {
            log.info("Creating expert profile 2...");
            ExpertProfile expertProfile2 = createExpertProfile(expert2,
                "Senior Teaching Assistant", "Technion",
                "MSc in Applied Mathematics. Passionate about making complex math concepts accessible to everyone.",
                "MSc Applied Mathematics, BSc Physics",
                5,
                new ArrayList<>(List.of("Calculus", "Linear Algebra", "Statistics", "Mathematical Modeling")),
                new ArrayList<>(List.of("Mathematical Proofs", "Problem Solving", "Exam Preparation", "Tutoring"))
            );
            expertProfile2.getExpertiseCourses().add(calculus);
            expertProfile2.getExpertiseCourses().add(linearAlgebra);
            expertProfile2.getExpertiseCourses().add(physics);
            expertProfileRepository.save(expertProfile2);
        } else {
            log.info("Expert profile 2 already exists. Skipping.");
        }

        // Create Study Groups (only if they don't exist)
        StudyGroup calculusGroup = null;
        if (student1 != null && calculus != null) {
            calculusGroup = studyGroupRepository.findByCreatorId(student1.getId()).stream()
                .filter(g -> "Calculus Study Group".equals(g.getName()))
                .findFirst()
                .orElse(null);
            if (calculusGroup == null) {
                log.info("Creating Calculus Study Group...");
                calculusGroup = createStudyGroup("Calculus Study Group", 
                    "Weekly study sessions for Calculus I midterm preparation", 
                    "Derivatives & Integrals", calculus, student1, 8);
                if (student2 != null) {
                    addMemberToGroup(calculusGroup, student2);
                }
            } else {
                log.info("Calculus Study Group already exists. Skipping.");
            }
        }

        StudyGroup dsGroup = null;
        if (student1 != null && dataStructures != null) {
            dsGroup = studyGroupRepository.findByCreatorId(student1.getId()).stream()
                .filter(g -> "Data Structures Masters".equals(g.getName()))
                .findFirst()
                .orElse(null);
            if (dsGroup == null) {
                log.info("Creating Data Structures Masters group...");
                dsGroup = createStudyGroup("Data Structures Masters", 
                    "Practice coding problems and discuss algorithm strategies", 
                    "Trees & Graphs", dataStructures, student1, 6);
                if (student3 != null) {
                    addMemberToGroup(dsGroup, student3);
                }
            } else {
                log.info("Data Structures Masters group already exists. Skipping.");
            }
        }

        StudyGroup webDevGroup = null;
        if (student2 != null && webDev != null) {
            webDevGroup = studyGroupRepository.findByCreatorId(student2.getId()).stream()
                .filter(g -> "Full Stack Developers".equals(g.getName()))
                .findFirst()
                .orElse(null);
            if (webDevGroup == null) {
                log.info("Creating Full Stack Developers group...");
                webDevGroup = createStudyGroup("Full Stack Developers", 
                    "Build projects together and share web development tips", 
                    "React & Spring Boot", webDev, student2, 10);
                if (student3 != null) {
                    addMemberToGroup(webDevGroup, student3);
                }
            } else {
                log.info("Full Stack Developers group already exists. Skipping.");
            }
        }

        StudyGroup physicsGroup = null;
        if (student3 != null && physics != null) {
            physicsGroup = studyGroupRepository.findByCreatorId(student3.getId()).stream()
                .filter(g -> "Physics Problem Solvers".equals(g.getName()))
                .findFirst()
                .orElse(null);
            if (physicsGroup == null) {
                log.info("Creating Physics Problem Solvers group...");
                physicsGroup = createStudyGroup("Physics Problem Solvers", 
                    "Collaborative physics problem solving sessions", 
                    "Mechanics", physics, student3, 5);
                if (student1 != null) {
                    addMemberToGroup(physicsGroup, student1);
                }
            } else {
                log.info("Physics Problem Solvers group already exists. Skipping.");
            }
        }

        // Create Messages in Groups (only if group exists and has few messages)
        if (calculusGroup != null && student1 != null) {
            long messageCount = messageRepository.count();
            if (messageCount < 50) { // Only create messages if we don't have many yet
                createMessage(calculusGroup, student1, "Hey everyone! Let's prepare for the midterm together. What topics should we focus on first?");
                if (student2 != null) {
                    createMessage(calculusGroup, student2, "I think we should start with derivatives - that's where most of the exam questions come from!");
                }
                createMessage(calculusGroup, student1, "Good idea! I found some practice problems we can work through together.");
            }
        }

        if (dsGroup != null && student1 != null) {
            long messageCount = messageRepository.count();
            if (messageCount < 50) {
                createMessage(dsGroup, student1, "Just solved the binary tree traversal problem! The trick is using recursion properly.");
                if (student3 != null) {
                    createMessage(dsGroup, student3, "Can you share your approach? I'm stuck on the iterative solution.");
                }
                createMessage(dsGroup, student1, "Sure! Let me explain the stack-based approach in our next session.");
            }
        }

        if (webDevGroup != null && student2 != null) {
            long messageCount = messageRepository.count();
            if (messageCount < 50) {
                createMessage(webDevGroup, student2, "I finished setting up the React frontend. Ready to integrate with the backend!");
                if (student3 != null) {
                    createMessage(webDevGroup, student3, "Great progress! I'll handle the Spring Boot API endpoints.");
                }
            }
        }

        // Create Expert Questions (only if they don't exist)
        ExpertQuestion question1 = null;
        if (student1 != null && expert1 != null && dataStructures != null) {
            question1 = expertQuestionRepository.findByStudentIdOrderByCreatedAtDesc(student1.getId()).stream()
                .filter(q -> "How to optimize this recursive solution?".equals(q.getTitle()))
                .findFirst()
                .orElse(null);
            if (question1 == null) {
                log.info("Creating expert question 1...");
                question1 = createQuestion(student1, expert1, dataStructures, dsGroup,
                    "How to optimize this recursive solution?",
                    "I have a recursive function for calculating Fibonacci numbers but it's too slow for large inputs. How can I optimize it without using iteration?",
                    "public int fib(int n) {\n    if (n <= 1) return n;\n    return fib(n-1) + fib(n-2);\n}",
                    "Java",
                    new ArrayList<>(List.of("recursion", "optimization", "dynamic-programming")),
                    true
                );
                
                // Answer the question
                if (expert1 != null) {
                    answerQuestion(question1, expert1, 
                        "Great question! You can use memoization to avoid recalculating the same values. Here's the optimized solution:\n\n" +
                        "```java\nprivate Map<Integer, Integer> memo = new HashMap<>();\n\n" +
                        "public int fib(int n) {\n" +
                        "    if (n <= 1) return n;\n" +
                        "    if (memo.containsKey(n)) return memo.get(n);\n" +
                        "    int result = fib(n-1) + fib(n-2);\n" +
                        "    memo.put(n, result);\n" +
                        "    return result;\n}\n```\n\n" +
                        "This reduces the time complexity from O(2^n) to O(n) by storing previously calculated results!"
                    );
                }
            } else {
                log.info("Expert question 1 already exists. Skipping.");
            }
        }

        ExpertQuestion question2 = null;
        if (student2 != null && expert2 != null && calculus != null) {
            question2 = expertQuestionRepository.findByStudentIdOrderByCreatedAtDesc(student2.getId()).stream()
                .filter(q -> "Understanding the Chain Rule".equals(q.getTitle()))
                .findFirst()
                .orElse(null);
            if (question2 == null) {
                log.info("Creating expert question 2...");
                question2 = createQuestion(student2, expert2, calculus, null,
                    "Understanding the Chain Rule",
                    "I'm struggling to understand when and how to apply the chain rule for composite functions. Can you explain with a step-by-step example?",
                    null, null,
                    new ArrayList<>(List.of("calculus", "derivatives", "chain-rule")),
                    true
                );
            } else {
                log.info("Expert question 2 already exists. Skipping.");
            }
        }

        // Create Expert Sessions (only if they don't exist)
        if (expert1 != null && student1 != null && dataStructures != null) {
            List<ExpertSession> existingSessions = expertSessionRepository.findByExpertIdOrderByScheduledStartTimeDesc(expert1.getId());
            boolean sessionExists = existingSessions.stream()
                .anyMatch(s -> "Algorithm Problem Solving Workshop".equals(s.getTitle()));
            if (!sessionExists) {
                log.info("Creating expert session 1...");
                createSession(expert1, student1, dsGroup, dataStructures,
                    "Algorithm Problem Solving Workshop",
                    "Deep dive into dynamic programming and graph algorithms",
                    "1. Review recursion basics\n2. Introduction to memoization\n3. Practice problems",
                    ExpertSession.SessionType.ONE_ON_ONE,
                    LocalDateTime.now().plusDays(2).withHour(14).withMinute(0),
                    LocalDateTime.now().plusDays(2).withHour(15).withMinute(0)
                );
            } else {
                log.info("Expert session 1 already exists. Skipping.");
            }
        }

        if (expert2 != null && student2 != null && calculus != null) {
            List<ExpertSession> existingSessions = expertSessionRepository.findByExpertIdOrderByScheduledStartTimeDesc(expert2.getId());
            boolean sessionExists = existingSessions.stream()
                .anyMatch(s -> "Calculus Midterm Review".equals(s.getTitle()));
            if (!sessionExists) {
                log.info("Creating expert session 2...");
                createSession(expert2, student2, null, calculus,
                    "Calculus Midterm Review",
                    "Comprehensive review of derivatives and integrals for the upcoming exam",
                    "1. Derivative rules review\n2. Integration techniques\n3. Practice exam problems",
                    ExpertSession.SessionType.ONE_ON_ONE,
                    LocalDateTime.now().plusDays(3).withHour(10).withMinute(0),
                    LocalDateTime.now().plusDays(3).withHour(11).withMinute(30)
                );
            } else {
                log.info("Expert session 2 already exists. Skipping.");
            }
        }

        if (expert1 != null && webDevGroup != null && webDev != null) {
            List<ExpertSession> existingSessions = expertSessionRepository.findByExpertIdOrderByScheduledStartTimeDesc(expert1.getId());
            boolean sessionExists = existingSessions.stream()
                .anyMatch(s -> "React & Spring Boot Integration Workshop".equals(s.getTitle()));
            if (!sessionExists) {
                log.info("Creating expert session 3...");
                createSession(expert1, null, webDevGroup, webDev,
                    "React & Spring Boot Integration Workshop",
                    "Learn how to connect your React frontend with Spring Boot backend",
                    "1. REST API design\n2. Axios integration\n3. Authentication flow",
                    ExpertSession.SessionType.GROUP,
                    LocalDateTime.now().plusDays(5).withHour(16).withMinute(0),
                    LocalDateTime.now().plusDays(5).withHour(18).withMinute(0)
                );
            } else {
                log.info("Expert session 3 already exists. Skipping.");
            }
        }

        log.info("✅ Demo data initialization complete!");
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        log.info("📋 DEMO ACCOUNTS CREATED:");
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        log.info("👑 ADMIN:    admin / admin123");
        log.info("🎓 EXPERT 1: dr.cohen / expert123    (Computer Science)");
        log.info("🎓 EXPERT 2: prof.levi / expert123   (Mathematics)");
        log.info("📚 STUDENT 1: sarah.student / student123");
        log.info("📚 STUDENT 2: david.learner / student123");
        log.info("📚 STUDENT 3: maya.coder / student123");
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        log.info("📊 Created: {} courses, {} study groups, {} questions, {} sessions",
            courseRepository.count(), studyGroupRepository.count(), 
            expertQuestionRepository.count(), expertSessionRepository.count());
        log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    }

    /**
     * Seeds Israeli universities and colleges as allowed email domains
     */
    private void seedIsraeliUniversities() {
        log.info("Seeding Israeli universities and colleges...");

        // Major Israeli Universities
        createAllowedDomain("tau.ac.il", "Tel Aviv University");
        createAllowedDomain("mail.tau.ac.il", "Tel Aviv University");
        createAllowedDomain("post.tau.ac.il", "Tel Aviv University");
        
        createAllowedDomain("technion.ac.il", "Technion - Israel Institute of Technology");
        createAllowedDomain("campus.technion.ac.il", "Technion - Israel Institute of Technology");
        
        createAllowedDomain("huji.ac.il", "Hebrew University of Jerusalem");
        createAllowedDomain("mail.huji.ac.il", "Hebrew University of Jerusalem");
        
        createAllowedDomain("bgu.ac.il", "Ben-Gurion University of the Negev");
        createAllowedDomain("post.bgu.ac.il", "Ben-Gurion University of the Negev");
        
        createAllowedDomain("biu.ac.il", "Bar-Ilan University");
        createAllowedDomain("mail.biu.ac.il", "Bar-Ilan University");
        
        createAllowedDomain("haifa.ac.il", "University of Haifa");
        createAllowedDomain("staff.haifa.ac.il", "University of Haifa");
        
        createAllowedDomain("weizmann.ac.il", "Weizmann Institute of Science");
        
        createAllowedDomain("openu.ac.il", "Open University of Israel");
        createAllowedDomain("campus.openu.ac.il", "Open University of Israel");
        
        createAllowedDomain("ariel.ac.il", "Ariel University");
        
        // Academic Colleges
        createAllowedDomain("jct.ac.il", "Jerusalem College of Technology");
        createAllowedDomain("g.jct.ac.il", "Jerusalem College of Technology");
        
        createAllowedDomain("ac.sce.ac.il", "Sami Shamoon College of Engineering");
        createAllowedDomain("sce.ac.il", "Sami Shamoon College of Engineering");
        
        createAllowedDomain("afeka.ac.il", "Afeka Tel Aviv Academic College of Engineering");
        createAllowedDomain("students.afeka.ac.il", "Afeka Tel Aviv Academic College of Engineering");
        
        createAllowedDomain("braude.ac.il", "Braude College of Engineering");
        
        createAllowedDomain("azrieli.ac.il", "Azrieli College of Engineering Jerusalem");
        
        createAllowedDomain("hadassah.ac.il", "Hadassah Academic College");
        
        createAllowedDomain("ruppin.ac.il", "Ruppin Academic Center");
        
        createAllowedDomain("shenkar.ac.il", "Shenkar College");
        
        createAllowedDomain("bezalel.ac.il", "Bezalel Academy of Arts and Design");
        
        createAllowedDomain("idc.ac.il", "Reichman University (IDC Herzliya)");
        createAllowedDomain("runi.ac.il", "Reichman University");
        
        createAllowedDomain("colman.ac.il", "College of Management Academic Studies");
        
        createAllowedDomain("sapir.ac.il", "Sapir Academic College");
        
        createAllowedDomain("ashkelon.ac.il", "Ashkelon Academic College");
        
        createAllowedDomain("telhai.ac.il", "Tel-Hai College");
        
        // Add demo domain for testing
        createAllowedDomain("studybuddy.com", "StudyBuddy Demo");

        log.info("Seeded {} allowed email domains", allowedEmailDomainRepository.count());
    }

    private void createAllowedDomain(String domain, String institutionName) {
        // Normalize domain to lowercase for consistent storage and checking
        // This matches the behavior of DomainAdminController.addDomain()
        String normalizedDomain = domain.toLowerCase();
        
        if (!allowedEmailDomainRepository.existsByDomain(normalizedDomain)) {
            AllowedEmailDomain allowedDomain = new AllowedEmailDomain();
            allowedDomain.setDomain(normalizedDomain);
            allowedDomain.setStatus(AllowedEmailDomain.DomainStatus.ALLOW);
            allowedDomain.setInstitutionName(institutionName);
            allowedEmailDomainRepository.save(allowedDomain);
        }
    }

    private User createAdmin() {
        User admin = new User();
        admin.setUsername("admin");
        admin.setEmail("admin@studybuddy.com");
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setFullName("System Administrator");
        admin.setRole(Role.ADMIN);
        admin.setIsActive(true);
        admin.setIsEmailVerified(true); // Admin is pre-verified
        admin.setIsDeleted(false);
        admin.setOnboardingCompleted(true); // Admin doesn't need onboarding
        admin.setProficiencyLevel("advanced");
        admin.setCollaborationStyle("balanced");
        admin.setTopicsOfInterest(new ArrayList<>());
        admin.setPreferredLanguages(new ArrayList<>());
        return userRepository.save(admin);
    }

    private User createExpert1() {
        User expert = new User();
        expert.setUsername("dr.cohen");
        expert.setEmail("dr.cohen@studybuddy.com");
        expert.setPassword(passwordEncoder.encode("expert123"));
        expert.setFullName("Dr. Yossi Cohen");
        expert.setRole(Role.EXPERT);
        expert.setIsActive(true);
        expert.setIsEmailVerified(true); // Demo users are pre-verified
        expert.setIsDeleted(false);
        expert.setOnboardingCompleted(true); // Experts don't need onboarding
        expert.setProficiencyLevel("advanced");
        expert.setCollaborationStyle("discussion_heavy");
        expert.setTopicsOfInterest(new ArrayList<>(List.of("Algorithms", "Data Structures", "Software Engineering")));
        expert.setPreferredLanguages(new ArrayList<>(List.of("Hebrew", "English")));
        return userRepository.save(expert);
    }

    private User createExpert2() {
        User expert = new User();
        expert.setUsername("prof.levi");
        expert.setEmail("prof.levi@studybuddy.com");
        expert.setPassword(passwordEncoder.encode("expert123"));
        expert.setFullName("Prof. Rachel Levi");
        expert.setRole(Role.EXPERT);
        expert.setIsActive(true);
        expert.setIsEmailVerified(true); // Demo users are pre-verified
        expert.setIsDeleted(false);
        expert.setOnboardingCompleted(true); // Experts don't need onboarding
        expert.setProficiencyLevel("advanced");
        expert.setCollaborationStyle("balanced");
        expert.setTopicsOfInterest(new ArrayList<>(List.of("Mathematics", "Calculus", "Linear Algebra")));
        expert.setPreferredLanguages(new ArrayList<>(List.of("Hebrew", "English")));
        return userRepository.save(expert);
    }

    private User createStudent1() {
        User student = new User();
        student.setUsername("sarah.student");
        student.setEmail("sarah@studybuddy.com");
        student.setPassword(passwordEncoder.encode("student123"));
        student.setFullName("Sarah Ben-David");
        student.setRole(Role.USER);
        student.setIsActive(true);
        student.setIsEmailVerified(true); // Demo users are pre-verified
        student.setIsDeleted(false);
        student.setOnboardingCompleted(false); // Students need onboarding
        student.setProficiencyLevel("intermediate");
        student.setCollaborationStyle("discussion_heavy");
        student.setTopicsOfInterest(new ArrayList<>(List.of("Computer Science", "Mathematics")));
        student.setPreferredLanguages(new ArrayList<>(List.of("Hebrew", "English")));
        return userRepository.save(student);
    }

    private User createStudent2() {
        User student = new User();
        student.setUsername("david.learner");
        student.setEmail("david@studybuddy.com");
        student.setPassword(passwordEncoder.encode("student123"));
        student.setFullName("David Mizrachi");
        student.setRole(Role.USER);
        student.setIsActive(true);
        student.setIsEmailVerified(true); // Demo users are pre-verified
        student.setIsDeleted(false);
        student.setOnboardingCompleted(false); // Students need onboarding
        student.setProficiencyLevel("beginner");
        student.setCollaborationStyle("quiet_focus");
        student.setTopicsOfInterest(new ArrayList<>(List.of("Web Development", "Mathematics")));
        student.setPreferredLanguages(new ArrayList<>(List.of("Hebrew")));
        return userRepository.save(student);
    }

    private User createStudent3() {
        User student = new User();
        student.setUsername("maya.coder");
        student.setEmail("maya@studybuddy.com");
        student.setPassword(passwordEncoder.encode("student123"));
        student.setFullName("Maya Goldstein");
        student.setRole(Role.USER);
        student.setIsActive(true);
        student.setIsEmailVerified(true); // Demo users are pre-verified
        student.setIsDeleted(false);
        student.setOnboardingCompleted(false); // Students need onboarding
        student.setProficiencyLevel("advanced");
        student.setCollaborationStyle("balanced");
        student.setTopicsOfInterest(new ArrayList<>(List.of("Programming", "Physics", "Web Development")));
        student.setPreferredLanguages(new ArrayList<>(List.of("Hebrew", "English")));
        return userRepository.save(student);
    }

    private Course createCourse(String code, String name, String description, String faculty, String semester) {
        // Check if course already exists
        Optional<Course> existing = courseRepository.findByCode(code);
        if (existing.isPresent()) {
            return existing.get();
        }
        
        Course course = new Course();
        course.setCode(code);
        course.setName(name);
        course.setDescription(description);
        course.setFaculty(faculty);
        course.setSemester(semester);
        return courseRepository.save(course);
    }

    private void enrollStudent(User student, Course... courses) {
        if (student == null) return;
        for (Course course : courses) {
            if (course == null) continue;
            // Check if already enrolled
            if (!student.getCourses().contains(course)) {
                student.getCourses().add(course);
                course.getStudents().add(student);
                courseRepository.save(course);
            }
        }
        userRepository.save(student);
    }

    private ExpertProfile createExpertProfile(User expert, String title, String institution, 
            String bio, String qualifications, int yearsOfExperience,
            List<String> specializations, List<String> skills) {
        ExpertProfile profile = ExpertProfile.builder()
            .user(expert)
            .title(title)
            .institution(institution)
            .bio(bio)
            .qualifications(qualifications)
            .yearsOfExperience(yearsOfExperience)
            .specializations(specializations)
            .skills(skills)
            .isVerified(true)
            .verifiedAt(LocalDateTime.now().minusDays(30))
            .verifiedBy("admin")
            .averageRating(4.8)
            .totalRatings(25)
            .totalSessions(50)
            .totalQuestionsAnswered(120)
            .maxSessionsPerWeek(15)
            .sessionDurationMinutes(45)
            .acceptingNewStudents(true)
            .offersGroupConsultations(true)
            .offersOneOnOne(true)
            .offersAsyncQA(true)
            .typicalResponseHours(12)
            .isActive(true)
            .isAvailableNow(true)
            .helpfulAnswers(95)
            .studentsHelped(45)
            .isFree(true)
            .expertiseCourses(new HashSet<>())
            .build();
        return expertProfileRepository.save(profile);
    }

    private StudyGroup createStudyGroup(String name, String description, String topic, 
            Course course, User creator, int maxSize) {
        StudyGroup group = new StudyGroup();
        group.setName(name);
        group.setDescription(description);
        group.setTopic(topic);
        group.setCourse(course);
        group.setCreator(creator);
        group.setMaxSize(maxSize);
        group.setVisibility("open");
        group.setIsActive(true);
        group.getMembers().add(creator);
        creator.getGroups().add(group);
        StudyGroup savedGroup = studyGroupRepository.save(group);
        userRepository.save(creator);
        return savedGroup;
    }

    private void addMemberToGroup(StudyGroup group, User member) {
        group.getMembers().add(member);
        member.getGroups().add(group);
        studyGroupRepository.save(group);
        userRepository.save(member);
    }

    private void createMessage(StudyGroup group, User sender, String content) {
        Message message = new Message();
        message.setGroup(group);
        message.setSender(sender);
        message.setContent(content);
        message.setMessageType("text");
        message.setIsPinned(false);
        messageRepository.save(message);
    }

    private ExpertQuestion createQuestion(User student, User expert, Course course, StudyGroup group,
            String title, String content, String codeSnippet, String language, 
            List<String> tags, boolean isPublic) {
        ExpertQuestion question = ExpertQuestion.builder()
            .student(student)
            .expert(expert)
            .course(course)
            .studyGroup(group)
            .title(title)
            .content(content)
            .codeSnippet(codeSnippet)
            .programmingLanguage(language)
            .tags(tags)
            .status(ExpertQuestion.QuestionStatus.OPEN)
            .priority(ExpertQuestion.QuestionPriority.NORMAL)
            .isPublic(isPublic)
            .isAnonymous(false)
            .viewCount(15)
            .upvotes(3)
            .downvotes(0)
            .isUrgent(false)
            .build();
        return expertQuestionRepository.save(question);
    }

    private void answerQuestion(ExpertQuestion question, User expert, String answer) {
        question.setAnswer(answer);
        question.setAnsweredBy(expert);
        question.setAnsweredAt(LocalDateTime.now().minusHours(2));
        question.setStatus(ExpertQuestion.QuestionStatus.ANSWERED);
        question.setIsAnswerAccepted(true);
        expertQuestionRepository.save(question);
    }

    private ExpertSession createSession(User expert, User student, StudyGroup group, Course course,
            String title, String description, String agenda, ExpertSession.SessionType type,
            LocalDateTime startTime, LocalDateTime endTime) {
        ExpertSession session = ExpertSession.builder()
            .expert(expert)
            .student(student)
            .studyGroup(group)
            .course(course)
            .title(title)
            .description(description)
            .agenda(agenda)
            .sessionType(type)
            .status(ExpertSession.SessionStatus.SCHEDULED)
            .scheduledStartTime(startTime)
            .scheduledEndTime(endTime)
            .maxParticipants(type == ExpertSession.SessionType.GROUP ? 20 : 1)
            .currentParticipants(student != null ? 1 : 0)
            .meetingPlatform("in-app")
            .isRecurring(false)
            .isCancelled(false)
            .reminderSent(false)
            .build();
        ExpertSession savedSession = expertSessionRepository.save(session);

        if (student != null) {
            SessionParticipant participant = SessionParticipant.builder()
                .session(savedSession)
                .user(student)
                .status(SessionParticipant.ParticipantStatus.CONFIRMED)
                .registeredAt(LocalDateTime.now())
                .attended(false)
                .build();
            sessionParticipantRepository.save(participant);
        }

        return savedSession;
    }
    
    // ==================== MATCHING SYSTEM HELPERS ====================
    
    /**
     * Create 20 quiz questions with 4 options each.
     * Each option impacts at least 2 roles.
     */
    private void createQuizQuestions() {
        createQuestion(1, "When working on a group project, I prefer to:",
            "Take charge and delegate tasks to everyone", Map.of(RoleType.LEADER, 1.0, RoleType.PLANNER, 0.3),
            "Create a detailed timeline and track progress", Map.of(RoleType.PLANNER, 1.0, RoleType.TEAM_PLAYER, 0.4),
            "Focus on mastering the technical details", Map.of(RoleType.EXPERT, 1.0, RoleType.CHALLENGER, 0.3),
            "Brainstorm creative solutions", Map.of(RoleType.CREATIVE, 1.0, RoleType.COMMUNICATOR, 0.3)
        );
        
        createQuestion(2, "During team discussions, I usually:",
            "Question assumptions and push for better solutions", Map.of(RoleType.CHALLENGER, 1.0, RoleType.LEADER, 0.4),
            "Make sure everyone's voice is heard", Map.of(RoleType.COMMUNICATOR, 1.0, RoleType.TEAM_PLAYER, 0.6),
            "Provide expert analysis and data", Map.of(RoleType.EXPERT, 1.0, RoleType.PLANNER, 0.3),
            "Suggest innovative approaches", Map.of(RoleType.CREATIVE, 1.0, RoleType.COMMUNICATOR, 0.4)
        );

        
        createQuestion(3, "My strength in a team is:",
            "Keeping everyone organized and on schedule", Map.of(RoleType.PLANNER, 1.0, RoleType.LEADER, 0.3),
            "Supporting teammates and maintaining morale", Map.of(RoleType.TEAM_PLAYER, 1.0, RoleType.COMMUNICATOR, 0.5),
            "Deep knowledge in the subject matter", Map.of(RoleType.EXPERT, 1.0, RoleType.CHALLENGER, 0.2),
            "Finding unique perspectives", Map.of(RoleType.CREATIVE, 1.0, RoleType.CHALLENGER, 0.4)
        );
        
        createQuestion(4, "When facing a problem, I:",
            "Rally the team and create an action plan", Map.of(RoleType.LEADER, 1.0, RoleType.PLANNER, 0.5),
            "Research thoroughly before deciding", Map.of(RoleType.EXPERT, 1.0, RoleType.PLANNER, 0.4),
            "Challenge conventional thinking", Map.of(RoleType.CHALLENGER, 1.0, RoleType.CREATIVE, 0.5),
            "Facilitate brainstorming sessions", Map.of(RoleType.COMMUNICATOR, 1.0, RoleType.CREATIVE, 0.4)
        );
        
        createQuestion(5, "People usually describe me as:",
            "A natural leader who takes initiative", Map.of(RoleType.LEADER, 1.0, RoleType.CHALLENGER, 0.3),
            "Organized and dependable", Map.of(RoleType.PLANNER, 1.0, RoleType.TEAM_PLAYER, 0.5),
            "Knowledgeable and analytical", Map.of(RoleType.EXPERT, 1.0, RoleType.CHALLENGER, 0.3),
            "Imaginative and original", Map.of(RoleType.CREATIVE, 1.0, RoleType.COMMUNICATOR, 0.3)
        );
        
        createQuestion(6, "In group conflicts, I tend to:",
            "Take control and mediate decisively", Map.of(RoleType.LEADER, 1.0, RoleType.COMMUNICATOR, 0.4),
            "Listen to all sides and find compromise", Map.of(RoleType.TEAM_PLAYER, 1.0, RoleType.COMMUNICATOR, 0.6),
            "Analyze the root cause logically", Map.of(RoleType.EXPERT, 1.0, RoleType.PLANNER, 0.3),
            "Challenge everyone to think differently", Map.of(RoleType.CHALLENGER, 1.0, RoleType.LEADER, 0.3)
        );
        
        createQuestion(7, "I enjoy tasks that require:",
            "Strategic planning and coordination", Map.of(RoleType.PLANNER, 1.0, RoleType.LEADER, 0.4),
            "Deep research and analysis", Map.of(RoleType.EXPERT, 1.0, RoleType.PLANNER, 0.3),
            "Creative problem-solving", Map.of(RoleType.CREATIVE, 1.0, RoleType.CHALLENGER, 0.4),
            "Team collaboration and communication", Map.of(RoleType.COMMUNICATOR, 1.0, RoleType.TEAM_PLAYER, 0.5)
        );
        
        createQuestion(8, "My ideal role in a team project:",
            "Project manager overseeing everything", Map.of(RoleType.LEADER, 1.0, RoleType.PLANNER, 0.6),
            "Subject matter expert providing guidance", Map.of(RoleType.EXPERT, 1.0, RoleType.COMMUNICATOR, 0.3),
            "Creative director exploring new ideas", Map.of(RoleType.CREATIVE, 1.0, RoleType.LEADER, 0.3),
            "Team coordinator ensuring everyone contributes", Map.of(RoleType.TEAM_PLAYER, 1.0, RoleType.COMMUNICATOR, 0.5)
        );
        
        createQuestion(9, "When deadlines approach, I:",
            "Create a clear plan and prioritize tasks", Map.of(RoleType.PLANNER, 1.0, RoleType.LEADER, 0.5),
            "Stay calm and support stressed teammates", Map.of(RoleType.TEAM_PLAYER, 1.0, RoleType.COMMUNICATOR, 0.4),
            "Focus intensely on the technical work", Map.of(RoleType.EXPERT, 1.0, RoleType.PLANNER, 0.3),
            "Find innovative shortcuts", Map.of(RoleType.CREATIVE, 1.0, RoleType.CHALLENGER, 0.4)
        );
        
        createQuestion(10, "I contribute most by:",
            "Setting direction and making final decisions", Map.of(RoleType.LEADER, 1.0, RoleType.CHALLENGER, 0.3),
            "Organizing workflows and tracking progress", Map.of(RoleType.PLANNER, 1.0, RoleType.TEAM_PLAYER, 0.4),
            "Providing expert insights and validation", Map.of(RoleType.EXPERT, 1.0, RoleType.CHALLENGER, 0.3),
            "Generating fresh ideas and perspectives", Map.of(RoleType.CREATIVE, 1.0, RoleType.COMMUNICATOR, 0.4)
        );
        
        createQuestion(11, "I prefer meetings that:",
            "Have clear agenda and outcomes", Map.of(RoleType.PLANNER, 1.0, RoleType.LEADER, 0.4),
            "Allow open discussion and brainstorming", Map.of(RoleType.CREATIVE, 1.0, RoleType.COMMUNICATOR, 0.5),
            "Focus on data and evidence", Map.of(RoleType.EXPERT, 1.0, RoleType.PLANNER, 0.3),
            "Challenge status quo thinking", Map.of(RoleType.CHALLENGER, 1.0, RoleType.LEADER, 0.3)
        );
        
        createQuestion(12, "My communication style is:",
            "Direct and action-oriented", Map.of(RoleType.LEADER, 1.0, RoleType.CHALLENGER, 0.4),
            "Diplomatic and inclusive", Map.of(RoleType.COMMUNICATOR, 1.0, RoleType.TEAM_PLAYER, 0.6),
            "Precise and fact-based", Map.of(RoleType.EXPERT, 1.0, RoleType.PLANNER, 0.3),
            "Enthusiastic and idea-driven", Map.of(RoleType.CREATIVE, 1.0, RoleType.COMMUNICATOR, 0.4)
        );
        
        createQuestion(13, "I handle stress by:",
            "Taking charge and solving problems", Map.of(RoleType.LEADER, 1.0, RoleType.PLANNER, 0.3),
            "Creating structured plans", Map.of(RoleType.PLANNER, 1.0, RoleType.TEAM_PLAYER, 0.3),
            "Analyzing and understanding the situation", Map.of(RoleType.EXPERT, 1.0, RoleType.PLANNER, 0.4),
            "Thinking creatively about solutions", Map.of(RoleType.CREATIVE, 1.0, RoleType.CHALLENGER, 0.3)
        );
        
        createQuestion(14, "In brainstorming sessions, I:",
            "Guide the discussion towards practical outcomes", Map.of(RoleType.LEADER, 1.0, RoleType.PLANNER, 0.4),
            "Encourage everyone to contribute", Map.of(RoleType.COMMUNICATOR, 1.0, RoleType.TEAM_PLAYER, 0.6),
            "Evaluate ideas critically", Map.of(RoleType.EXPERT, 1.0, RoleType.CHALLENGER, 0.5),
            "Generate unconventional ideas", Map.of(RoleType.CREATIVE, 1.0, RoleType.CHALLENGER, 0.5)
        );
        
        createQuestion(15, "My decision-making style:",
            "Quick and decisive", Map.of(RoleType.LEADER, 1.0, RoleType.CHALLENGER, 0.3),
            "Careful and methodical", Map.of(RoleType.PLANNER, 1.0, RoleType.EXPERT, 0.4),
            "Based on thorough analysis", Map.of(RoleType.EXPERT, 1.0, RoleType.PLANNER, 0.5),
            "Intuitive and innovative", Map.of(RoleType.CREATIVE, 1.0, RoleType.LEADER, 0.3)
        );
        
        createQuestion(16, "I motivate others by:",
            "Setting clear goals and expectations", Map.of(RoleType.LEADER, 1.0, RoleType.PLANNER, 0.4),
            "Providing support and encouragement", Map.of(RoleType.TEAM_PLAYER, 1.0, RoleType.COMMUNICATOR, 0.6),
            "Sharing knowledge and expertise", Map.of(RoleType.EXPERT, 1.0, RoleType.COMMUNICATOR, 0.4),
            "Inspiring with new possibilities", Map.of(RoleType.CREATIVE, 1.0, RoleType.LEADER, 0.3)
        );
        
        createQuestion(17, "When learning new material, I:",
            "Organize it into structured frameworks", Map.of(RoleType.PLANNER, 1.0, RoleType.EXPERT, 0.4),
            "Dive deep into understanding", Map.of(RoleType.EXPERT, 1.0, RoleType.CHALLENGER, 0.3),
            "Connect it to creative applications", Map.of(RoleType.CREATIVE, 1.0, RoleType.EXPERT, 0.3),
            "Discuss it with others", Map.of(RoleType.COMMUNICATOR, 1.0, RoleType.TEAM_PLAYER, 0.5)
        );
        
        createQuestion(18, "In debates, I usually:",
            "Take a strong position and defend it", Map.of(RoleType.CHALLENGER, 1.0, RoleType.LEADER, 0.5),
            "Mediate different viewpoints", Map.of(RoleType.COMMUNICATOR, 1.0, RoleType.TEAM_PLAYER, 0.5),
            "Present evidence and logic", Map.of(RoleType.EXPERT, 1.0, RoleType.CHALLENGER, 0.4),
            "Propose alternative frameworks", Map.of(RoleType.CREATIVE, 1.0, RoleType.CHALLENGER, 0.5)
        );
        
        createQuestion(19, "I feel accomplished when:",
            "I've led the team to success", Map.of(RoleType.LEADER, 1.0, RoleType.PLANNER, 0.3),
            "Everyone worked well together", Map.of(RoleType.TEAM_PLAYER, 1.0, RoleType.COMMUNICATOR, 0.5),
            "I solved a complex problem", Map.of(RoleType.EXPERT, 1.0, RoleType.CHALLENGER, 0.3),
            "I created something original", Map.of(RoleType.CREATIVE, 1.0, RoleType.LEADER, 0.3)
        );
        
        createQuestion(20, "My approach to group work is:",
            "Take ownership and drive results", Map.of(RoleType.LEADER, 1.0, RoleType.PLANNER, 0.4),
            "Collaborate and build consensus", Map.of(RoleType.TEAM_PLAYER, 1.0, RoleType.COMMUNICATOR, 0.6),
            "Master the material thoroughly", Map.of(RoleType.EXPERT, 1.0, RoleType.PLANNER, 0.3),
            "Explore innovative methods", Map.of(RoleType.CREATIVE, 1.0, RoleType.CHALLENGER, 0.4)
        );
        
        log.info("Created 20 quiz questions with {} options each", 4);
    }
    
    private void createQuestion(int order, String questionText, 
            String opt1Text, Map<RoleType, Double> opt1Weights,
            String opt2Text, Map<RoleType, Double> opt2Weights,
            String opt3Text, Map<RoleType, Double> opt3Weights,
            String opt4Text, Map<RoleType, Double> opt4Weights) {
        
        // Check if question with this orderIndex already exists
        List<QuizQuestion> existingQuestions = quizQuestionRepository.findAll();
        boolean questionExists = existingQuestions.stream()
            .anyMatch(q -> q.getOrderIndex() == order && q.getQuestionText().equals(questionText));
        if (questionExists) {
            log.debug("Quiz question {} (order {}) already exists. Skipping.", questionText, order);
            return;
        }
        
        QuizQuestion question = QuizQuestion.builder()
                .questionText(questionText)
                .orderIndex(order)
                .active(true)
                .options(new ArrayList<>())
                .build();
        
        QuizOption opt1 = QuizOption.builder()
                .optionText(opt1Text)
                .orderIndex(1)
                .roleWeights(new java.util.HashMap<>(opt1Weights))
                .build();
        
        QuizOption opt2 = QuizOption.builder()
                .optionText(opt2Text)
                .orderIndex(2)
                .roleWeights(new java.util.HashMap<>(opt2Weights))
                .build();
        
        QuizOption opt3 = QuizOption.builder()
                .optionText(opt3Text)
                .orderIndex(3)
                .roleWeights(new java.util.HashMap<>(opt3Weights))
                .build();
        
        QuizOption opt4 = QuizOption.builder()
                .optionText(opt4Text)
                .orderIndex(4)
                .roleWeights(new java.util.HashMap<>(opt4Weights))
                .build();
        
        question.addOption(opt1);
        question.addOption(opt2);
        question.addOption(opt3);
        question.addOption(opt4);
        
        quizQuestionRepository.save(question);
    }
    
    /**
     * Create 50 students with characteristic profiles.
     */
    private List<User> createStudentsWithProfiles(Course cs101, Course linearAlgebra, Course psychology, Course economics) {
        List<User> students = new ArrayList<>();
        List<Course> allCourses = List.of(cs101, linearAlgebra, psychology, economics);
        
        // 10 Leaders
        students.add(createStudentWithProfile("leo_leader", "Leo Leader", 
                1.0, 0.6, 0.3, 0.3, 0.5, 0.4, 0.5, allCourses));
        students.add(createStudentWithProfile("captain_kirk", "Captain Kirk", 
                1.0, 0.5, 0.3, 0.3, 0.6, 0.4, 0.4, allCourses));
        students.add(createStudentWithProfile("boss_betty", "Boss Betty", 
                1.0, 0.7, 0.3, 0.3, 0.5, 0.4, 0.5, allCourses));
        students.add(createStudentWithProfile("chief_charlie", "Chief Charlie", 
                1.0, 0.6, 0.3, 0.3, 0.4, 0.5, 0.6, allCourses));
        students.add(createStudentWithProfile("director_dan", "Director Dan", 
                1.0, 0.6, 0.4, 0.3, 0.5, 0.4, 0.4, allCourses));
        students.add(createStudentWithProfile("major_mary", "Major Mary", 
                1.0, 0.5, 0.3, 0.3, 0.6, 0.5, 0.5, allCourses));
        students.add(createStudentWithProfile("commander_chris", "Commander Chris", 
                1.0, 0.6, 0.3, 0.3, 0.5, 0.4, 0.4, allCourses));
        students.add(createStudentWithProfile("president_paul", "President Paul", 
                1.0, 0.7, 0.3, 0.3, 0.6, 0.4, 0.5, allCourses));
        students.add(createStudentWithProfile("general_grace", "General Grace", 
                1.0, 0.6, 0.3, 0.3, 0.5, 0.5, 0.6, allCourses));
        students.add(createStudentWithProfile("alpha_alex", "Alpha Alex", 
                1.0, 0.5, 0.3, 0.3, 0.6, 0.4, 0.5, allCourses));
        
        // 5 Planners
        students.add(createStudentWithProfile("penny_planner", "Penny Planner", 
                0.4, 1.0, 0.3, 0.3, 0.5, 0.6, 0.3, allCourses));
        students.add(createStudentWithProfile("orson_organizer", "Orson Organizer", 
                0.3, 1.0, 0.3, 0.3, 0.4, 0.6, 0.3, allCourses));
        students.add(createStudentWithProfile("scheduler_sam", "Scheduler Sam", 
                0.4, 1.0, 0.3, 0.3, 0.5, 0.7, 0.3, allCourses));
        students.add(createStudentWithProfile("coordinator_chloe", "Coordinator Chloe", 
                0.3, 1.0, 0.3, 0.3, 0.6, 0.6, 0.3, allCourses));
        students.add(createStudentWithProfile("taskmaster_tom", "Taskmaster Tom", 
                0.5, 1.0, 0.3, 0.3, 0.4, 0.6, 0.3, allCourses));
        
        // 5 Experts
        students.add(createStudentWithProfile("sheldon_cooper", "Sheldon Cooper", 
                0.3, 0.4, 1.0, 0.3, 0.4, 0.3, 0.5, allCourses));
        students.add(createStudentWithProfile("professor_x", "Professor X", 
                0.3, 0.4, 1.0, 0.3, 0.5, 0.4, 0.4, allCourses));
        students.add(createStudentWithProfile("genius_gina", "Genius Gina", 
                0.3, 0.4, 1.0, 0.3, 0.4, 0.3, 0.4, allCourses));
        students.add(createStudentWithProfile("scholar_steve", "Scholar Steve", 
                0.3, 0.5, 1.0, 0.3, 0.5, 0.4, 0.3, allCourses));
        students.add(createStudentWithProfile("brainiac_bob", "Brainiac Bob", 
                0.3, 0.4, 1.0, 0.3, 0.4, 0.3, 0.5, allCourses));
        
        // 5 Creatives
        students.add(createStudentWithProfile("davinci", "Davinci", 
                0.3, 0.3, 0.3, 1.0, 0.5, 0.4, 0.5, allCourses));
        students.add(createStudentWithProfile("picasso", "Picasso", 
                0.3, 0.3, 0.3, 1.0, 0.5, 0.4, 0.6, allCourses));
        students.add(createStudentWithProfile("creative_cara", "Creative Cara", 
                0.3, 0.3, 0.3, 1.0, 0.6, 0.5, 0.4, allCourses));
        students.add(createStudentWithProfile("innovator_ivan", "Innovator Ivan", 
                0.4, 0.3, 0.3, 1.0, 0.5, 0.4, 0.5, allCourses));
        students.add(createStudentWithProfile("visionary_vera", "Visionary Vera", 
                0.3, 0.3, 0.3, 1.0, 0.5, 0.4, 0.6, allCourses));
        
        // 5 Communicators
        students.add(createStudentWithProfile("chatty_cathy", "Chatty Cathy", 
                0.3, 0.4, 0.3, 0.4, 1.0, 0.7, 0.3, allCourses));
        students.add(createStudentWithProfile("speaker_sarah", "Speaker Sarah", 
                0.4, 0.4, 0.3, 0.3, 1.0, 0.7, 0.3, allCourses));
        students.add(createStudentWithProfile("mediator_mike", "Mediator Mike", 
                0.3, 0.4, 0.3, 0.3, 1.0, 0.8, 0.3, allCourses));
        students.add(createStudentWithProfile("diplomat_diana", "Diplomat Diana", 
                0.3, 0.4, 0.3, 0.3, 1.0, 0.7, 0.3, allCourses));
        students.add(createStudentWithProfile("peaceful_pete", "Peaceful Pete", 
                0.3, 0.4, 0.3, 0.3, 1.0, 0.8, 0.2, allCourses));
        
        // 5 Challengers
        students.add(createStudentWithProfile("debate_debbie", "Debate Debbie", 
                0.4, 0.3, 0.4, 0.4, 0.4, 0.3, 1.0, allCourses));
        students.add(createStudentWithProfile("devils_advocate", "Devil's Advocate", 
                0.4, 0.3, 0.3, 0.4, 0.4, 0.3, 1.0, allCourses));
        students.add(createStudentWithProfile("rebel_rachel", "Rebel Rachel", 
                0.5, 0.3, 0.3, 0.5, 0.4, 0.3, 1.0, allCourses));
        students.add(createStudentWithProfile("contrarian_carl", "Contrarian Carl", 
                0.4, 0.3, 0.4, 0.4, 0.3, 0.3, 1.0, allCourses));
        students.add(createStudentWithProfile("questioner_quinn", "Questioner Quinn", 
                0.3, 0.3, 0.5, 0.4, 0.4, 0.3, 1.0, allCourses));
        
        // 15 Balanced/Mixed students
        students.add(createStudentWithProfile("average_joe", "Average Joe", 
                0.5, 0.5, 0.5, 0.5, 0.5, 0.6, 0.5, allCourses));
        students.add(createStudentWithProfile("general_kenobi", "General Kenobi", 
                0.6, 0.5, 0.5, 0.4, 0.6, 0.5, 0.5, allCourses));
        students.add(createStudentWithProfile("balanced_betty", "Balanced Betty", 
                0.5, 0.6, 0.5, 0.5, 0.6, 0.6, 0.4, allCourses));
        students.add(createStudentWithProfile("moderate_mike", "Moderate Mike", 
                0.5, 0.5, 0.6, 0.5, 0.5, 0.6, 0.5, allCourses));
        students.add(createStudentWithProfile("versatile_vicky", "Versatile Vicky", 
                0.6, 0.5, 0.5, 0.5, 0.6, 0.6, 0.5, allCourses));
        students.add(createStudentWithProfile("flexible_frank", "Flexible Frank", 
                0.5, 0.6, 0.5, 0.5, 0.5, 0.7, 0.4, allCourses));
        students.add(createStudentWithProfile("neutral_nancy", "Neutral Nancy", 
                0.5, 0.5, 0.5, 0.5, 0.6, 0.6, 0.5, allCourses));
        students.add(createStudentWithProfile("standard_stan", "Standard Stan", 
                0.5, 0.6, 0.6, 0.5, 0.5, 0.6, 0.4, allCourses));
        students.add(createStudentWithProfile("regular_rita", "Regular Rita", 
                0.5, 0.5, 0.5, 0.6, 0.6, 0.6, 0.5, allCourses));
        students.add(createStudentWithProfile("typical_tim", "Typical Tim", 
                0.6, 0.5, 0.5, 0.5, 0.5, 0.6, 0.5, allCourses));
        students.add(createStudentWithProfile("common_claire", "Common Claire", 
                0.5, 0.6, 0.5, 0.5, 0.6, 0.6, 0.4, allCourses));
        students.add(createStudentWithProfile("ordinary_oscar", "Ordinary Oscar", 
                0.5, 0.5, 0.6, 0.5, 0.5, 0.6, 0.5, allCourses));
        students.add(createStudentWithProfile("median_molly", "Median Molly", 
                0.5, 0.5, 0.5, 0.6, 0.6, 0.7, 0.4, allCourses));
        students.add(createStudentWithProfile("normal_ned", "Normal Ned", 
                0.6, 0.5, 0.5, 0.5, 0.5, 0.6, 0.5, allCourses));
        students.add(createStudentWithProfile("everyday_emma", "Everyday Emma", 
                0.5, 0.6, 0.5, 0.5, 0.6, 0.7, 0.4, allCourses));
        
        log.info("Created {} students with characteristic profiles", students.size());
        return students;
    }
    
    private User createStudentWithProfile(String username, String fullName,
            double leader, double planner, double expert, double creative,
            double communicator, double teamPlayer, double challenger,
            List<Course> allCourses) {
        
        // Check if student already exists
        Optional<User> existingStudent = userRepository.findByUsername(username);
        if (existingStudent.isPresent()) {
            log.debug("Student {} already exists. Skipping.", username);
            return existingStudent.get();
        }
        
        // Create user
        User student = new User();
        student.setUsername(username);
        student.setEmail(username + "@studybuddy.edu");
        student.setPassword(passwordEncoder.encode("test123"));
        student.setFullName(fullName);
        student.setRole(Role.USER);
        student.setIsActive(true);
        student.setIsEmailVerified(true); // Demo users are pre-verified
        student.setIsDeleted(false);
        student.setOnboardingCompleted(false); // Students need onboarding
        student.setProficiencyLevel("intermediate");
        student.setCollaborationStyle("balanced");
        student.setTopicsOfInterest(new ArrayList<>(List.of("Technology", "Mathematics", "Psychology")));
        student.setPreferredLanguages(new ArrayList<>(List.of("English")));
        User savedStudent = userRepository.save(student);
        
        // Randomly enroll in 1-3 courses
        java.util.Random random = new java.util.Random();
        int numCourses = random.nextInt(3) + 1; // 1-3 courses
        List<Course> shuffledCourses = new ArrayList<>(allCourses);
        java.util.Collections.shuffle(shuffledCourses);
        for (int i = 0; i < numCourses && i < shuffledCourses.size(); i++) {
            Course course = shuffledCourses.get(i);
            if (course != null && !savedStudent.getCourses().contains(course)) {
                savedStudent.getCourses().add(course);
            }
        }
        savedStudent = userRepository.save(savedStudent);
        
        // Create characteristic profile (only if doesn't exist)
        CharacteristicProfile existingProfile = characteristicProfileRepository.findByUserId(savedStudent.getId()).orElse(null);
        if (existingProfile == null) {
            CharacteristicProfile profile = CharacteristicProfile.builder()
                    .user(savedStudent)
                    .roleScores(new java.util.HashMap<>())
                    .quizStatus(com.studybuddy.quiz.model.QuizStatus.COMPLETED)
                    .totalQuestions(20)
                    .answeredQuestions(20)
                    .reliabilityPercentage(1.0)
                    .build();
            
            profile.setRoleScore(RoleType.LEADER, leader);
            profile.setRoleScore(RoleType.PLANNER, planner);
            profile.setRoleScore(RoleType.EXPERT, expert);
            profile.setRoleScore(RoleType.CREATIVE, creative);
            profile.setRoleScore(RoleType.COMMUNICATOR, communicator);
            profile.setRoleScore(RoleType.TEAM_PLAYER, teamPlayer);
            profile.setRoleScore(RoleType.CHALLENGER, challenger);
            
            characteristicProfileRepository.save(profile);
        }
        
        return savedStudent;
    }
    
    /**
     * Create 10 study groups with intentional role deficits.
     */
    private void createStudyGroupsWithDeficits(List<User> allStudents, Course cs101, Course linearAlgebra, Course psychology, Course economics) {
        // Group 1: "The Headless Horsemen" - Missing Leader (has planners, experts, no leader)
        List<User> group1Members = getStudentsByNames(allStudents, List.of("penny_planner", "orson_organizer", "sheldon_cooper", "brainiac_bob"));
        createGroupWithMembers("The Headless Horsemen", "We have great ideas but no direction.", cs101, group1Members);
        
        // Group 2: "Chaos Theory" - Missing Planner (has leaders, creatives, no planner)
        List<User> group2Members = getStudentsByNames(allStudents, List.of("leo_leader", "captain_kirk", "davinci", "picasso"));
        createGroupWithMembers("Chaos Theory", "We meet but never get anything done.", cs101, group2Members);
        
        // Group 3: "The Echo Chamber" - Missing Challenger (all agreeable, no challenger)
        List<User> group3Members = getStudentsByNames(allStudents, List.of("chatty_cathy", "peaceful_pete", "balanced_betty", "common_claire"));
        createGroupWithMembers("The Echo Chamber", "We all agree on everything.", linearAlgebra, group3Members);
        
        // Group 4: "Silent Study" - Missing Communicator (experts, no communicator)
        List<User> group4Members = getStudentsByNames(allStudents, List.of("sheldon_cooper", "genius_gina", "scholar_steve", "average_joe"));
        createGroupWithMembers("Silent Study", "Nobody talks.", linearAlgebra, group4Members);
        
        // Group 5: "All Chiefs No Indians" - Missing Team Player (all leaders, no team player)
        List<User> group5Members = getStudentsByNames(allStudents, List.of("boss_betty", "chief_charlie", "director_dan", "major_mary"));
        createGroupWithMembers("All Chiefs No Indians", "Too many leaders, no work done.", psychology, group5Members);
        
        // Group 6: "Dreamers United" - Missing Expert (creatives, no expert)
        List<User> group6Members = getStudentsByNames(allStudents, List.of("davinci", "creative_cara", "innovator_ivan", "visionary_vera"));
        createGroupWithMembers("Dreamers United", "Great ideas, no technical depth.", psychology, group6Members);
        
        // Group 7: "Yes Men" - Missing Challenger (all team players, no challenger)
        List<User> group7Members = getStudentsByNames(allStudents, List.of("peaceful_pete", "mediator_mike", "diplomat_diana", "flexible_frank"));
        createGroupWithMembers("Yes Men", "Everyone agrees, no critical thinking.", economics, group7Members);
        
        // Group 8: "The Thinkers" - Missing Creative (experts, planners, no creative)
        List<User> group8Members = getStudentsByNames(allStudents, List.of("professor_x", "penny_planner", "scheduler_sam", "brainiac_bob"));
        createGroupWithMembers("The Thinkers", "Logical but lacking innovation.", economics, group8Members);
        
        // Group 9: "The Talkers" - Balanced but small (needs more variety)
        List<User> group9Members = getStudentsByNames(allStudents, List.of("speaker_sarah", "chatty_cathy", "general_kenobi"));
        createGroupWithMembers("The Talkers", "Good communication, need more skills.", cs101, group9Members);
        
        // Group 10: "Mixed Bag" - Random composition (moderately balanced)
        List<User> group10Members = getStudentsByNames(allStudents, List.of("moderate_mike", "versatile_vicky", "standard_stan", "typical_tim"));
        createGroupWithMembers("Mixed Bag", "Decent balance, room for improvement.", linearAlgebra, group10Members);
        
        log.info("Created 10 study groups with intentional role deficits");
    }
    
    private List<User> getStudentsByNames(List<User> allStudents, List<String> usernames) {
        List<User> result = new ArrayList<>();
        for (String username : usernames) {
            allStudents.stream()
                .filter(s -> s.getUsername().equals(username))
                .findFirst()
                .ifPresent(result::add);
        }
        return result;
    }
    
    private void createGroupWithMembers(String name, String description, Course course, List<User> members) {
        if (members.isEmpty()) {
            log.warn("Cannot create group {} - no members provided", name);
            return;
        }
        
        User creator = members.get(0);
        
        // Check if group already exists
        List<StudyGroup> existingGroups = studyGroupRepository.findByCreatorId(creator.getId());
        boolean groupExists = existingGroups.stream()
            .anyMatch(g -> name.equals(g.getName()) && course != null && course.equals(g.getCourse()));
        if (groupExists) {
            log.debug("Group {} already exists. Skipping.", name);
            return;
        }
        
        // Ensure all members are enrolled in the course
        for (User member : members) {
            if (member != null && course != null && !member.getCourses().contains(course)) {
                member.getCourses().add(course);
                userRepository.save(member);
            }
        }
        
        // Use existing createStudyGroup and addMemberToGroup methods
        StudyGroup group = createStudyGroup(name, description, "Group Study", course, creator, 8);
        
        // Add remaining members (skip first since creator is already added)
        for (int i = 1; i < members.size(); i++) {
            if (members.get(i) != null) {
                addMemberToGroup(group, members.get(i));
            }
        }
        
        log.info("Created group: {} with {} members", name, members.size());
    }
}

