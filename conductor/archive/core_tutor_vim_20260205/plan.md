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

## Phase 4: Sinister Tutor & High-Fidelity Languages [checkpoint: 6aa4988]
- [x] Task: Implement `TutorSpy` Analysis Engine. fc4866e
- [x] Task: Synchronize Crash Effects with Tutor State. 3d2ede5
- [x] Task: Implement Scheme & Assembly Language Support. 8968128
- [x] Task: Create `CompilerService` / `InterpreterService`. 9c30d9d
- [x] Task: Conductor - User Manual Verification 'Sinister Tutor & High-Fidelity Languages' (Protocol in workflow.md)
