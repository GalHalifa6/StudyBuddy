# System Changes Required

## Purpose

This document lists the system changes needed to support a realistic StudyBuddy student-agent runtime.

The current platform already provides strong foundations:

- users and profiles
- characteristic roles and reliability
- study groups and messaging
- events
- expert questions and sessions
- notifications

To support simulation cleanly, a few additional concepts should be introduced or formalized.

## Required Changes

### 1. Academic Year Support

The simulation requires `academic_year` because behavior and course assignment depend on year.

Current gap:

- the current `User` model does not appear to store academic year

Recommended approach:

- keep `academic_year` in a simulation-specific profile unless the product also wants to expose it to real users

### 2. Simulation Profile Layer

The runtime needs traits that do not naturally belong in the current user entity.

Needed traits:

- initiative
- help-seeking tendency
- stress sensitivity
- activity frequency
- delay tolerance
- conscientiousness
- exam anxiety

Recommended approach:

- introduce a `StudentSimulationProfile` object or table
- keep it linked to the student identity
- do not overload the core `User` entity with all runtime-only traits

### 3. Structured Course Timeline Data

The runtime expects structured academic timelines, including:

- lecture
- practice
- assignment publish
- assignment due
- exam
- optional review session

Recommended approach:

- maintain a structured course timeline JSON schema
- map the most important entries into StudyBuddy events where appropriate

### 4. Runtime Action Validation Layer

The host should validate every chosen action before execution.

Needed capabilities:

- action allowlist per turn
- target visibility validation
- membership validation
- duplicate request protection
- cooldown / spam checks

### 5. MCP Tool Surface

The agent runtime assumes a narrow tool interface for StudyBuddy actions.

Needed tool families:

- group discovery
- group membership
- group messaging
- event viewing and creation
- expert browsing and escalation
- notifications

### 6. Prompt Input Builder

The system needs a reliable way to assemble injected runtime context.

Needed input blocks:

- student profile
- academic context
- social context
- platform context
- scenario context
- allowed actions

### 7. Simulation Memory And Metrics

The runtime should remember enough to avoid stateless, repetitive behavior.

Needed data:

- recent actions
- recent failures and successes
- recent messages seen
- recent join approvals or rejections
- per-turn token usage
- per-action outcomes

## Priority Order

Recommended implementation order:

1. define simulation profile schema
2. define action catalog and MCP tool surface
3. define prompt input builder
4. add structured course timeline data
5. add runtime validation layer
6. add memory and metrics support

## Summary

The most important new system concepts are:

- `academic_year`
- `StudentSimulationProfile`
- structured course timeline data
- action validation
- StudyBuddy MCP tools
- prompt input builder
