# AGENTS.md

## The Eight Pillars of the Craft

1.  **Strict Clean Architecture (The Four-Fold Shield)**
    *   **Rule:** Dependencies MUST point inwards.
    *   **Layers:**
        1.  **Domain (Inner):** Entities, Use Cases, Ports. NO dependencies on outer layers.
        2.  **Interface Adapters:** Controllers, Presenters, Gateways. Adapts data between Domain and Outer.
        3.  **Infrastructure:** Implementations of Ports (DB, Telemetry), Drivers.
        4.  **Presentation (Outer):** UI, React Components.
    *   **Enforcement:** UI components must NEVER import Entities directly. They must use ViewModels or DTOs provided by Presenters/Controllers.

2.  **Literate Documentation (The Storyteller's Code)**
    *   **Rule:** Every file must have a header explaining its purpose, its layer, and the "Pillar" it serves.
    *   **Intent:** Code should explain "Why" more than "How".

3.  **Dependency Minimalism (The Empty Cup)**
    *   **Rule:** Do not add a library if a simple function will suffice. Use native Node/React APIs where possible.

4.  **Telemetry (The Watchman's Log)**
    *   **Rule:** All business logic must be traceable via `TelemetryPort`. Logs must be ISO 8601 formatted.

5.  **Performance & Purity (The Flowing River)**
    *   **Rule:** Use lazy initialization for expensive objects. Prefer pure functions.

6.  **Semantic Naming (The True Name)**
    *   **Rule:** Names must reflect business intent, not implementation details (e.g., `executeCommand` vs `runLoop`).

7.  **Pragmatic Patterns (The Master's Tool)**
    *   **Rule:** Use Design Patterns (Command, Factory, Singleton) where they simplify, not complicate.

8.  **SOLID & KISS (The Balanced Scale)**
    *   **Rule:** Classes should have one reason to change. Keep it simple.

---

## Architecture Analysis Report

**Date:** October 26, 2023
**Status:** Review Complete

### Executive Summary
The `Terminalator` project demonstrates a strong understanding of Clean Architecture principles, particularly in the separation of Domain (Use Cases/Entities) and the use of the Command Pattern. However, "leakage" has been detected where the Presentation Layer (UI) directly accesses Domain Entities (`FileSystem`), creating tight coupling that threatens future maintainability and testability.

### Detailed Violations

#### 1. UI Coupling to Domain Entities
*   **File:** `src/presentation/screens/TerminalScreen.tsx`
*   **Lines:** 60-80 (approx)
*   **Violation:** The `TerminalScreen` component imports `FileSystem` (Entity) and manually traverses the file tree using `fs.getNode()` to implement autocomplete logic.
*   **Reasoning:** The View is performing business logic (resolving paths, checking file types). If `FileSystem` structure changes (e.g., becomes asynchronous or remote), the UI will crash.
*   **Correction:** Move this logic to `GameCommandExecutor` or a dedicated `AutocompleteService` in the Interface Adapter layer. The UI should ask `commandExecutor.getSuggestions(input)`.

#### 2. Direct Entity Creation in UI
*   **File:** `src/presentation/screens/TerminalScreen.tsx`
*   **Line:** 17
*   **Violation:** `import { createInitialTerminalState } from '../../domain/entities/TerminalState';`
*   **Reasoning:** The UI creates the initial domain state. This logic belongs in the `GameManager` or a Factory.
*   **Correction:** `GameManager` should provide the initial state via a method like `gameManager.initializeSession()`.

#### 3. Context as "Leaky" Composition Root
*   **File:** `src/presentation/context/GameContext.tsx`
*   **Violation:** Exposes `fs: FileSystem` directly to all consumers.
*   **Reasoning:** By putting the raw Entity in the context, any component using `useGame()` can bypass the architectural boundaries and manipulate the state directly.
*   **Correction:** `GameContext` should expose `GameCommandExecutor` and `GameManager`, but NOT `FileSystem`. If read access is needed, expose a Read-Only Interface or DTOs.

#### 4. Interface Adapter Inheritance
*   **File:** `src/interface-adapters/GameCommandExecutor.ts`
*   **Violation:** `extends ExecuteCommand`
*   **Reasoning:** While convenient, inheritance couples the Adapter to the concrete Use Case. Composition (holding a reference to `ExecuteCommand` or `CommandRegistry`) is often more flexible.
*   **Severity:** Minor/Debatable.

### Implementation Plan for Corrections

1.  **Refactor Autocomplete:**
    *   Update `GameCommandExecutor` to include a `getSuggestions(partial: string): string` method.
    *   Move the `fs.resolveNode` logic from `TerminalScreen` to this new method.

2.  **Secure GameContext:**
    *   Remove `fs` from the `value` exported by `GameContext`.
    *   Update `TerminalScreen` to use `commandExecutor` for all FS-related queries.

3.  **Strict Imports:**
    *   Add ESLint rules (if possible) to forbid `src/presentation` from importing `src/domain/entities`.
