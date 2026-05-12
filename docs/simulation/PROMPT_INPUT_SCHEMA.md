# Prompt Input Schema

## Purpose

This document defines the canonical injected payload shape for one student-agent turn.

The master prompt should stay mostly fixed.
The changing student, timeline, and platform state should be injected at runtime using this schema.

This document is the bridge between:

- `AGENT_RUNTIME_DESIGN.md`
- `MASTER_PROMPT_TEMPLATE.md`
- `RUNTIME_EXAMPLE.md`

## Core Principle

The prompt is the policy.
The injected payload is the state.

The runtime should not hardcode changing world data inside the prompt itself.
Instead, each prompt call should receive one structured input payload.

## Top-Level Shape

```json
{
  "student_profile": {},
  "academic_context": {},
  "social_context": {},
  "platform_context": {},
  "scenario_context": {},
  "allowed_actions": [],
  "rule_context": {}
}
```

## 1. `student_profile`

Describes who the student is and how they tend to behave.

Suggested fields:

- `student_id`
- `display_name`
- `academic_year`
- `proficiency_level`
- `dominant_role`
- `role_scores`
- `reliability_score`
- `collaboration_style`
- `initiative_level`
- `help_seeking_tendency`
- `stress_sensitivity`
- `social_confidence`
- `activity_frequency`
- `delay_tolerance`
- `conscientiousness`
- `strong_topics`
- `weak_topics`
- `workload_tolerance`
- `exam_anxiety`

Notes:

- `role_scores` should use the existing 7-role StudyBuddy model.
- `dominant_role` should be derived from the score vector.
- the role vector should be treated as a blend, not as a hard type.
- the highest role score is the primary behavioral bias
- the next strongest roles act as modifiers
- low scores reduce tendency but do not remove capability

### Example `student_profile`

```json
{
  "student_id": "student_102",
  "display_name": "Noa Levi",
  "academic_year": 2,
  "proficiency_level": "intermediate",
  "dominant_role": "PLANNER",
  "role_scores": {
    "LEADER": 0.42,
    "PLANNER": 0.88,
    "EXPERT": 0.51,
    "CREATIVE": 0.37,
    "COMMUNICATOR": 0.63,
    "TEAM_PLAYER": 0.71,
    "CHALLENGER": 0.29
  },
  "reliability_score": 0.84,
  "collaboration_style": "balanced",
  "initiative_level": 0.62,
  "help_seeking_tendency": 0.58,
  "stress_sensitivity": 0.69,
  "social_confidence": 0.55,
  "activity_frequency": 0.61,
  "delay_tolerance": 0.33,
  "conscientiousness": 0.82,
  "strong_topics": ["Linear Algebra", "Probability"],
  "weak_topics": ["Proof Writing"],
  "workload_tolerance": 0.64,
  "exam_anxiety": 0.71
}
```

## 2. `academic_context`

Describes what is academically true right now for this student.

Suggested fields:

- `enrolled_courses`
- `pending_assignments`
- `upcoming_exams`
- `recent_academic_signal`
- `current_workload_level`
- `priority_topics`

### Example Shape

```json
{
  "enrolled_courses": [
    {
      "course_id": "cs101",
      "course_name": "Computer Science 101"
    }
  ],
  "pending_assignments": [
    {
      "course_id": "cs101",
      "title": "Assignment 2",
      "published_at": "2026-04-01T08:00:00Z",
      "due_at": "2026-04-04T23:00:00Z"
    }
  ],
  "upcoming_exams": [],
  "recent_academic_signal": "Student opened the assignment but has not started collaboration.",
  "current_workload_level": "medium",
  "priority_topics": ["proof writing", "loops"]
}
```

## 3. `social_context`

Describes the student's current social and collaboration state inside StudyBuddy.

Suggested fields:

- `current_groups`
- `recent_messages_seen`
- `recent_join_outcomes`
- `engagement_state`
- `recent_social_signal`

### Example Shape

```json
{
  "current_groups": [],
  "recent_messages_seen": [],
  "recent_join_outcomes": [],
  "engagement_state": "isolated",
  "recent_social_signal": "No meaningful peer interaction in the last two days."
}
```

## 4. `platform_context`

Describes what opportunities and signals the platform currently exposes.

Suggested fields:

- `recommended_groups`
- `upcoming_events`
- `available_expert_sessions`
- `notifications`
- `unread_summary`

### Example Shape

```json
{
  "recommended_groups": [
    {
      "group_id": "group_18",
      "group_name": "CS101 Assignment Circle",
      "match_score": 0.86,
      "visibility": "request",
      "current_size": 4,
      "max_size": 6,
      "activity_level": "active"
    }
  ],
  "upcoming_events": [],
  "available_expert_sessions": [
    {
      "session_id": "session_302",
      "title": "CS101 Homework Help",
      "start_at": "2026-04-03T17:00:00Z",
      "course_id": "cs101"
    }
  ],
  "notifications": [],
  "unread_summary": {
    "has_unread": false,
    "count": 0
  }
}
```

## 5. `scenario_context`

Describes the current simulation scenario and urgency.

Suggested fields:

- `scenario_name`
- `urgency`
- `summary`
- `time_horizon`

### Example Shape

```json
{
  "scenario_name": "assignment_due_soon",
  "urgency": "high",
  "summary": "A CS101 assignment is due in three days. The student has started looking at it but is not yet socially connected to support.",
  "time_horizon": "72h"
}
```

## 6. `allowed_actions`

A strict list of actions allowed for this turn.

This is one of the most important injected fields.

The prompt must never choose an action outside this list.

### Example Shape

```json
[
  "view_recommended_groups",
  "view_group_details",
  "join_open_group",
  "request_join_group",
  "view_expert_sessions",
  "request_expert_session",
  "do_nothing"
]
```

## 7. `rule_context`

This block contains the outputs of the rule engine.

It should be injected after MCP/tool state is collected and before the prompt runs.

Suggested fields:

- `action_bias`
- `suppressed_actions`
- `cooldown_flags`
- `rule_summary`

### Example Shape

```json
{
  "action_bias": {
    "request_join_group": 0.82,
    "join_open_group": 0.74,
    "request_expert_session": 0.46,
    "do_nothing": 0.10
  },
  "suppressed_actions": [
    "send_group_message"
  ],
  "cooldown_flags": {
    "request_join_group:group_18": false,
    "request_expert_session": false
  },
  "rule_summary": "Student has no active group, assignment due soon, and relevant groups are available."
}
```

## Build Rules

The host should build this payload per turn using these rules:

- only include information the student should reasonably know
- keep the payload concise enough to avoid noisy prompt state
- include enough recent context to avoid stateless repetition
- ensure `allowed_actions` reflects current platform reality
- compute `rule_context` from the rule engine, not from the prompt

## Relationship To Other Documents

- `MASTER_PROMPT_TEMPLATE.md` defines how the prompt should use this payload
- `RUNTIME_EXAMPLE.md` shows one concrete instance of this payload
- `ALLOWED_ACTIONS.md` defines the meaning of the action names
- `RULE_ENGINE_SPEC.md` defines how `rule_context` is produced

## Summary

Use prompt injection for runtime state.
Do not hardcode changing student or platform state into the master prompt itself.
