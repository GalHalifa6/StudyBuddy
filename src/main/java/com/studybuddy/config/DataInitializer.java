package com.studybuddy.config;

import com.studybuddy.model.*;
import com.studybuddy.repository.*;
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
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        // Only initialize if database is empty
        if (userRepository.count() > 0) {
            log.info("Database already contains data. Skipping initialization.");
            return;
        }

        log.info("🚀 Initializing demo data for StudyBuddy MVP...");

        // Create Users
        User admin = createAdmin();
        User expert1 = createExpert1();
        User expert2 = createExpert2();
        User student1 = createStudent1();
        User student2 = createStudent2();
        User student3 = createStudent3();

        // Create Courses
        Course calculus = createCourse("MATH101", "Calculus I", "Introduction to differential and integral calculus", "Mathematics", "Fall 2024");
        Course dataStructures = createCourse("CS201", "Data Structures", "Fundamental data structures and algorithms", "Computer Science", "Fall 2024");
        Course physics = createCourse("PHYS101", "Physics I", "Mechanics, thermodynamics, and waves", "Physics", "Fall 2024");
        Course linearAlgebra = createCourse("MATH201", "Linear Algebra", "Vectors, matrices, and linear transformations", "Mathematics", "Fall 2024");
        Course webDev = createCourse("CS301", "Web Development", "Full-stack web development with modern frameworks", "Computer Science", "Fall 2024");

        // Enroll students in courses
        enrollStudent(student1, calculus, dataStructures, physics);
        enrollStudent(student2, calculus, linearAlgebra, webDev);
        enrollStudent(student3, dataStructures, webDev, physics);

        // Create Expert Profiles
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

        // Create Study Groups
        StudyGroup calculusGroup = createStudyGroup("Calculus Study Group", 
            "Weekly study sessions for Calculus I midterm preparation", 
            "Derivatives & Integrals", calculus, student1, 8);
        addMemberToGroup(calculusGroup, student2);

        StudyGroup dsGroup = createStudyGroup("Data Structures Masters", 
            "Practice coding problems and discuss algorithm strategies", 
            "Trees & Graphs", dataStructures, student1, 6);
        addMemberToGroup(dsGroup, student3);

        StudyGroup webDevGroup = createStudyGroup("Full Stack Developers", 
            "Build projects together and share web development tips", 
            "React & Spring Boot", webDev, student2, 10);
        addMemberToGroup(webDevGroup, student3);

        StudyGroup physicsGroup = createStudyGroup("Physics Problem Solvers", 
            "Collaborative physics problem solving sessions", 
            "Mechanics", physics, student3, 5);
        addMemberToGroup(physicsGroup, student1);

        // Create Messages in Groups
        createMessage(calculusGroup, student1, "Hey everyone! Let's prepare for the midterm together. What topics should we focus on first?");
        createMessage(calculusGroup, student2, "I think we should start with derivatives - that's where most of the exam questions come from!");
        createMessage(calculusGroup, student1, "Good idea! I found some practice problems we can work through together.");

        createMessage(dsGroup, student1, "Just solved the binary tree traversal problem! The trick is using recursion properly.");
        createMessage(dsGroup, student3, "Can you share your approach? I'm stuck on the iterative solution.");
        createMessage(dsGroup, student1, "Sure! Let me explain the stack-based approach in our next session.");

        createMessage(webDevGroup, student2, "I finished setting up the React frontend. Ready to integrate with the backend!");
        createMessage(webDevGroup, student3, "Great progress! I'll handle the Spring Boot API endpoints.");

        // Create Expert Questions
        ExpertQuestion question1 = createQuestion(student1, expert1, dataStructures, dsGroup,
            "How to optimize this recursive solution?",
            "I have a recursive function for calculating Fibonacci numbers but it's too slow for large inputs. How can I optimize it without using iteration?",
            "public int fib(int n) {\n    if (n <= 1) return n;\n    return fib(n-1) + fib(n-2);\n}",
            "Java",
            new ArrayList<>(List.of("recursion", "optimization", "dynamic-programming")),
            true
        );

        ExpertQuestion question2 = createQuestion(student2, expert2, calculus, null,
            "Understanding the Chain Rule",
            "I'm struggling to understand when and how to apply the chain rule for composite functions. Can you explain with a step-by-step example?",
            null, null,
            new ArrayList<>(List.of("calculus", "derivatives", "chain-rule")),
            true
        );

        // Answer one question (expert1 answers question1)
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

        // Create Expert Sessions
        createSession(expert1, student1, dsGroup, dataStructures,
            "Algorithm Problem Solving Workshop",
            "Deep dive into dynamic programming and graph algorithms",
            "1. Review recursion basics\n2. Introduction to memoization\n3. Practice problems",
            ExpertSession.SessionType.ONE_ON_ONE,
            LocalDateTime.now().plusDays(2).withHour(14).withMinute(0),
            LocalDateTime.now().plusDays(2).withHour(15).withMinute(0)
        );

        createSession(expert2, student2, null, calculus,
            "Calculus Midterm Review",
            "Comprehensive review of derivatives and integrals for the upcoming exam",
            "1. Derivative rules review\n2. Integration techniques\n3. Practice exam problems",
            ExpertSession.SessionType.ONE_ON_ONE,
            LocalDateTime.now().plusDays(3).withHour(10).withMinute(0),
            LocalDateTime.now().plusDays(3).withHour(11).withMinute(30)
        );

        createSession(expert1, null, webDevGroup, webDev,
            "React & Spring Boot Integration Workshop",
            "Learn how to connect your React frontend with Spring Boot backend",
            "1. REST API design\n2. Axios integration\n3. Authentication flow",
            ExpertSession.SessionType.GROUP,
            LocalDateTime.now().plusDays(5).withHour(16).withMinute(0),
            LocalDateTime.now().plusDays(5).withHour(18).withMinute(0)
        );

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

    private User createAdmin() {
        User admin = new User();
        admin.setUsername("admin");
        admin.setEmail("admin@studybuddy.com");
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setFullName("System Administrator");
        admin.setRole(Role.ADMIN);
        admin.setIsActive(true);
        admin.setProficiencyLevel("advanced");
        admin.setCollaborationStyle("balanced");
        return userRepository.save(admin);
    }

    private User createExpert1() {
        User expert = new User();
        expert.setUsername("dr.cohen");
        expert.setEmail("dr.cohen@university.edu");
        expert.setPassword(passwordEncoder.encode("expert123"));
        expert.setFullName("Dr. Yossi Cohen");
        expert.setRole(Role.EXPERT);
        expert.setIsActive(true);
        expert.setProficiencyLevel("advanced");
        expert.setCollaborationStyle("discussion_heavy");
        expert.setTopicsOfInterest(new ArrayList<>(List.of("Algorithms", "Data Structures", "Software Engineering")));
        expert.setPreferredLanguages(new ArrayList<>(List.of("Hebrew", "English")));
        return userRepository.save(expert);
    }

    private User createExpert2() {
        User expert = new User();
        expert.setUsername("prof.levi");
        expert.setEmail("prof.levi@university.edu");
        expert.setPassword(passwordEncoder.encode("expert123"));
        expert.setFullName("Prof. Rachel Levi");
        expert.setRole(Role.EXPERT);
        expert.setIsActive(true);
        expert.setProficiencyLevel("advanced");
        expert.setCollaborationStyle("balanced");
        expert.setTopicsOfInterest(new ArrayList<>(List.of("Mathematics", "Calculus", "Linear Algebra")));
        expert.setPreferredLanguages(new ArrayList<>(List.of("Hebrew", "English")));
        return userRepository.save(expert);
    }

    private User createStudent1() {
        User student = new User();
        student.setUsername("sarah.student");
        student.setEmail("sarah@student.edu");
        student.setPassword(passwordEncoder.encode("student123"));
        student.setFullName("Sarah Ben-David");
        student.setRole(Role.USER);
        student.setIsActive(true);
        student.setProficiencyLevel("intermediate");
        student.setCollaborationStyle("discussion_heavy");
        student.setTopicsOfInterest(new ArrayList<>(List.of("Computer Science", "Mathematics")));
        student.setPreferredLanguages(new ArrayList<>(List.of("Hebrew", "English")));
        return userRepository.save(student);
    }

    private User createStudent2() {
        User student = new User();
        student.setUsername("david.learner");
        student.setEmail("david@student.edu");
        student.setPassword(passwordEncoder.encode("student123"));
        student.setFullName("David Mizrachi");
        student.setRole(Role.USER);
        student.setIsActive(true);
        student.setProficiencyLevel("beginner");
        student.setCollaborationStyle("quiet_focus");
        student.setTopicsOfInterest(new ArrayList<>(List.of("Web Development", "Mathematics")));
        student.setPreferredLanguages(new ArrayList<>(List.of("Hebrew")));
        return userRepository.save(student);
    }

    private User createStudent3() {
        User student = new User();
        student.setUsername("maya.coder");
        student.setEmail("maya@student.edu");
        student.setPassword(passwordEncoder.encode("student123"));
        student.setFullName("Maya Goldstein");
        student.setRole(Role.USER);
        student.setIsActive(true);
        student.setProficiencyLevel("advanced");
        student.setCollaborationStyle("balanced");
        student.setTopicsOfInterest(new ArrayList<>(List.of("Programming", "Physics", "Web Development")));
        student.setPreferredLanguages(new ArrayList<>(List.of("Hebrew", "English")));
        return userRepository.save(student);
    }

    private Course createCourse(String code, String name, String description, String faculty, String semester) {
        Course course = new Course();
        course.setCode(code);
        course.setName(name);
        course.setDescription(description);
        course.setFaculty(faculty);
        course.setSemester(semester);
        return courseRepository.save(course);
    }

    private void enrollStudent(User student, Course... courses) {
        for (Course course : courses) {
            student.getCourses().add(course);
            course.getStudents().add(student);
            courseRepository.save(course);
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
}
