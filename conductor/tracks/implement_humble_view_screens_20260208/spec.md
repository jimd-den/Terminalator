# Track Specification: Implement Humble View Screens (Central Nervous System Decoupling)

## Overview
This track executes the "Amputation" phase of the Clean Architecture refactor. The goal is to completely decouple the React presentation layer (`screens/`) from the domain logic and state management. We will implement an Input Proxy to handle animation interruptions, a Command Coordinator to orchestrate logic flow, and a standalone Theatrical Canvas. Finally, we will refactor all primary screens (`TerminalScreen`, `VimScreen`, `BufferScreen`, `CommsPane`) into "Humble Views" that receive only data, containing zero business logic.

## Functional Requirements

### 1. Theatrical Input Proxy (Step A)
- **Input Locking:** Modify `InputContext` to support a `locked` state managed by the system.
- **Hook Integration:** Expose `isLocked` via `useSystemState` or `useInput` to allow services (like the Animation Director) to seize input control.
- **Behavior:** When locked, `InputContext` must ignore user keystrokes, preventing them from reaching any screen logic.

### 2. Command Coordinator (Step B)
- **Orchestration:** Create `src/interface-adapters/controllers/CommandCoordinator.ts`.
- **Logic Flow:**
    1. Parse input.
    2. Trigger Theatrical Presentation (via `PresentationDirector`).
    3. Execute Domain Command (via `ExecuteCommand`).
    4. Return result.
- **Decoupling:** `TerminalViewModel` will call `CommandCoordinator.execute()` instead of calling `commandExecutor` directly.

### 3. Theatrical Canvas Plugin (Step C)
- **Component:** Create `src/frameworks-drivers/ui/components/theatrical/TheatricalCanvas.tsx`.
- **Independence:** This component must NOT import from ViewModels or screen logic.
- **Event-Driven:** It subscribes solely to `SimulationBus` events (`PRESENTATION_START`, `PRESENTATION_END`, `TUTOR_EVENT`).
- **Animation Loop:** Manages its own `requestAnimationFrame` loop, independent of React renders.

### 4. Humble Screen Refactor (Step D)
- **Target Components:** `TerminalScreen.tsx`, `VimScreen.tsx` (and `VimEditor.tsx`), `BufferScreen.tsx`, `CommsPane.tsx`.
- **Pure Components:** Refactor these components to be pure functions of their props.
- **No Logic:** Remove `useEffect` hooks related to cursor blinking, input buffering, mode state sync, or command parsing from these files.
- **ViewModel Responsibility:** Move all view-state logic (scrolling calculations, buffer formatting, filtering) into their respective ViewModels.

## Non-Functional Requirements
- **Scrappability:** The `TheatricalCanvas` must be deletable without breaking functionality.
- **Strict Boundaries:** No imports from `frameworks-drivers` into `interface-adapters` or `domain`.
- **Testability:** ViewModels must be testable in a pure Node environment.

## Acceptance Criteria
- [ ] `InputContext` handles locking correctly.
- [ ] `CommandCoordinator` orchestrates animation and execution.
- [ ] `TheatricalCanvas` plays animations based on events.
- [ ] All scoped screens (`Terminal`, `Vim`, `Buffer`, `Comms`) are "Humble Views" with no business logic.
- [ ] Removing the animation layer does not break the app.

## Out of Scope
- Adding new animations.
