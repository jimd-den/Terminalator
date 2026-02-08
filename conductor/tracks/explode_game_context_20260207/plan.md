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

## Phase 3: Migration & Integration
*This phase involves updating the application to use the new providers and removing the old `GameContext`.*

- [ ] Task: Integrate Providers in `App.tsx`
    - [ ] Wrap the application with the new Providers.
    - [ ] Ensure `CoreEngine.initialize()` is called before the app mounts.
- [ ] Task: Refactor UI Components to use granular hooks
    - [ ] Update `ShellScreen.tsx`, `TerminalScreen.tsx`, `VimEditor.tsx`, `EconomyBar.tsx`, `TutorBar.tsx`, etc.
    - [ ] Replace `useGame()` with specific hooks (`useFileSystem()`, `useEconomy()`, etc.).
- [ ] Task: Refactor Custom Hooks to use granular hooks
    - [ ] Update `useTutorQueue.ts`, `useTutorMessagingController.ts`, etc.
- [ ] Task: Deprecate `GameContext`
    - [ ] Remove `src/frameworks-drivers/ui/context/GameContext.tsx`.
- [ ] Task: Conductor - User Manual Verification 'Migration & Integration' (Protocol in workflow.md)

## Phase 4: Final Verification
*This phase confirms that the architecture is robust and performance is improved.*

- [ ] Task: Run Smoke Tests
    - [ ] Verify persistence of Zinc/Credits across screens.
    - [ ] Verify File System state persists across screens.
    - [ ] Verify Tutor messages are delivered correctly.
- [ ] Task: Architectural Review
    - [ ] Scan imports to ensure no circular dependencies or leaks between Providers.
- [ ] Task: Conductor - User Manual Verification 'Final Verification' (Protocol in workflow.md)
