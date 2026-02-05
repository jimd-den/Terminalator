# Implementation Plan - Core Tutor-Integrated Vim Interface & IRC-Style Interaction

## Phase 1: Architecture & Vim Engine Refactor [checkpoint: c99a9bf]
- [x] Task: Create specific Clean Architecture directory structure for Vim Engine if not present (Entities, Use Cases, Interface Adapters). e300d79
- [x] Task: Define `IVimState` and `IVimBuffer` interfaces (Entities). e300d79
- [x] Task: Implement `VimInputHandler` Use Case (The "IRC Tab" Logic). 2e92622
- [x] Task: Refactor existing `VimEngine` to use the new `VimInputHandler` and `VimState`. 10d877f
- [x] Task: Conductor - User Manual Verification 'Architecture & Vim Engine Refactor' (Protocol in workflow.md)

## Phase 2: Persistent Tutor Bar (UI & Logic) [checkpoint: 0e60c47]
- [x] Task: Create `TutorMessage` Entity and `ITutorMessagingService`. 35baf75
- [x] Task: Create `TutorBar` Component (Frameworks/Drivers). 2c814f2
- [x] Task: Integrate `TutorMessagingService` with Global State/Context. 32caf9a
- [x] Task: Conductor - User Manual Verification 'Persistent Tutor Bar' (Protocol in workflow.md)

## Phase 3: Mission Control & Navigation [checkpoint: d3c78a0]
- [x] Task: Implement `MissionManager` Use Case for "Start" and "Exit" flows. c6bd380
- [x] Task: Add Integrated Command Mode Actions (e.g., :exit, :mission). d3c78a0
- [x] Task: Conductor - User Manual Verification 'Mission Control & Navigation' (Protocol in workflow.md)

## Phase 4: Sinister Tutor & High-Fidelity Languages
- [x] Task: Implement `TutorSpy` Analysis Engine.
    - [ ] Write Tests: Calculate WPM, accuracy, and identify "stalls".
    - [ ] Implement: Data-driven comment generation (JSON templates) based on metrics.
- [x] Task: Synchronize Crash Effects with Tutor State.
    - [ ] Write Tests: Ensure "shake" triggers only on specific Tutor states (CRITICAL/WARN).
    - [ ] Implement: `useTutorAnimation` hook that binds UI effects to `activeTutorMessage.type`.
- [~] Task: Implement Scheme - [ ] Task: Implement Scheme & Assembly Assembly Language Support.
    - [ ] Write Tests: Syntax highlighter recognizes `.scm` and `.asm` tokens.
    - [ ] Implement: `LanguageService` with basic linting/parsing for Scheme and ASM.
- [ ] Task: Create `CompilerService` / `InterpreterService`.
    - [ ] Write Tests: "Run" a basic Scheme/ASM program and capture output.
    - [ ] Implement: Mock execution environment that simulates program behavior (exit codes, stdout).
- [ ] Task: Conductor - User Manual Verification 'Sinister Tutor & High-Fidelity Languages' (Protocol in workflow.md)