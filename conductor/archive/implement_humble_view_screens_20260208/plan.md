# Implementation Plan: Implement Humble View Screens

## Phase 1: Theatrical Input Proxy (The Lock) [checkpoint: 8988bd7]
*Goal: Allow the system to seize control of input for animations without the UI knowing.*

- [x] Task: Update `InputContext` to support locking
    - [x] Add `isLocked` state to `InputContextType` and `InputProvider`.
    - [x] Update `setOnInput` and `setOnKeyPress` logic to respect `isLocked`.
    - [x] Expose `setInputLocked` (internal or via SystemState) to allow locking.
- [x] Task: Create `TheatricalInputLock` Service
    - [x] Implement a service/controller that listens to `PRESENTATION_START` and `PRESENTATION_END` events on the `SimulationBus`.
    - [x] Wiring: This service should call `setInputLocked(true)` on start and `false` on end.
- [x] Task: Conductor - User Manual Verification 'Theatrical Input Proxy' (Protocol in workflow.md)

## Phase 2: Command Coordinator (The Brain) [checkpoint: 3a29397]
*Goal: Centralize command execution flow to support theatrical triggers.*

- [x] Task: Create `CommandCoordinator`
    - [x] Implement `src/interface-adapters/controllers/CommandCoordinator.ts`.
    - [x] Inject `ExecuteCommand` (Domain) and `PresentationDirector` (Service).
    - [x] Implement `execute(input: string)` method that parses input, triggers presentation, and then executes domain command.
- [x] Task: Integrate Coordinator into `TerminalViewModel`
    - [x] Replace direct `commandExecutor.execute()` calls with `CommandCoordinator.execute()`.
- [x] Task: Conductor - User Manual Verification 'Command Coordinator' (Protocol in workflow.md)

## Phase 3: Theatrical Canvas Plugin (The Show) [checkpoint: 73e5aff]
*Goal: Move animation logic into a standalone, scrappable component.*

- [x] Task: Create `TheatricalCanvas`
    - [x] Implement `src/frameworks-drivers/ui/components/theatrical/TheatricalCanvas.tsx`.
    - [x] Implement internal `requestAnimationFrame` loop or Animated API logic driven ONLY by `SimulationBus` events.
    - [x] Move logic from `MainframeOverlay.tsx` into this new component.
- [x] Task: Clean up `MainframeOverlay`
    - [x] Remove animation logic from `MainframeOverlay`. It should now just be a container or basic HUD.
- [x] Task: Conductor - User Manual Verification 'Theatrical Canvas Plugin' (Protocol in workflow.md)

## Phase 4: Humble Screen Refactor (The Amputation)
*Goal: Ensure UI components are pure and logic-free.*

- [x] Task: Refactor `TerminalScreen` & `ShellScreen`
    - [x] Audit `TerminalScreen.tsx` and `ShellScreen.tsx`.
    - [x] Move any remaining state calculation or side-effects to `TerminalViewModel`.
    - [x] Ensure they strictly consume props/hooks and render.
- [x] Task: Refactor `VimScreen` & `VimEditor`
    - [x] Audit `VimScreen.tsx` and `VimEditor.tsx`.
    - [x] Ensure input handling is delegated to `useHeadlessVim` (which should use `InputContext`).
    - [x] Remove any local buffering logic.
- [x] Task: Refactor `BufferScreen` & `CommsPane`
    - [x] Audit `BufferScreen.tsx` and `CommsPane.tsx`.
    - [x] Extract any inline filtering or data processing to their respective ViewModels.
- [x] Task: Conductor - User Manual Verification 'Humble Screen Refactor' (Protocol in workflow.md)
