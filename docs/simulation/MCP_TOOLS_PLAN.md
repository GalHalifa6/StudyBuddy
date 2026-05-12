# MCP Tools Plan

## Purpose

This document maps simulated student actions to explicit StudyBuddy interaction tools.

The runtime should not rely on free-form text to pretend that something happened.
Instead, the chosen action should execute through a narrow, structured tool surface.

## Why MCP Tools Matter

Explicit tools make the simulation:

- realistic
- measurable
- auditable
- safe to validate
- easier to evolve over time

They also keep the master prompt focused on decision quality instead of low-level system mechanics.

## Tool Design Principles

- Tools should mirror StudyBuddy-native capabilities.
- Tools should return structured JSON.
- Tools should enforce permission checks in the host.
- Tools should be narrow and composable.
- Tools should support repeated simulation turns safely.

## Tool Families

### Group Discovery Tools

- `list_courses(student_id, filters?)`
- `get_course_details(student_id, course_id)`
- `enroll_in_course(student_id, course_id)`
- `unenroll_from_course(student_id, course_id)`
- `list_recommended_groups(student_id, filters?)`
- `list_course_groups(student_id, course_id)`
- `get_group_details(student_id, group_id)`
- `list_group_messages(student_id, group_id, limit?)`

### Membership Tools

- `join_open_group(student_id, group_id)`
- `request_join_group(student_id, group_id, message?)`
- `leave_group(student_id, group_id)`

### Group Communication Tools

- `send_group_message(student_id, group_id, content)`
- `pin_group_message(student_id, message_id)`
- `delete_group_message(student_id, message_id)`
- `mark_group_read(student_id, group_id)`
- `share_group_resource(student_id, group_id, resource_ref, message?)`

### Direct Messaging Tools

- `list_conversations(student_id)`
- `list_direct_messages(student_id, conversation_id)`
- `send_direct_message(student_id, conversation_id, content)`
- `mark_conversation_read(student_id, conversation_id)`

### Event Tools

- `list_events(student_id, scope?)`
- `list_group_events(student_id, group_id)`
- `create_group_event(student_id, group_id, event_payload)`
- `update_group_event(student_id, event_id, event_payload)`
- `delete_group_event(student_id, event_id)`

### Expert Support Tools

- `list_experts(student_id, filters?)`
- `list_available_expert_sessions(student_id, filters?)`
- `get_expert_profile(student_id, expert_id)`
- `join_session(student_id, session_id)`
- `leave_session(student_id, session_id)`
- `list_session_messages(student_id, session_id)`
- `send_session_message(student_id, session_id, content)`
- `ask_expert_question(student_id, expert_id, payload)`
- `list_public_questions(student_id, filters?)`
- `list_my_questions(student_id)`
- `upvote_question(student_id, question_id)`
- `mark_question_helpful(student_id, question_id)`
- `follow_up_on_question(student_id, question_id, payload)`
- `request_expert_session(student_id, expert_id, payload)`
- `list_my_session_requests(student_id)`
- `cancel_session_request(student_id, request_id)`
- `rate_session(student_id, session_id, payload)`

### Topic Tools

- `list_topics(student_id)`
- `list_my_topics(student_id)`
- `follow_topic(student_id, topic_id)`
- `unfollow_topic(student_id, topic_id)`

### Awareness Tools

- `list_notifications(student_id)`
- `get_unread_summary(student_id)`

## Suggested Tool Response Shape

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "timestamp": "2026-03-31T12:00:00Z"
  }
}
```

## Action To Tool Mapping

| Action | Tool |
| --- | --- |
| `view_courses` | `list_courses` |
| `view_course_details` | `get_course_details` |
| `enroll_in_course` | `enroll_in_course` |
| `unenroll_from_course` | `unenroll_from_course` |
| `view_recommended_groups` | `list_recommended_groups` |
| `view_course_groups` | `list_course_groups` |
| `view_group_details` | `get_group_details` |
| `view_group_messages` | `list_group_messages` |
| `join_open_group` | `join_open_group` |
| `request_join_group` | `request_join_group` |
| `leave_group` | `leave_group` |
| `send_group_message` | `send_group_message` |
| `pin_group_message` | `pin_group_message` |
| `delete_own_group_message` | `delete_group_message` |
| `mark_group_read` | `mark_group_read` |
| `view_conversations` | `list_conversations` |
| `view_direct_messages` | `list_direct_messages` |
| `send_direct_message` | `send_direct_message` |
| `mark_direct_conversation_read` | `mark_conversation_read` |
| `share_resource_in_group` | `share_group_resource` |
| `view_events` | `list_events` |
| `create_group_event` | `create_group_event` |
| `update_group_event` | `update_group_event` |
| `delete_group_event` | `delete_group_event` |
| `view_experts` | `list_experts` |
| `view_expert_sessions` | `list_available_expert_sessions` |
| `view_expert_profile` | `get_expert_profile` |
| `join_session` | `join_session` |
| `leave_session` | `leave_session` |
| `view_session_messages` | `list_session_messages` |
| `send_session_message` | `send_session_message` |
| `ask_expert_question` | `ask_expert_question` |
| `view_public_questions` | `list_public_questions` |
| `view_my_questions` | `list_my_questions` |
| `upvote_question` | `upvote_question` |
| `mark_question_helpful` | `mark_question_helpful` |
| `follow_up_on_question` | `follow_up_on_question` |
| `request_expert_session` | `request_expert_session` |
| `view_my_session_requests` | `list_my_session_requests` |
| `cancel_session_request` | `cancel_session_request` |
| `rate_session` | `rate_session` |
| `view_topics` | `list_topics` |
| `view_my_topics` | `list_my_topics` |
| `follow_topic` | `follow_topic` |
| `unfollow_topic` | `unfollow_topic` |
| `view_notifications` | `list_notifications` |

## Runtime Flow

1. Host computes allowed actions.
2. Prompt chooses one next action.
3. Host maps the action to the matching MCP tool.
4. MCP tool validates and executes.
5. Host records the result and updates state.

## Later Extensions

Possible later tools:

- direct messages
- file upload
- event attendance intent
- message reactions
- question voting
- post-session feedback

These should only be added when the simulation host and platform behavior are ready to support them cleanly.
