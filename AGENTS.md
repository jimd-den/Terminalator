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
    *   **Dependencies:** **NONE**. Strictly forbidden to import from outer layers or external libraries (except specific polyfills if absolutely necessary).
    *   **Key Files:** 
        *   `FileSystem.ts`: The Inode/Dentry tree structure.
        *   `TerminalState.ts`: State definition.
        *   `ProcessContext.ts`: Execution context for commands.

2.  **Domain Services** (`src/domain/services`)
    *   **Role:** Domain logic that interacts with multiple entities or doesn't fit naturally into a single entity.
    *   **Dependencies:** Entities.
    *   **Key Files:**
        *   `FileSystemService.ts`: Implements POSIX logic (mkdir, touch) using the `FileSystem` entity.
        *   `ShellParser.ts`: Tokenizes and parses command input.

3.  **Use Cases (Application)** (`src/domain/usecases`)
    *   **Role:** Application logic. Orchestrates entities and domain services to achieve specific user goals.
    *   **Dependencies:** Entities, Domain Services, Repositories (Interfaces).
    *   **Key Files:**
        *   `ExecuteCommand.ts`: Core dispatcher that interprets input and runs commands.

4.  **Interface Adapters** (`src/interface-adapters`)
    *   **Role:** Adapts data between the Domain and the Frameworks. Implements the **Humble Object** pattern to strip logic from Views.
    *   **Dependencies:** Use Cases, Ports (Interfaces).
    *   **Key Files:**
        *   `TerminalViewModel.ts`: Manages presentation state, input handling, and autocomplete.
        *   `GameManager.ts`: Coordinates game-specific logic and event systems.

5.  **Frameworks & Drivers** (`src/frameworks-drivers`)
    *   **Role:** UI Components, Database Implementations, System I/O.
    *   **Dependencies:** Interface Adapters.
    *   **Key Files:**
        *   `ui/screens/TerminalScreen.tsx`: The main View (Passive View).
        *   `ui/components/ConsoleLayout.tsx`: Layout structure.

---

## 2. Core Systems & Patterns

### The File System
*   **Model:** In-memory POSIX-compliant Inode/Dentry system.
*   **Separation:** Data is in `FileSystem` (Entity), Logic is in `FileSystemService` (Domain Service).
*   **Usage:** Do **NOT** use Node.js `fs` module in client-side code. Use `FileSystemService`.

### The Command Pattern
*   **Implementation:** `ICommand` interface in `src/domain/commands/ICommand.ts`.
*   **Registry:** `CommandRegistry` maps string names to `ICommand` instances.
*   **Execution:** `ExecuteCommand` use case resolves commands and invokes `execute()`.
*   **Piping:** Commands receive `stdin` via the `input` argument (3rd arg) or `context.stdin`. Always check for this if file arguments are missing.

### The Humble Object (ViewModel)
*   **Pattern:** Logic is moved out of React components (`TerminalScreen`) and into `TerminalViewModel`.
*   **Benefit:** Allows the UI logic to be tested without rendering components.
*   **Rule:** `TerminalScreen.tsx` should primarily contain JSX and layout/style logic. State management belongs in the ViewModel.

### The 8-Point GEMINI System (User Rules)
1.  **Strict Architecture:** Respect the layers. No shortcuts.
2.  **Literate Documentation:** "Pillar" headers in files explaining intent and context.
3.  **Dependency Minimalism:** Avoid external dependencies. Use the standard library.
4.  **Observability:** Implement granular logging/telemetry for traceability.
5.  **Performance & Purity:** Prefer pure functions and O(1)/O(n) algorithms.
6.  **Universal Readability:** Code should be readable by domain experts.
7.  **Pragmatic Design Patterns:** Use patterns (Strategy, Factory) explicitly where they solve specific problems.
8.  **SOLID / KISS Equilibrium:** Robustness without over-engineering.

---

## 3. Development Workflow

### Testing
*   **Primary Suite:** `scripts/posix_comprehensive_suite.ts`.
*   **Running Tests:**
    ```bash
    npx tsx scripts/posix_comprehensive_suite.ts
    ```
*   **Process:**
    1.  run existing tests to ensure baseline.
    2.  Implement changes/features.
    3.  Add new tests if necessary (look at `posix_comprehensive_suite.ts` for patterns).
    4.  Verify compliance.

### Adding a New Command
1.  **Create:** `src/domain/commands/core/MyCommand.ts`.
2.  **Implement:** `ICommand` interface.
3.  **Register:** Add to `ExecuteCommand.ts` (or relevant module).
4.  **Test:** Add to `posix_comprehensive_suite.ts`.

---

## 4. Directory Structure Map

```
src/
├── domain/                      # ENTITIES & LOGIC
│   ├── commands/                # Command Implementations
│   │   ├── core/                # StdLib (cp, ls, mv, rm, etc.)
│   │   ├── system/              # System (shutdown, reboot)
│   │   ├── CommandRegistry.ts   # Command Lookup Registry
│   │   └── ICommand.ts          # Command Interface
│   ├── entities/                # Pure Data Models
│   │   ├── FileSystem.ts        # Inode/Dentry State
│   │   ├── TerminalState.ts     # Global State Wrapper
│   │   └── ProcessContext.ts    # Envrionment Context
│   ├── modules/                 # DI Modules
│   │   ├── CoreUtilsModule.ts   # Registers Core Commands
│   │   └── SystemUtilsModule.ts # Registers System Commands
│   ├── ports/                   # Interfaces (Ports)
│   ├── services/                # Domain Services
│   │   ├── FileSystemService.ts # POSIX Logic
│   │   └── ShellParser.ts       # Input Parser
│   └── usecases/                # Application Logic
│       └── ExecuteCommand.ts    # Main Command Dispatcher
├── interface-adapters/          # ADAPTERS
│   ├── commands/                # Adaptive Commands
│   │   └── game/                # Game Mechanics (asm, scheme, tutor, mail)
│   ├── viewmodels/              # MVVM ViewModels
│   │   └── TerminalViewModel.ts # UI State Logic
│   ├── vim/                     # Vim Simulation Logic
│   └── GameManager.ts           # Game Subsystem Coordinator
├── frameworks-drivers/          # INFRASTRUCTURE
│   ├── ui/                      # React Native UI
│   │   ├── screens/             # Top-level Views
│   │   └── components/          # Reusable UI Blocks
│   ├── telemetry/               # Logging/Tracing
│   └── wasm/                    # WebAssembly Drivers
├── infrastructure/              # SERVICES
│   └── services/                # Implementation details (HostBinaryRunner)
└── scripts/                     # TESTS & TOOLS
    ├── posix_comprehensive_suite.ts # Main Test Suite (Run this!)
    └── ...
```

## 5. Critical Notes
*   **"Blind" Reliance:** Do not assume global variables exist. Everything must be passed via Context or State.
*   **Immutability:** `TerminalState` is generally treated as immutable. Return *new* state objects from commands.
*   **Error Handling:** Commands should catch errors and return a `CommandResponse` with a non-zero `exitCode` rather than throwing exceptions up the stack, unless it's a critical system failure.
