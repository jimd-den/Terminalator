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

## Phase 3: Theatrical Canvas Plugin (The Show)
*Goal: Move animation logic into a standalone, scrappable component.*

- [ ] Task: Create `TheatricalCanvas`
    - [ ] Implement `src/frameworks-drivers/ui/components/theatrical/TheatricalCanvas.tsx`.
    - [ ] Implement internal `requestAnimationFrame` loop or Animated API logic driven ONLY by `SimulationBus` events.
    - [ ] Move logic from `MainframeOverlay.tsx` into this new component.
- [ ] Task: Clean up `MainframeOverlay`
    - [ ] Remove animation logic from `MainframeOverlay`. It should now just be a container or basic HUD.
- [ ] Task: Conductor - User Manual Verification 'Theatrical Canvas Plugin' (Protocol in workflow.md)

## Phase 4: Humble Screen Refactor (The Amputation)
*Goal: Ensure UI components are pure and logic-free.*

- [ ] Task: Refactor `TerminalScreen` & `ShellScreen`
    - [ ] Audit `TerminalScreen.tsx` and `ShellScreen.tsx`.
    - [ ] Move any remaining state calculation or side-effects to `TerminalViewModel`.
    - [ ] Ensure they strictly consume props/hooks and render.
- [ ] Task: Refactor `VimScreen` & `VimEditor`
    - [ ] Audit `VimScreen.tsx` and `VimEditor.tsx`.
    - [ ] Ensure input handling is delegated to `useHeadlessVim` (which should use `InputContext`).
    - [ ] Remove any local buffering logic.
- [ ] Task: Refactor `BufferScreen` & `CommsPane`
    - [ ] Audit `BufferScreen.tsx` and `CommsPane.tsx`.
    - [ ] Extract any inline filtering or data processing to their respective ViewModels.
- [ ] Task: Conductor - User Manual Verification 'Humble Screen Refactor' (Protocol in workflow.md)
