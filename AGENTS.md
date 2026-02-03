# Agents Guide to Terminalator

**Target Audience:** AI Agents & Large Language Models (LLMs)
**Purpose:** Provide strict guidelines, architectural context, and implementation details for working on the `Terminalator` codebase.

> [!IMPORTANT]
> **Adhere strictly to Clean Architecture and the 8-Point GEMINI System.**
> This is a strict requirement for all contributions.

---

## 1. Architectural Philosophy: The Four-Fold Shield

The codebase follows a strict **Clean Architecture** implementation, ensuring separation of concerns and testability. Dependencies always flow **inwards**.

### Layers & Responsibilities

1.  **Entities (Domain)** (`src/domain/entities`)
    *   **Role:** Enterprise logic, pure data structures, and core business rules.
    *   **Dependencies:** **NONE**. Strictly forbidden to import from outer layers or external libraries.
    *   **Key Files:** 
        *   `FileSystem.ts`: The Inode/Dentry structure.
        *   `TerminalState.ts`: Global state wrapper.
        *   `ProcessContext.ts`: Execution environment for commands.
        *   `Mission.ts`: Game mission state.
        *   `NPC.ts`: NPC character definitions.
        *   `filesystem/`: Specialized Inode/Dentry node types.

2.  **Domain Services** (`src/domain/services`)
    *   **Role:** Domain logic that interacts with multiple entities.
    *   **Dependencies:** Entities.
    *   **Key Files:**
        *   `FileSystemService.ts`: **Facade Pattern**. Orchestrates specialized filesystem services.
        *   `filesystem/`: Specialized services (`PermissionService`, `PathResolver`, `FileOperationService`).
        *   `ShellParser.ts`: Recursive Descent Parser (Strategy Pattern).
        *   `IdentityService.ts`: POSIX-compliant user/group management.
        *   `TutorService.ts`: Context-aware hint generator (uses `StrategyRegistry`).
        *   `mission-strategies/`: Mission evaluation strategies.

3.  **Use Cases (Application)** (`src/domain/usecases`)
    *   **Role:** Application logic. Orchestrates entities and domain services.
    *   **Dependencies:** Entities, Domain Services, Repositories (Interfaces).
    *   **Key Files:**
        *   `ExecuteCommand.ts`: Core dispatcher (Coordinator).
        *   `SchemeEvaluator.ts`: Lisp-based scripting engine.
        *   `asm/`: Assembly (RISC-V) simulation use cases.

4.  **Interface Adapters** (`src/interface-adapters`)
    *   **Role:** Adapts data between Domain and Frameworks.
    *   **Dependencies:** Use Cases, Ports (Interfaces).
    *   **Key Files:**
        *   `viewmodels/`: Decomposed ViewModels (`useShellViewModel.ts`, `useMissionViewModel.ts`).
        *   `GameManager.ts`: Coordinator Facade for game subsystems.
        *   `VimSimulator.ts`: Adaptation of VimEngine to interactive shell.

5.  **Frameworks & Drivers** (`src/frameworks-drivers`)
    *   **Role:** UI Components (React Native), WASM bridges.
    *   **Dependencies:** Interface Adapters.

---

## 2. Core Systems & Patterns

### The File System Sub-system
*   **Structure:** Decomposed into specialized services (`PermissionService`, `PathResolver`, `FileOperationService`).
*   **Facade:** `FileSystemService` provides the unified API.
*   **Identity:** `IdentityService` manages UIDs/GIDs and supplementary groups.
*   **Permissions:** `PermissionService` enforces POSIX rwx bits with Root (UID 0) overrides.

### Mission & Tutor System
*   **Strategy Pattern:** Missions are evaluated via `IMissionStrategy` implementations.
*   **Registry:** `StrategyRegistry` maps mission types to strategies (OCP).
*   **Data Provider:** `IMissionDataProvider` decouples mission loading (JSON/Procedural).
*   **Tutor:** `TutorService` orchestrates evaluations to provide real-time hints and progression triggers.

### Shell & Command Architecture
*   **Parser:** Recursive descent with `IStatementParser` strategies (If, For, While).
*   **Executor:** `ShellInterpreter` (Visitor Pattern) walks the AST.
*   **Commands:** `ICommand` implementations extending `CommandBase` (robust flag parsing).
*   **Expansion:** `ShellExpansionService` handles variable, arithmetic, and glob expansion.
*   **Job Control:** `JobControlService` implements POSIX signal delivery and job table management.

---

## 3. Development Roadmap: "Unix Edge Lord"

**Current Phase:** Procedural Generation & World Simulation.

### Completed Refactoring
*   ✅ **OCP (Strategies):** `StrategyRegistry` implemented.
*   ✅ **DIP (Mission Data):** `IMissionDataProvider` and `JsonMissionDataProvider` implemented.
*   ✅ **SRP (FileSystem):** `FileSystemService` refactored into specialized sub-services.

### Active Technical Debt & Violations
1.  **SRP Violation in Strategies:** Strategies (e.g., `ExfiltrateStrategy.ts`) still mix state inspection, narrative text generation, and progression logic.
2.  **Redirection:** Only `>` and `>>` are supported. `2>&1` and input redirection `<` are missing.

### Future Architecture (Planned)
1.  **World Graph:** Nodes (Rooms) and Edges (Connections) representing the physical world.
2.  **Device Map:** Mapping `/dev/*` files to World Entities (e.g., `/dev/vent` controls airlock).
3.  **Knuthian Constraints:** Simulation of Bandwidth and CPU cycles to enforce algorithmic efficiency.

---

## 4. POSIX Gap Analysis

### 4.1 Job Control ✅ IMPLEMENTED
*   **Status:** Full POSIX compliance (Signals, Job IDs).

### 4.2 Identity & Permissions ✅ IMPLEMENTED
*   **Service:** `IdentityService.ts` and `PermissionService.ts`.
*   **Status:** Full support for User/Group resolution and bitwise permission enforcement.

### 4.3 Process Pipeline & I/O Streams ⚠️ PARTIAL
*   **Implemented:** `IStream` abstraction, basic `>` and `>>` redirection.
*   **Gap:** Full FD redirection (`2>&1`), heredocs (`<<`), and input redirection (`<`).

---

## 5. Engineering Log

### 2026-02-02: "Unix Edge Lord" Refactoring (Phase 1)
*   **Data Layer:** Implemented `IMissionDataProvider` to decouple `MissionRepository`.
*   **Strategy Registry:** Implemented `StrategyRegistry` to enable OCP in `TutorService`.
*   **Verification:** `mission_tester.ts` confirms data-driven progression works.

### 2026-01-30: POSIX Subsystem Foundation
*   **Job Control:** Full implementation of `bg`, `fg`, `jobs`, `kill`.
*   **Identity:** Implemented `IdentityService` and refactored `FileSystemService` into specialized services.
