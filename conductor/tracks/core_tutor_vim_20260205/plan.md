# Implementation Plan - Core Tutor-Integrated Vim Interface & IRC-Style Interaction

## Phase 1: Architecture & Vim Engine Refactor
- [x] Task: Create specific Clean Architecture directory structure for Vim Engine if not present (Entities, Use Cases, Interface Adapters). e300d79
- [x] Task: Define `IVimState` and `IVimBuffer` interfaces (Entities). e300d79
    - [ ] Write Tests: Ensure interfaces allow for text manipulation and mode switching.
    - [ ] Implement: Create core `VimState` entity.
- [x] Task: Implement `VimInputHandler` Use Case (The "IRC Tab" Logic). 2e92622
    - [ ] Write Tests: Test key press handling, mode transitions (Normal -> Insert), and command parsing.
    - [ ] Implement: Logic to handle stream of characters and update `VimState`.
- [ ] Task: Refactor existing `VimEngine` to use the new `VimInputHandler` and `VimState`.
- [ ] Task: Conductor - User Manual Verification 'Architecture & Vim Engine Refactor' (Protocol in workflow.md)

## Phase 2: Persistent Tutor Bar (UI & Logic)
- [ ] Task: Create `TutorMessage` Entity and `ITutorService` Interface.
    - [ ] Write Tests: Service can queue and retrieve messages.
    - [ ] Implement: Basic in-memory message queue.
- [ ] Task: Create `TutorBar` Component (Frameworks/Drivers).
    - [ ] Write Tests: Component renders messages from the service.
    - [ ] Implement: React Native component positioned above keyboard area. Styling: "Cold Kawaii".
- [ ] Task: Integrate `TutorService` with Global State/Context.
- [ ] Task: Conductor - User Manual Verification 'Persistent Tutor Bar' (Protocol in workflow.md)

## Phase 3: Mission Control & Navigation
- [ ] Task: Implement `MissionManager` Use Case for "Start" and "Exit" flows.
    - [ ] Write Tests: State transitions between "In Mission" and "Dashboard".
    - [ ] Implement: Logic to unload mission resources and save progress.
- [ ] Task: Add "Exit Mission" UI Control.
    - [ ] Write Tests: Button press triggers `MissionManager.exitMission()`.
    - [ ] Implement: UI button (styled discreetly but accessible) overlaying the mission view.
- [ ] Task: Conductor - User Manual Verification 'Mission Control & Navigation' (Protocol in workflow.md)

## Phase 4: Integration & "Subliminal Mastery" Connection
- [ ] Task: Connect `VimInputHandler` to `TutorService`.
    - [ ] Write Tests: Specific typing events (errors, success) trigger Tutor messages.
    - [ ] Implement: Observer pattern or Event Bus to send signals from Vim to Tutor.
- [ ] Task: Verify Assembly Typing Game runs inside new Vim Interface.
    - [ ] Write Tests: Integration test ensuring game loop receives input from Vim.
    - [ ] Implement: Wire up the components.
- [ ] Task: Conductor - User Manual Verification 'Integration & Subliminal Mastery Connection' (Protocol in workflow.md)
