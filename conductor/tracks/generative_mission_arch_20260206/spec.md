# Specification: Generative Mission Architecture

## Overview
To scale to millions of unique permutations, the mission system must evolve from a static "Pick-and-Place" factory to a **Recursive, Generative Engine**. This track focuses on the core simulation infrastructure: the Event Bus, the Mission Grammar Domain, and a Single Generic Strategy engine.

## Core Pillars

### 1. Mission Grammar Domain (The "What")
**Goal:** Define missions as data/grammar, not code.
*   **Components:** `MissionType`, `StepType`, `GoalType` Enums.
*   **Core Interfaces:**
    *   `StepRule`: Defines the logic for a single step (e.g., `commandMatcher`, `onComplete`).
    *   `StepTransition`: Defines what happens next (`nextStepId`, `tutorIntent`).
    *   `MissionGrammar`: The complete definition (`archetype`, `steps[]`).
*   **Concept:** A mission is a grammatical sentence: *[Action] [Object] with [Constraint]*.

### 2. Composable Mission DSL (The "How")
**Goal:** Express the Grammar via a high-level Scheme DSL.
*   **Component:** `src/domain/services/scheme/MacroExpander.ts` & `src/domain/interpreters/LispInterpreter.ts`
*   **Concept:** Use Scheme macros to generate the `MissionGrammar` data structures.
*   **Mechanism:** `(define-mission-breach "Server-A")` expands into a data object that the Generic Strategy Engine consumes.

### 3. Single Generic Strategy Engine
**Goal:** A single logic engine that runs *any* mission definition.
*   **Refactor Target:** `ComposableMissionStrategy`.
*   **Concept:** One `GenericMissionStrategy` that reads `MissionGrammar` to determine win states.
*   **Mechanism:** It subscribes to the `SimulationBus` and runs the `commandMatcher` from the current `StepRule` against the event stream.

### 4. World Patch Service (System Preparation)
**Goal:** Data-driven world generation.
*   **Component:** `WorldPatchService` (Refactor of `SystemPreparationService`).
*   **Input:** `SystemPreparationSpec` (Files, Logs, specific content).
*   **Mechanism:** Purely populates the FS based on the spec, without knowing mission logic.

### 5. Observer-Based Simulation Bus
**Goal:** Decouple execution from inspection.
*   **Component:** `SimulationBus` (New).
*   **Concept:** Every command (POSIX `awk`, RISC-V `addi`) emits a structured `GameEvent`.
