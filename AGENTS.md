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
        *   `ShellParser.ts`: Tokenizes and parses command input into AST.
        *   `ShellExpansionService.ts`: Handles variable expansion, arithmetic, globbing, and quote removal.

3.  **Use Cases (Application)** (`src/domain/usecases`)
    *   **Role:** Application logic. Orchestrates entities and domain services to achieve specific user goals.
    *   **Dependencies:** Entities, Domain Services, Repositories (Interfaces).
    *   **Key Files:**
        *   `ExecuteCommand.ts`: Core dispatcher that interprets AST and runs commands.

4.  **Interface Adapters** (`src/interface-adapters`)
    *   **Role:** Adapts data between the Domain and the Frameworks. Implements the **Humble Object** pattern to strip logic from Views.
    *   **Dependencies:** Use Cases, Ports (Interfaces).
    *   **Key Files:**
        *   `TerminalViewModel.ts`: Manages presentation state, input handling, and autocomplete.
        *   `GameManager.ts`: Coordinates game-specific logic and event systems.
        *   `GameCommandExecutor.ts`: Interface for UI components to execute shell commands.

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
*   **Base Class:** `CommandBase` provides common argument parsing and help generation.
*   **Registry:** `CommandRegistry` maps string names to `ICommand` instances.
*   **Modules:** Commands are grouped into Modules (`CoreUtilsModule`, `SystemUtilsModule`) for bulk registration.
*   **Execution:** `ExecuteCommand` use case resolves commands and invokes `execute()`.
*   **Piping:** Commands receive `stdin` via the `input` argument (3rd arg) or `context.stdin`.

### Shell Pipeline Architecture
1.  **Lexing/Parsing:** `ShellParser` produces an AST (Abstract Syntax Tree). It **DOES NOT** expand variables or strip quotes at this stage.
2.  **Expansion (`ShellExpansionService`):**
    *   **Variable Expansion:** `$VAR` -> value.
    *   **Arithmetic Expansion:** `$(( 1 + 1 ))` -> `2`.
    *   **Globbing:** `*.ts` -> `file1.ts file2.ts`.
    *   **Quote Removal:** `"string"` -> `string` (strips syntactic quotes).
3.  **Command Loading:** `ShellFactory` assembles the shell with all necessary modules.
4.  **Execution:** `ExecuteCommand` invokes the resolved command with cleaned arguments.

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
2.  **Implement:** `ICommand` interface (extend `CommandBase`).
3.  **Register:** Add to `CoreUtilsModule.ts` (or relevant module).
4.  **Test:** Add to `posix_comprehensive_suite.ts`.

---

## 4. Directory Structure Map

