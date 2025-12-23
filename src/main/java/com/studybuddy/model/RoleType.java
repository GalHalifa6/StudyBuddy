package com.studybuddy.model;

/**
 * 7 distinct student roles for characteristic profiling.
 */
public enum RoleType {
    LEADER("Leader", "Takes charge and guides the team"),
    PLANNER("Planner", "Organizes tasks and schedules"),
    EXPERT("Expert", "Deep subject matter knowledge"),
    CREATIVE("Creative", "Brings innovative ideas"),
    COMMUNICATOR("Communicator", "Facilitates discussion and clarity"),
    TEAM_PLAYER("Team Player", "Supportive and cooperative"),
    CHALLENGER("Challenger", "Questions assumptions and pushes boundaries");
    
    private final String displayName;
    private final String description;
    
    RoleType(String displayName, String description) {
        this.displayName = displayName;
        this.description = description;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    public String getDescription() {
        return description;
    }
}
