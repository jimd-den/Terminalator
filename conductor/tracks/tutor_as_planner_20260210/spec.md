# Specification: Tutor-as-Planner (GOAP Architecture)

## Overview
Transform the Tutor system from a linear mission runner into a dynamic, knowledge-restricted planning engine. Using **Goal-Oriented Action Planning (GOAP)** and a **Blackboard pattern**, the Tutor will autonomously navigate the procedurally generated world, formulating commands based on limited perception and heuristic conventions to achieve high-level goals.

## Core Pillars

### 1. The Blackboard (Perception)
*   **Component:** `TutorKnowledgeBase`.
*   **Logic:** A localized memory store distinct from the global world state. It stores "Discovered Truths" (IPs, file paths, PIDs) and "Heuristic Beliefs".
*   **Goal:** Ensure the Tutor only operates on what it has "seen" or "guessed", preventing omniscience.

### 2. The GOAP Planner (Brain)
*   **Algorithm:** Goal-Oriented Action Planning.
*   **Action Library:** Composable `ICommandStrategy` classes with specific **Preconditions** (what knowledge is needed) and **Effects** (what knowledge/state change is expected).
*   **Goal:** Generate unique, valid Unix command chains that adapt to the sandbox's layout in real-time.

### 3. The Strategy Library (Moves)
*   **Categories:**
    *   **Reconnaissance:** Scanning and mapping the grid.
    *   **Exfiltration:** Data retrieval and transport.
    *   **Privilege Escalation:** Gaining administrative control.
    *   **Sabotage:** Disruption and destruction.

### 4. Output Interpretation (Sensory Input)
*   **Component:** `SimulationOutputInterpreter`.
*   **Logic:** Uses the **Interpreter Pattern** to parse simulated `stdout`. (e.g., extracting an IP from `ifconfig` or a filename from `ls`).
*   **Feedback Loop:** Parsed data is injected back into the Blackboard, triggering the Planner to recalculate the next optimal step.

## Functional Requirements
- [ ] Implement `TutorKnowledgeBase` to track discovered entities.
- [ ] Implement `GOAPPlanner` to resolve action chains from goal states.
- [ ] Implement a library of `ICommandStrategy` formulators for Recon, Exfil, PrivEsc, and Sabotage.
- [ ] Refactor `TutorEngine` to run as an autonomous Planning Loop.
- [ ] Implement `OutputInterpreter` to translate simulation results into knowledge updates.

## Acceptance Criteria
- [ ] Tutor starts with a high-level goal (e.g., `READ(SECRET_FILE)`) but no specific path.
- [ ] Tutor successfully uses heuristics to guide the player through exploratory commands.
- [ ] No two generated mission command sequences are identical for the same sandbox configuration.
- [ ] The system remains performant during the real-time planning and interpretation cycle.

## Out of Scope
- Cross-session persistent Tutor memory.
- Collaborative multi-NPC planning.
