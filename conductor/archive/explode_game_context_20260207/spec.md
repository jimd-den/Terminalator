# Track Specification: Explode GameContext (Humble Delivery Refactor)

## Overview
The current `GameContext.tsx` is a "God Context" that violates the Interface Segregation Principle and the Dependency Rule. It instantiates business logic (Use Cases) within the React lifecycle, leading to unstable state and unnecessary re-renders. This track will decompose `GameContext` into granular, domain-specific providers and move service instantiation outside of the React tree.

## Functional Requirements
- **External Bootstrapping:** Instantiate all core services (`FileSystem`, `EconomyService`, `TutorBrain`, `MasteryTracker`, `ProcessManager`) in a static `CoreEngine` or `ServiceLocator` outside of the React component tree.
- **Granular Providers:** Create individual React Context Providers for each domain:
    - `FileSystemProvider`
    - `EconomyProvider` (Zinc/Wallet)
    - `TutorMessagingProvider`
    - `MasteryProvider` (XP/Progression)
    - `SystemStateProvider` (UI Flags: `isInputLocked`, `theme`)
    - `ProcessProvider` (Job Control/Execution)
    - `TutorPersonaProvider` (Persona Orchestration)
- **Humble Delivery:** Ensure Context Providers only hold references to the pre-instantiated services and provide simple hooks (e.g., `useFileSystem()`) for UI consumption.
- **Dependency Rule Enforcement:** Services must not depend on React hooks or components.

## Non-Functional Requirements
- **Performance:** Reduce re-render cycles by ensuring components only subscribe to the specific domain data they need.
- **Testability:** Core services should be unit-testable in a pure Node.js environment without mocking React Context.
- **Architectural Purity:** Adhere strictly to Clean Architecture by separating Frameworks (React Context) from Use Cases (Services).

## Acceptance Criteria
- [ ] `GameContext.tsx` is completely removed or reduced to an empty shell.
- [ ] Services are instantiated exactly once during app startup, independent of React re-renders.
- [ ] UI components (Terminal, Vim, etc.) consume specific hooks instead of a single `useGame()`.
- [ ] A "smoke test" confirms that state (e.g., Zinc balance, file content) persists across screen navigations without re-instantiation.

## Out of Scope
- Refactoring the internal logic of the services themselves (unless required for decoupling).
- Implementing the "Bridge Pattern" for the display engine (reserved for a future track).
