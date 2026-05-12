# Rule Engine Spec

## Purpose

This document defines the rule-based layer that sits between StudyBuddy state access and LLM action selection.

The rule engine should not replace the prompt.
It should narrow, score, and structure the decision space before the prompt is called.

## Runtime Position

Recommended flow:

1. MCP/tools fetch current StudyBuddy facts
2. rule engine evaluates those facts
3. rule engine produces action constraints and guidance
4. prompt chooses one realistic next action
5. host validates and executes through MCP/tools

So:

- MCP provides facts
- rules provide decision structure
- prompt provides human-like judgment

## Why The Rule Layer Exists

Without a rule layer:

- the model must infer permissions on its own
- invalid actions become more common
- urgency handling becomes inconsistent
- students become either too random or too optimized

With a rule layer:

- allowed actions are known before the prompt runs
- scenario and urgency are computed consistently
- the prompt can focus on realism rather than system logic

## Rule Categories

### 1. Eligibility Rules

Hard yes/no rules.

Examples:

- if the student is not a member of a group, they cannot send a group message
- if a group is full, they cannot join directly
- if a join request already exists, they cannot send the same request again
- if no relevant expert session exists, session actions may be suppressed

Output effect:

- adds or removes actions from `allowed_actions`

### 2. Scenario Rules

Classify the current academic moment.

Examples:

- assignment due in <= 3 days -> `assignment_due_soon`
- exam in <= 7 days -> `midterm_preparation`
- exam in <= 2 days -> `exam_week`
- no major deadlines soon -> `low_activity_period`

Output effect:

- fills `scenario_context`

### 3. Priority / Bias Rules

Soft scoring rules.

Examples:

- no group + high match score -> boost join actions
- active group + unread messages -> boost group reading/messaging
- high help-seeking tendency -> boost expert support
- strong Planner -> boost structured actions
- strong Leader -> boost initiating actions

Output effect:

- fills `action_bias`

### 4. Cooldown Rules

Prevent unrealistic repetition.

Examples:

- do not request to join the same group every tick
- do not repeat nearly identical messages too quickly
- do not create too many events in a short time

Output effect:

- fills `cooldown_flags`
- may also suppress actions

### 5. Realism Constraints

Keep behavior believable.

Examples:

- `do_nothing` should remain possible in non-critical moments
- lower-friction actions may be boosted for low-confidence students
- the top-scored action should not always be forced

Output effect:

- modifies `action_bias`
- sometimes preserves multiple plausible options

## Rule Engine Inputs

The rule engine should consume:

- current student profile
- current course state
- current group state
- current event state
- current session state
- current notification state
- recent action history
- recent outcome history

These inputs will usually come from MCP/tool calls and host memory.

## Rule Engine Outputs

The rule engine should produce a compact block that gets injected into the prompt payload.

Suggested shape:

```json
{
  "scenario_name": "assignment_due_soon",
  "urgency": "high",
  "allowed_actions": [
    "view_recommended_groups",
    "request_join_group",
    "join_open_group",
    "view_expert_sessions",
    "request_expert_session",
    "do_nothing"
  ],
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

## Hard Rules vs Soft Rules

### Hard Rules

Must be enforced before the prompt:

- permissions
- membership requirements
- target existence
- duplicate request prevention
- action cooldown blocks

These should define `allowed_actions`.

### Soft Rules

Should influence but not dictate the final choice:

- role-based action preference
- score-based recommendation strength
- social comfort bias
- confidence/stress effects
- urgency weighting

These should define `action_bias`.

## Prompt Integration

The prompt should not receive the full rules.
It should receive the outputs of the rules.

Recommended prompt interpretation:

- `allowed_actions` = hard boundary
- `action_bias` = soft guidance
- `suppressed_actions` = avoid unless explicitly allowed
- `cooldown_flags` = action friction / constraint context

## Recommended Design Choice

Do not build one giant rule.

Instead:

- write small rule groups
- evaluate them in one orchestrator
- inject only the result into the prompt

This keeps the rule system explainable and easier to tune later.
