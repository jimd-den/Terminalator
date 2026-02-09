# Track Specification: Rhythm-Action Command Engine

## Overview
This track transforms the Terminalator from a text-based terminal into a high-fidelity "Cypherpunk" execution engine. We will implement a core "Rhythm Conductor" that powers two distinct experiences: the **Tutor Minigame** (Rhythm Typing) and **Theatrical Execution** (Command Animation). A persistent "Result Card" stack will visualize command history.

## Functional Requirements

### 1. Rhythm Conductor (The Shared Heartbeat)
- **Domain Service:** `src/domain/services/RhythmConductor.ts`.
- **Heartbeat:** Emits `RHYTHM_TICK` on `SimulationBus`.
- **Context Awareness:** Supports modes (e.g., `IDLE`, `TUTOR_ACTIVE`, `EXECUTION`). The beat logic/tempo might adapt based on the mode.

### 2. Tutor Mode: Typing Direction (The Guide)
- **Goal:** Communicate "What to type next" on the beat.
- **Component:** Update `MainframeOverlay` or create `TutorOverlay` to listen to `RHYTHM_TICK`.
- **Animation:** On each tick, pulse the *next character* in the ghost text or a dedicated rhythm indicator, guiding the user's typing flow.
- **Reward:** Update `MiningSession` to reward typing on the beat during Tutor Mode.

### 3. Execution Mode: Awaitable Lifecycle (The Show)
- **Goal:** Theatrical sequences for running commands (`ls`, `cat`, etc.).
- **SimulationMediator:** Orchestrate the flow:
    1. `THEATRE_ACTIVE` (Input Lock).
    2. `PRE_ANIMATION` (Scan/Processing).
    3. Execute Domain Logic.
    4. `POST_ANIMATION` (Success/Failure Glyph).
    5. `RESULT_CARD` (Push to stack).
    6. `THEATRE_COMPLETE` (Unlock).

### 4. Persistent Result Stack
- **Component:** `ResultStackView.tsx`.
- **Mechanism:** Displays finished command results as static "Cards" (Flexible Squares) below the active area.
- **Data Source:** Listens for `RESULT_CARD` events to populate its list.

### 5. Porting Core Commands
- **Strategy:** Refactor core commands (`ls`, `cat`, `grep`, `cd`, `pwd`, `mkdir`, `touch`, `rm`, `cp`, `mv`) to provide `CommandMetadata` (verb, style) for the director.

## Non-Functional Requirements
- **Visual Clarity:** The user must instantly distinguish between "Follow the Rhythm" (Tutor) and "Watch the Show" (Execution).
- **Performance:** Efficient rendering of the stack; old cards should eventually recycle or fade.

## Acceptance Criteria
- [ ] **Tutor Mode:** Typing prompts pulse on the beat.
- [ ] **Execution Mode:** `ls` triggers a distinct "Scan" animation, followed by a persistent result card.
- [ ] **Rhythm:** Both modes synchronize to the same `RhythmConductor` clock.
- [ ] **Scope:** At least 10 core commands ported to the new metadata system.

## Out of Scope
- Audio synthesis (visuals only).
