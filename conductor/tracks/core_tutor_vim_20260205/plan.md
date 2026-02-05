# Implementation Plan - Core Tutor-Integrated Vim Interface & IRC-Style Interaction

## Phase 1: Architecture & Vim Engine Refactor [checkpoint: c99a9bf]
- [x] Task: Create specific Clean Architecture directory structure for Vim Engine if not present (Entities, Use Cases, Interface Adapters). e300d79
- [x] Task: Define `IVimState` and `IVimBuffer` interfaces (Entities). e300d79
- [x] Task: Implement `VimInputHandler` Use Case (The "IRC Tab" Logic). 2e92622
- [x] Task: Refactor existing `VimEngine` to use the new `VimInputHandler` and `VimState`. 10d877f
- [x] Task: Conductor - User Manual Verification 'Architecture & Vim Engine Refactor' (Protocol in workflow.md)

## Phase 2: Persistent Tutor Bar (UI & Logic)
- [x] Task: Create `TutorMessage` Entity 35baf75 and `ITutorService` Interface.
    - [ ] Write Tests: Service can queue and retrieve messages.
    - [ ] Implement: Basic in-memory message queue.
- [x] Task: Create `TutorBar` Component (Frameworks/Drivers).
    - [ ] Write Tests: Component renders messages from the service.
    - [ ] Implement: React Native component positioned above keyboard area. Styling: "Cold Kawaii".
- [x] Task: Integrate `TutorMessagingService` with Global State/Context.
- [ ] Task: Conductor - User Manual Verification 'Persistent Tutor Bar' (Protocol in workflow.md)

## Phase 3: Mission Control & Navigation
- [ ] Task: Implement `MissionManager` Use Case for "Start" and "Exit" flows.
    - [ ] Write Tests: State transitions between "In Mission" and "Dashboard".
    - [ ] Implement: Logic to unload mission resources and save progress.
- [ ] Task: Add Integrated Command Mode Actions (e.g., :exit, :mission).
    - [ ] Write Tests: `VimSimulator` or `MissionManager` handles custom editor commands for mission control.
    - [ ] Implement: Logic in `executeCommand` to handle mission-specific signals.
- [ ] Task: Conductor - User Manual Verification 'Mission Control & Navigation' (Protocol in workflow.md)

## Phase 4: Integration & "Subliminal Mastery" Connection
- [ ] Task: Connect `VimInputHandler` to `TutorService`.
    - [ ] Write Tests: Specific typing events (errors, success) trigger Tutor messages.
    - [ ] Implement: Observer pattern or Event Bus to send signals from Vim to Tutor.
- [ ] Task: Verify Assembly Typing Game runs inside new Vim Interface.
    - [ ] Write Tests: Integration test ensuring game loop receives input from Vim.
    - [ ] Implement: Wire up the components.
- [ ] Task: Conductor - User Manual Verification 'Integration & Subliminal Mastery Connection' (Protocol in workflow.md)