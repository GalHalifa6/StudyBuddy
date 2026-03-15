package com.studybuddy.quiz.model;

/**
 * Quiz completion status for characteristic profiling.
 * 
 * - NOT_STARTED: User has not begun the quiz (requires onboarding)
 * - IN_PROGRESS: User has answered some questions but not all
 * - COMPLETED: User has answered all quiz questions
 * - SKIPPED: User chose to skip the quiz entirely
 */
public enum QuizStatus {
    NOT_STARTED("Not Started"),
    IN_PROGRESS("In Progress"),
    COMPLETED("Completed"),
    SKIPPED("Skipped");
    
    private final String displayName;
    
    QuizStatus(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    /**
     * Check if user requires onboarding.
     * Only users who haven't started need to see onboarding page.
     */
    public boolean requiresOnboarding() {
        return this == NOT_STARTED;
    }
    
    /**
     * Check if profile is reliable for matching.
     * Partial completion still provides some matching capability.
     */
    public boolean canMatch() {
        return this == IN_PROGRESS || this == COMPLETED;
    }
}
