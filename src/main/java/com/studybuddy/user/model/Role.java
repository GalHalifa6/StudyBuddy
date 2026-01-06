package com.studybuddy.user.model;

/**
 * User Role Enum
 * Defines the different types of users in the StudyBuddy system
 */
public enum Role {
    USER("Regular Student"),
    EXPERT("Subject Expert"),
    ADMIN("System Administrator");

    private final String displayName;

    Role(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}
