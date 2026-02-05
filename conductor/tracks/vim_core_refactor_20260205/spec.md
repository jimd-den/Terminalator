# Specification: Clean Architecture Vim Refactor

## 1. Objective
Refactor the existing procedural Vim mode into a robust, Clean Architecture-compliant system. The goal is to move from an anemic domain model with a "God Handler" to a rich domain model using the State and Command patterns.

## 2. Success Criteria
- [ ] **Extensibility (OCP):** New modes and commands can be added without modifying the core input handler.
- [ ] **Undo/Redo:** Users can undo (`u`) and redo (`Ctrl-R`) any editing operation.
- [ ] **Testability:** 100% of domain logic (motions, commands, modes) is unit tested without UI or FileSystem dependencies.
- [ ] **Layering:** Complete separation between the UI (Frameworks), Input Handling (Adapters), and Text Manipulation (Entities/Use Cases).

## 3. Architecture Overview

### 3.1 Entities (Enterprise Logic)
- `IVimCommand`: Interface for atomic, undoable operations (`execute()`, `undo()`).
- `VimState`: Rich entity containing the current mode, cursor, and command history.
- `EditorBuffer`: Authority on text data (Purity prioritized).

### 3.2 Use Cases (Application Logic)
- `ProcessVimInput`: Coordinates the current Mode behavior.
- `VimMode` (Interface/State Pattern): Implementations for `NormalMode`, `InsertMode`, `VisualMode`.
- `MotionStrategy`: Pure functions for cursor calculation (e.g., `wordForward`, `lineEnd`).

### 3.3 Interface Adapters
- `VimSimulator`: Acts as the Facade for the system, wiring the domain logic to the simulated `FileSystem`.

## 4. Technical Constraints
- **Literate Programming:** Every file must explain the "why" and use specific Design Pattern terminology.
- **Dependency Minimalism:** No external libraries for logic; standard library only.
- **Telemetry:** Every command execution and mode switch must be logged with ISO timestamps.
