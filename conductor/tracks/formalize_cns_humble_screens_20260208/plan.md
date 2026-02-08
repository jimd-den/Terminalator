# Implementation Plan: Formalize Central Nervous System & Humble Screens

## Phase 1: Simulation Mediator & Bus Events [checkpoint: b899d43]
*Goal: Establish the central authority and the event-based communication protocol.*

- [x] Task: Update `SimulationBus` Interface
    - [x] Add `.once()` or `.waitFor()` method to `SimulationBus` to support awaitable events.
    - [x] Verify existing bus implementation supports this.
- [x] Task: Create `SimulationMediator`
    - [x] Implement `src/core/presentation/SimulationMediator.ts`.
    - [x] Implement `executeWithTheatre(command: string)` logic:
        1. Emit `THEATRE_ACTIVE`.
        2. Call `PresentationDirector.present()`.
        3. Await `ANIMATION_COMPLETE`.
        4. Delegate to `CommandCoordinator` (or Executor).
        5. Emit `THEATRE_COMPLETE`.
- [x] Task: Conductor - User Manual Verification 'Simulation Mediator' (Protocol in workflow.md)

## Phase 2: Awaitable Animation Refactor
*Goal: Ensure animations drive the timing, not hardcoded timeouts.*

- [ ] Task: Update `TheatricalCanvas`
    - [ ] Refactor animation logic to emit `ANIMATION_COMPLETE` via the bus when the animation finishes.
- [ ] Task: Update `PresentationDirector`
    - [ ] Remove hardcoded `setTimeout`.
    - [ ] Ensure it correctly triggers the Canvas via the bus.
- [ ] Task: Conductor - User Manual Verification 'Awaitable Animation' (Protocol in workflow.md)

## Phase 3: Theatrical Input Proxy (Humble Gating)
*Goal: Implement the lock using event observation.*

- [ ] Task: Update `useTheatricalInputLock`
    - [ ] Refactor to listen for `THEATRE_ACTIVE` and `THEATRE_COMPLETE` instead of `PRESENTATION_START/END`.
    - [ ] Ensure it correctly toggles the `InputContext` locked state.
- [ ] Task: Verify Input Locking
    - [ ] Ensure keyboard input is ignored during the "active" window.
- [ ] Task: Conductor - User Manual Verification 'Input Proxy' (Protocol in workflow.md)

## Phase 4: Humble View Refactor (Key Handling)
*Goal: Move all key interpretation to the ViewModel.*

- [ ] Task: Update `TerminalViewModel`
    - [ ] Add `handleKeyPress(key: string)` method.
    - [ ] Move "Enter" logic (and other mappings) from `ShellScreen` to this method.
- [ ] Task: Refactor `ShellScreen` & `TerminalScreen`
    - [ ] Update these components to simply forward key events to the ViewModel's handler.
    - [ ] Remove any local key mapping logic.
- [ ] Task: Conductor - User Manual Verification 'Humble View Refactor' (Protocol in workflow.md)
