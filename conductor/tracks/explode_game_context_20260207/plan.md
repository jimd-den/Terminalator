# Implementation Plan: Explode GameContext

## Phase 1: Core Engine Bootstrapping [checkpoint: d154617]
*This phase focuses on creating the framework-agnostic `CoreEngine` that will hold all service instances.*

- [x] Task: Create `CoreEngine` Singleton / Service Locator
    - [ ] Create `src/core/CoreEngine.ts` to instantiate and hold references to all core services (`FileSystem`, `EconomyService`, `TutorBrain`, `MasteryTracker`, `ProcessManager`, `SimulationBus`, etc.).
    - [ ] Implement `initialize()` method to handle dependency injection and startup order using `DependencyContainer`.
    - [ ] Create unit tests to verify services are instantiated and accessible without React.
- [x] Task: Conductor - User Manual Verification 'Core Engine Bootstrapping' (Protocol in workflow.md)

## Phase 2: Domain Provider Creation [checkpoint: 1e875ba]
*This phase creates granular Context Providers that wrap the `CoreEngine` services.*

- [x] Task: Create `FileSystemProvider`
    - [x] Implement `src/frameworks-drivers/ui/context/FileSystemProvider.tsx` consuming `CoreEngine.fileSystem`.
    - [x] Create `useFileSystem` hook.
- [x] Task: Create `EconomyProvider`
    - [x] Implement `src/frameworks-drivers/ui/context/EconomyProvider.tsx` consuming `CoreEngine.economyService`.
    - [x] Create `useEconomy` hook.
- [x] Task: Create `TutorMessagingProvider`
    - [x] Implement `src/frameworks-drivers/ui/context/TutorMessagingProvider.tsx` consuming `CoreEngine.tutorMessaging`.
    - [x] Move message queue processing logic from `GameContext` to this provider or a custom hook.
    - [x] Create `useTutorMessaging` hook.
- [x] Task: Create `MasteryProvider`
    - [x] Implement `src/frameworks-drivers/ui/context/MasteryProvider.tsx` consuming `CoreEngine.masteryTracker`.
    - [x] Create `useMastery` hook.
- [x] Task: Create `SystemStateProvider`
    - [x] Implement `src/frameworks-drivers/ui/context/SystemStateProvider.tsx` for UI-specific state (`isInputLocked`, `theme`).
    - [x] Create `useSystemState` hook.
- [x] Task: Create `ProcessProvider`
    - [x] Implement `src/frameworks-drivers/ui/context/ProcessProvider.tsx` consuming `CoreEngine.gameManager` and `CoreEngine.commandExecutor`.
    - [x] Create `useProcess` hook.
- [x] Task: Create `TutorPersonaProvider`
    - [x] Implement `src/frameworks-drivers/ui/context/TutorPersonaProvider.tsx` consuming `CoreEngine.tutorBrain`.
    - [x] Create `useTutorPersona` hook.
- [x] Task: Conductor - User Manual Verification 'Domain Provider Creation' (Protocol in workflow.md)

## Phase 3: Migration & Integration [checkpoint: 7a3b1f8]
*This phase involves updating the application to use the new providers and removing the old `GameContext`.*

- [x] Task: Integrate Providers in `App.tsx`
    - [x] Wrap the application with the new Providers.
    - [x] Ensure `CoreEngine.initialize()` is called before the app mounts.
- [x] Task: Refactor UI Components to use granular hooks
    - [x] Update `ShellScreen.tsx`, `TerminalScreen.tsx`, `VimEditor.tsx`, `EconomyBar.tsx`, `TutorBar.tsx`, etc.
    - [x] Replace `useGame()` with specific hooks (`useFileSystem()`, `useEconomy()`, etc.).
- [x] Task: Refactor Custom Hooks to use granular hooks
    - [x] Update `useTutorQueue.ts`, `useTutorMessagingController.ts`, etc.
- [x] Task: Deprecate `GameContext`
    - [x] Remove `src/frameworks-drivers/ui/context/GameContext.tsx`.
- [x] Task: Conductor - User Manual Verification 'Migration & Integration' (Protocol in workflow.md)

## Phase 4: Final Verification [checkpoint: 8fd5900]
*This phase confirms that the architecture is robust and performance is improved.*

- [x] Task: Run Smoke Tests
    - [x] Verify persistence of Zinc/Credits across screens.
    - [x] Verify File System state persists across screens.
    - [x] Verify Tutor messages are delivered correctly.
- [x] Task: Architectural Review
    - [x] Scan imports to ensure no circular dependencies or leaks between Providers.
- [x] Task: Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)
