# Agent Runtime Design

## Purpose

The student agent runtime is the decision layer that turns simulation state into believable student behavior inside StudyBuddy.

Its job is not to create generic conversation. Its job is to decide:

- what this student should do now
- why that action makes sense now
- how the student would express that action if language is needed

The runtime should stay aligned with the real StudyBuddy product model described in the ADD and reflected in the existing codebase:

- onboarding and characteristic profile
- course browsing and enrollment
- course participation
- study groups and join flows
- group chat and shared coordination
- direct messages
- events and timeline pressure
- expert questions and expert sessions
- session participation and session chat
- topic following
- notifications and awareness

## Core Runtime Question

Each simulation turn should answer one bounded question:

`Given this student, this timeline state, and these available StudyBuddy actions, what is the single most plausible next action right now?`

That constraint is important. The runtime should choose one next move, not simulate an entire day and not generate unconstrained roleplay.

## Runtime Contract

The runtime is a contract between three components:

- the simulation host
- the LLM
- StudyBuddy interaction tools

The host prepares structured context, the LLM chooses one next action, and the host validates and executes that action against StudyBuddy.

The prompt should remain mostly fixed.
The host should inject changing student, timeline, and platform state on every turn.
The rule engine should compute action constraints and bias before the prompt is called.

## Runtime Layers

### 1. World State

The host provides the current world state visible to the student.

This should include:

- current date and time
- week in semester
- active academic scenario
- course timelines
- upcoming assignments and exams
- current groups
- recommended groups and scores
- recent group activity
- upcoming events
- relevant expert sessions
- recent notifications

### 2. Student State

Each student has a simulation profile that combines StudyBuddy profile data with simulation-specific behavioral traits.

This includes:

- academic year
- proficiency level
- dominant role
- full role score vector
- reliability / confidence
- initiative level
- help-seeking tendency
- stress sensitivity
- activity level
- social confidence
- collaboration style

The role profile should be treated as a blended vector, not a hard category.
The dominant role is the strongest behavioral bias, while the next strongest roles modify how that tendency appears in action choice, pacing, and language.

### 3. Rule Engine

The rule engine narrows the decision space before the LLM is called.

It determines:

- what scenario is active
- how urgent the situation is
- what actions are legal
- what actions are currently relevant
- what actions should be suppressed
- whether cooldowns or rate limits apply

### 4. LLM Decision Layer

The LLM is responsible for realistic judgment inside the allowed space.

It decides:

- whether to act now or wait
- which valid action to choose
- how strongly to react
- how the blended role profile, level, and context should shape that action
- what language to use if a message is required

### 5. Host Execution Layer

The host validates the returned action and executes it through APIs or MCP tools.

The host then:

- records metrics
- updates simulation state
- stores memory if needed
- prepares the next turn

## Turn Objective

The objective of one turn is:

1. understand what matters now
2. identify the most plausible next action
3. stay within platform constraints
4. preserve long-term consistency for this student

## Agent Turn Loop

Each turn should follow this order:

1. Load student profile.
2. Load current platform state.
3. Detect active scenario.
4. Compute urgency.
5. Build the allowed action list.
6. Compute rule outputs such as action bias and suppressed actions.
7. Inject runtime context into the prompt.
8. Request one next action from the LLM.
9. Validate the result.
10. Execute through StudyBuddy tools.
11. Record metrics and state updates.

## Runtime Inputs

The prompt should receive only the information a realistic student would need to act.

The recommended design is:

- one fixed master prompt
- one injected payload per turn

### Student Profile

- student id
- display name
- academic year
- proficiency level
- dominant role
- role score vector
- reliability score
- collaboration style
- initiative level
- help-seeking tendency
- stress sensitivity
- activity tendency
- social confidence

### Academic Context

- enrolled courses
- course timelines
- strong topics
- weak topics
- pending assignments
- assignment publish dates
- assignment due dates
- exam dates
- recent academic struggles or wins

### Social Context

- current study groups
- membership state
- current group activity
- recent messages seen
- unanswered interactions
- recent join approvals or rejections
- isolation or engagement indicators

### Platform Context

- recommended groups and scores
- upcoming events
- available expert sessions
- relevant experts
- notifications
- unread summary

### Scenario Context

- scenario name
- urgency level
- short explanation of what matters most now

### Allowed Actions

The runtime must explicitly inject the allowed action list for the turn.

The model must never choose an action outside that list.

See `PROMPT_INPUT_SCHEMA.md` for the canonical injected payload shape.

### Rule Context

The runtime should also inject the outputs of the rule engine.

Examples:

- `action_bias`
- `suppressed_actions`
- `cooldown_flags`
- `rule_summary`

## Runtime Outputs

The prompt should return one structured action decision.

Suggested contract:

```json
{
  "action_type": "send_group_message",
  "target_type": "group",
  "target_id": "group_123",
  "urgency": "medium",
  "reason": "The student is a Year 2 planner with an assignment due in three days and has not coordinated with the group yet.",
  "message_text": "Can we split the assignment questions tonight and compare answers tomorrow?",
  "confidence": 0.81,
  "should_execute": true
}
```

## Rule Engine vs LLM Responsibility

### Rule Engine Responsibilities

The rule engine owns validity and structure.

It should:

- detect the active scenario
- calculate urgency
- determine legal actions
- remove impossible actions
- apply rate limits and cooldowns
- bias action availability by score and timeline
- suppress low-value actions during high pressure
- produce a compact `rule_context` block for the prompt

### LLM Responsibilities

The LLM owns realistic choice within the bounded space.

It should:

- choose one plausible next action from the allowed list
- reflect the blended role profile and level naturally
- allow realistic hesitation and imperfection
- decide whether to act or wait
- generate concise natural language when needed

The LLM should receive a fixed instruction set plus the injected payload, not a rewritten prompt per student.

## Allowed Actions

The current project already supports a broader action surface than the original minimal simulation draft.

The runtime can safely model actions around:

- view and enroll in courses
- view recommended groups
- view course groups
- view group details
- join open group
- request join group
- leave group
- view group messages
- send group message
- view direct messages
- send direct message
- view events
- create group event
- update or delete group event
- view experts
- view expert sessions
- view expert profile
- join session
- leave session
- send session message
- ask expert question
- view public questions
- upvote question
- request expert session
- view notifications
- mark notification read
- do nothing

See `ALLOWED_ACTIONS.md` for the full action catalog.

## MCP Tool Mapping

Each selected action should map to one StudyBuddy interaction tool.

See `MCP_TOOLS_PLAN.md` for the full tool plan.

## Role Blending Rule

The runtime should not treat students as pure role types.

Instead:

- the highest role score defines the primary tendency
- the next strongest role scores modify action preference and communication style
- low-scoring roles remain weak tendencies rather than impossible behaviors

Examples:

- a `Leader + Planner` student is more likely to initiate with structure
- a `Leader + Creative` student is more likely to initiate with alternative ideas
- a `Communicator + Team Player` student is more likely to engage warmly and sustain group cohesion

## Realism Requirements

The runtime should explicitly support realistic imperfection.

Students may:

- procrastinate
- hesitate to ask for help
- choose a socially easier option
- prefer a familiar group over the highest-score group
- delay acting under stress

Students should not:

- optimize perfectly every turn
- spam interactions
- act with knowledge they were not given
- break platform rules
