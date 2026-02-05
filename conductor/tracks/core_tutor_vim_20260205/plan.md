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

## Phase 3: Mission Control & Navigation
- [ ] Task: Implement `MissionManager` Use Case for "Start" and "Exit" flows.
    - [ ] Write Tests: State transitions between "In Mission" and "Dashboard".
    - [ ] Implement: Logic to unload mission resources and save progress.
- [ ] Task: Add Integrated Command Mode Actions (e.g., :exit, :mission).
    - [ ] Write Tests: `VimSimulator` handles custom editor commands for mission control.
    - [ ] Implement: Logic in `executeCommand` to handle mission-specific signals.
- [ ] Task: Conductor - User Manual Verification 'Mission Control & Navigation' (Protocol in workflow.md)

## Phase 4: Sinister Tutor Integration & Typing Mastery
- [ ] Task: Implement `TutorSpy` Service (Monitoring Logic).
    - [ ] Write Tests: Track WPM, accuracy, and "smoothness" (typing cadence).
    - [ ] Implement: Service to calculate performance metrics from raw keystrokes.
- [ ] Task: Implement Input Suppression & Proactive Injection.
    - [ ] Write Tests: Tutor can lock/unlock `VimInputHandler` and push keys to the buffer.
    - [ ] Implement: `inputLocked` flag in `IVimState` and `pushCommand` method.
- [ ] Task: Connect `VimInputHandler` to `TutorSpy`.
    - [ ] Write Tests: Typing errors or "stutters" trigger sinister Tutor comments.
- [ ] Task: Animate `TutorBar` based on Performance.
    - [ ] Implement: Visual "glitch" or "pulse" effects in `TutorBar` reacting to metrics.
- [ ] Task: Conductor - User Manual Verification 'Sinister Tutor Integration' (Protocol in workflow.md)