```
src/
├── domain/                      # ENTITIES & LOGIC
│   ├── commands/                # Command Implementations
│   │   ├── core/                # StdLib (cp, ls, mv, rm, bg, fg, jobs, kill, wait...)
│   │   ├── system/              # System (shutdown, reboot)
│   │   ├── CommandBase.ts       # Abstract Base Class
│   │   ├── CommandRegistry.ts   # Command Lookup Registry
│   │   └── ICommand.ts          # Command Interface
│   ├── entities/                # Pure Data Models
│   │   ├── FileSystem.ts        # Inode/Dentry State
│   │   ├── TerminalState.ts     # Global State Wrapper
│   │   ├── ProcessContext.ts    # Environment Context (with jobControl)
│   │   ├── Stream.ts            # IStream, StringStream, PipeStream
│   │   ├── Job.ts               # Job entity for job control
│   │   └── Signal.ts            # POSIX signal definitions
│   ├── factories/               # Object Creation
│   │   └── ShellFactory.ts      # Assembles Shell Context
│   ├── modules/                 # DI Modules
│   │   ├── CoreUtilsModule.ts   # Registers Core Commands
│   │   └── SystemUtilsModule.ts # Registers System Commands
│   ├── ports/                   # Interfaces (Ports)
│   ├── services/                # Domain Services
│   │   ├── FileSystemService.ts # POSIX Logic
│   │   ├── JobControlService.ts # Job table, signals, job ID resolution
│   │   ├── ShellExpansionService.ts # Globbing & Expansion
│   │   └── ShellParser.ts       # Input Parser
│   └── usecases/                # Application Logic
│       └── ExecuteCommand.ts    # Main Command Dispatcher
├── interface-adapters/          # ADAPTERS
│   ├── commands/                # Adaptive Commands
│   │   └── game/                # Game Mechanics (asm, scheme, tutor, mail)
│   ├── viewmodels/              # MVVM ViewModels
│   │   └── TerminalViewModel.ts # UI State Logic
│   ├── vim/                     # Vim Simulation Logic
│   ├── GameCommandExecutor.ts   # UI-Shell Bridge
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


---

## 5. POSIX Gap Analysis

> [!NOTE]
> The following sections document the status of POSIX subsystem implementations.

### 5.1 Job Control & Process Management ✅ IMPLEMENTED

*   **Commands:** `bg`, `fg`, `jobs`, `kill`, `wait` — **100% POSIX Compliance**
*   **Architecture:**
    *   `Job` entity (`src/domain/entities/Job.ts`) - Job states (Running/Stopped/Done/Terminated) and output formatting.
    *   `Signal` entity (`src/domain/entities/Signal.ts`) - POSIX signal definitions and parsing.
    *   `JobControlService` (`src/domain/services/JobControlService.ts`) - Job table management, signal delivery, job resolution (%1, %+, %-).
    *   `ProcessContext.jobControl` - Reference injected into commands.
*   **Key Features:**
    *   Job ID notation: `%1`, `%+`, `%%`, `%-`, `%?string`, `%string`
    *   Signal handling: SIGTERM, SIGKILL, SIGSTOP, SIGCONT, etc.
    *   Output formats per POSIX: `[%d] %s\n` for bg, `%s\n` for fg, `[%d] %c %s %s\n` for jobs.

### 5.2 Identity & Permissions Model

*   **Affected Commands:** `id`, `chown`, `chgrp`, `chmod` (symbolic/sticky), `logname`, `newgrp`
*   **Gap:** No `IdentityService` (simulating `/etc/passwd` & `/etc/group`). Permission enforcement (sticky bit, setuid) is incomplete in `FileSystemService`. `id` outputs `[object Object]` due to missing serialization.
*   **Proposed Fix:** Add `User`/`Group` entities and an `IdentityService` to manage simulated user database. Update `FileSystemService` for full permission checks.

### 5.3 Process Pipeline & I/O Streams ✅ PARTIALLY IMPLEMENTED

*   **Commands:** `xargs` (100%), `comm`, `split`, `csplit`
*   **Implemented:**
    *   `IStream` interface (`src/domain/entities/Stream.ts`) - Abstraction for stdin/stdout/stderr.
    *   `StringStream`, `PipeStream`, `NullStream` implementations.
    *   `ProcessContext` uses `IStream` for I/O with backward compatibility via `getStdinAsString()`.
*   **Remaining Gap:** Full FD redirection (2>&1, <&3) and large streaming data.


---

## 6. Code Hygiene & Refactoring Standards

### SOLID Compliance
*   **SRP:** Large commands (like `MakeCommand`) MUST be split into Parser/Executor services if logic exceeds 200 lines or distinct phases.
*   **OCP:** Use the Registry pattern for extending functionality (e.g., CommandRegistry). Avoid hardcoded dispatch switch/case blocks for extensible systems.

### DRY (Don't Repeat Yourself)
*   **Path Resolution:** Do NOT implement `resolvePath(path, state)` in commands. Use `fs.resolveAbsolutePath(path, cwd)` from `FileSystemService`.
*   **Argument Parsing:** Commands MUST use `CommandBase.parseOptions` or `CommandBase.parseArgs`.
*   **Traversals:** Use `FileSystemService` for recursive operations. Do not manually recurse directory structures in Commands.

### Known Violations (To Be Refactored)
1.  **MakeCommand:** Handles parsing and execution. Needs splitting.
2.  **Parsers:** `ShellParser` logic complexity is high; consider visitor pattern if grammar grows.

### User Rules (The 8-Point GEMINI System)
The user rules defined in section 2 are absolute.
1.  **Strict Architecture**
2.  **Literate Documentation**
3.  **Dependency Minimalism**
4.  **Observability**
5.  **Performance & Purity**
6.  **Universal Readability**
7.  **Pragmatic Design Patterns**
8.  **SOLID / KISS Equilibrium**
