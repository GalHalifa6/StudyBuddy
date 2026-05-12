# Allowed Actions

## Purpose

This document defines the actions a simulated student agent is allowed to take inside StudyBuddy.

The action catalog exists to ensure that:

- the LLM produces platform-native behavior
- the simulation remains valid and controllable
- actions can be mapped cleanly to tools or APIs
- runtime decisions can be measured consistently

The student agent must only choose actions from the allowed list injected for the current turn.

## Design Rules

- Actions must correspond to real or planned StudyBuddy capabilities.
- Actions should be atomic enough for validation.
- Actions should be broad enough to support realistic student behavior.
- Actions should include meaningful inaction.

## General Action Schema

```json
{
  "action_type": "join_open_group",
  "target_type": "group",
  "target_id": "group_42",
  "parameters": {},
  "urgency": "medium",
  "reason": "The student needs a study group for an upcoming midterm and this group has a high match score.",
  "message_text": null,
  "should_execute": true
}
```

## Action Set

The following actions fit the current StudyBuddy project most closely.

### Course Actions

- `view_courses`
- `view_course_details`
- `search_courses`
- `enroll_in_course`
- `unenroll_from_course`
- `view_my_courses`

### Group Discovery and Membership

- `view_recommended_groups`
- `view_group_details`
- `view_course_groups`
- `join_open_group`
- `request_join_group`
- `leave_group`
- `view_my_groups`
- `view_my_group_requests`

### Group Communication

- `view_group_messages`
- `send_group_message`
- `pin_group_message`
- `delete_own_group_message`
- `mark_group_read`
- `view_group_chat_preview`

### Direct Messaging

- `view_conversations`
- `view_direct_messages`
- `send_direct_message`
- `mark_direct_conversation_read`

### Event Actions

- `view_events`
- `view_group_events`
- `create_group_event`
- `update_group_event`
- `delete_group_event`

### Expert and Session Actions

- `view_experts`
- `view_expert_profile`
- `view_expert_sessions`
- `join_session`
- `leave_session`
- `view_session_messages`
- `send_session_message`
- `ask_expert_question`
- `view_my_questions`
- `view_public_questions`
- `upvote_question`
- `mark_question_helpful`
- `follow_up_on_question`
- `request_expert_session`
- `view_my_session_requests`
- `cancel_session_request`
- `rate_session`

### Topic and Notification Actions

- `view_topics`
- `view_my_topics`
- `follow_topic`
- `unfollow_topic`
- `view_notifications`
- `view_unread_notifications`
- `mark_notification_read`
- `mark_all_notifications_read`

### Passive Actions

- `review_context_only`
- `do_nothing`

## Core Preconditions

### `join_open_group`

- group is open
- group is not full
- student is eligible
- student is not already a member

### `request_join_group`

- group requires approval
- student is eligible
- no duplicate request exists

### `send_group_message`

- student is a member of the group
- message text exists

### `create_group_event`

- student is a member of the group
- event payload is complete enough to create an event

### `ask_expert_question`

- expert target exists
- question text exists

### `request_expert_session`

- expert target exists
- description and agenda exist
- preferred time slots exist

## High-Value Runtime Actions

Even though the project supports many actions, the student simulation should usually concentrate on the actions most useful for realistic academic behavior:

- `view_recommended_groups`
- `join_open_group`
- `request_join_group`
- `view_group_messages`
- `send_group_message`
- `view_events`
- `create_group_event`
- `view_expert_sessions`
- `ask_expert_question`
- `request_expert_session`
- `view_notifications`
- `do_nothing`

The larger action set should still be documented because the runtime may grow into it later.

## Scenario Bias

The rule engine should bias actions by scenario before the prompt is called.

### Homework Progress

Higher priority:

- `view_group_messages`
- `send_group_message`
- `share_resource_in_group`
- `create_group_event`

### Assignment Due Soon

Higher priority:

- `send_group_message`
- `create_group_event`
- `ask_expert_question`
- `request_expert_session`

### Midterm Preparation

Higher priority:

- `view_recommended_groups`
- `join_open_group`
- `request_join_group`
- `create_group_event`
- `ask_expert_question`
- `view_expert_sessions`

### Exam Week

Higher priority:

- `send_group_message`
- `ask_expert_question`
- `request_expert_session`
- `view_events`
- `join_session`

### Low Activity Period

Higher priority:

- `view_recommended_groups`
- `view_group_details`
- `review_context_only`

## Role Bias

Roles should bias action choice but not rigidly determine it.

### Leader

More likely:

- `join_open_group`
- `create_group_event`
- `send_group_message`

### Planner

More likely:

- `view_events`
- `create_group_event`
- `send_group_message`
- `review_context_only`

### Expert

More likely:

- `send_group_message`
- `share_resource_in_group`
- `ask_expert_question`

### Communicator

More likely:

- `view_group_messages`
- `send_group_message`

### Team Player

More likely:

- `send_group_message`
- `review_context_only`

### Challenger

More likely:

- `send_group_message`
- `ask_expert_question`

### Creative

More likely:

- `create_group_event`
- `send_group_message`
- `share_resource_in_group`

## Validation Requirements

Before execution, the host should validate:

- target exists
- action is still allowed
- student has permission
- required parameters are present
- message exists when needed
- action is still sensible at execution time
