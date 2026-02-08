# Track Specification: Formalize Central Nervous System & Humble Screens

## Overview
This track refines the previously established "Component-Based Architecture" by implementing a central authority (`SimulationMediator`) to coordinate animations, input locking, and command execution. We will also harden our UI components into "Humble Views" by removing interpretive logic from the screen files and moving it to ViewModels.

## Functional Requirements

### 1. Simulation Mediator (The Authority)
- **Component:** Create `src/core/presentation/SimulationMediator.ts`.
- **Orchestration:**
    1. Receive command input from the ViewModel.
    2. Broadcast `THEATRE_ACTIVE` on the `SimulationBus` (triggers input lock in UI).
    3. Call `PresentationDirector.present()`.
    4. Await `ANIMATION_COMPLETE` event from the bus.
    5. Execute Domain Command.
    6. Broadcast `THEATRE_COMPLETE` (releases input lock in UI).

### 2. Awaitable Animation Flow
- **Director Update:** `PresentationDirector` must no longer rely on hardcoded timeouts for "Duration." It emits events and the UI (Canvas) is responsible for signaling completion.
- **Bus Interface:** Ensure `SimulationBus` supports a `.once()` or a reliable event callback mechanism for the Mediator to await completion.

### 3. Theatrical Input Proxy (Humble Gating)
- **UI Gating:** Modify `InputContext` or a higher-order hook to listen for `THEATRE_ACTIVE` and `THEATRE_COMPLETE`.
- **Behavior:** All input must be swallowed/ignored while `THEATRE_ACTIVE` is true.

### 4. Humble View Refactor
- **Terminal Screen:** Remove all `if (key === 'Enter')` or mapping logic from `TerminalScreen.tsx` and `ShellScreen.tsx`.
- **Key Forwarding:** The screens must forward all raw key events to `TerminalViewModel.handleKeyPress()`.
- **ViewModel Logic:** `TerminalViewModel` will interpret keys and call the `SimulationMediator` for execution.

## Non-Functional Requirements
- **Decoupling:** `SimulationMediator` must depend on interfaces for the Bus and Director, not concrete implementations.
- **Purity:** UI screens must contain zero `useEffect` hooks that manage domain state or logic.
- **Testability:** The command flow (from key press to execution) must be testable without React.

## Acceptance Criteria
- [ ] Command execution is preceded by a "Scan" animation that cannot be interrupted by typing.
- [ ] The terminal output only updates *after* the animation has signaled completion.
- [ ] `TerminalScreen` has no logic checks for specific keys.
- [ ] The entire flow (Lock -> Animate -> Execute -> Unlock) is verified in a unit test.

## Out of Scope
- Porting all commands to the new `TheatricalStrategy` (we will start with `ls` and `cat`).
- Visual overhaul of animations.
