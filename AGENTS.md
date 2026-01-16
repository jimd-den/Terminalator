# Agents Guide to Terminalator

**Target Audience:** AI Agents & Large Language Models (LLMs)
**Purpose:** Provide strict guidelines, architectural context, and implementation details for working on the `Terminalator` codebase.

> [!IMPORTANT]
> **Adhere strictly to Clean Architecture and the 8-Point GEMINI System.**
> This is not a suggestion. It is the primary directive.

---

## 1. Architectural Philosophy: The Four-Fold Shield

The codebase follows a strict **Clean Architecture** implementation. Dependencies flow **inwards**.

### Layers
1.  **Entities (Domain)** (`src/domain/entities`)
    *   **Role:** Enterprise logic. Pure data structures and business rules.
    *   **Dependencies:** NONE. No external libraries.
    *   **Key Files:** `FileSystem.ts` (Inode/Dentry tree), `TerminalState.ts`.
2.  **Use Cases (Application)** (`src/domain/usecases`)
    *   **Role:** Application logic. Orchestrates entities to achieve goals.
    *   **Dependencies:** Entities, Repositories (Interfaces).
    *   **Key Files:** `ExecuteCommand.ts` (Command Dispatcher), `CommandRegistry.ts`.
3.  **Interface Adapters** (`src/interface-adapters`)
    *   **Role:** Bridges domain to outer world.
    *   **Dependencies:** Use Cases, Ports.
    *   **Key Files:** `GameManager.ts`, `ConsoleLayout.tsx`.
4.  **Frameworks & Drivers** (`src/frameworks-drivers`)
    *   **Role:** UI, Databases, External Systems.
    *   **Dependencies:** Interface Adapters.
    *   **Key Files:** React Native components, Expo config.

---

## 2. Core Systems & Patterns

### The File System (`FileSystem.ts`)
*   **Structure:** POSIX-compliant Inode/Dentry model.
*   **Inodes:** Hold metadata (mode, uid, gid, size, content).
*   **Dentries:** Map filenames to Inodes. Establish the tree hierarchy.
*   **Persistence:** Currently in-memory. References `fs.readFile`, `fs.writeFile`, `fs.resolveNode`.

### The Command Pattern (`ICommand.ts`, `ExecuteCommand.ts`)
*   **Pattern:** Command Pattern (obviously).
*   **Interface:**
    ```typescript
    interface ICommand {
        execute(args: string[], state: TerminalState, input?: string): CommandResponse | Promise<CommandResponse>;
    }
    ```
*   **Piping Architecture:**
    *   The `ExecuteCommand` use case handles pipe splitting (`|`).
    *   Output of `Command A` is passed as `input` argument to `Command B`.
    *   Commands MUST check `input` if no file arguments are provided (support stdin).

### The 8-Point GEMINI System (User Rules)
1.  **Strict Architecture:** No bypassing layers.
2.  **Literate Documentation:** Every file must have a header explaining intent in plain English (Pillar: The Storyteller’s Code).
3.  **Dependency Minimalism:** Use standard library.
4.  **Observability:** Log inputs/outputs.
5.  **Performance:** O(1) / O(n). Pure functions.
6.  **Readability:** Semantic naming.
7.  **Pragmatic Design Patterns:** Use patterns (Strategy, Factory) only when necessary and explicitly named.
8.  **SOLID / KISS Equilibrium:** Balance robustness with simplicity.

---

## 3. Development Workflow

### Test-Driven Development (TDD)
*   **Suite:** `scripts/posix_suite.ts`.
*   **Methodology:**
    1.  **RED:** Write a test case in `posix_suite.ts` (e.g., adding `Grep` test).
    2.  **GREEN:** Implement the minimal code in `src/domain/commands/core/`.
    3.  **REFACTOR:** Optimize and clean up.
*   **Running Tests:**
    ```bash
    npx tsx scripts/posix_suite.ts
    ```

### Adding a New Command
1.  **Create File:** `src/domain/commands/core/MyCommand.ts`.
2.  **Implement Interface:** Implement `ICommand`.
    *   Constructor typically accepts `FileSystem`.
    *   `execute` method logic.
    *   Handle `input` (stdin) if applicable.
3.  **Register:** Add to `ExecuteCommand.ts` inside `registerCoreCommands()`.
4.  **Test:** Add entry to `posix_suite.ts`.

---

## 4. Directory Structure Map

```
src/
├── domain/                  # PURE LOGIC
│   ├── commands/            # Command implementations
│   │   ├── core/            # POSIX commands (ls, cat, grep...)
│   │   ├── ICommand.ts      # Contract
│   │   └── CommandRegistry.ts
│   ├── entities/            # Data structures (FileSystem, TerminalState)
│   ├── usecases/            # Logic (ExecuteCommand)
│   └── ports/               # Interfaces for I/O (Telemetry)
├── interface-adapters/      # ADAPTERS
│   ├── GameManager.ts       # Main controller
│   └── ...
├── frameworks-drivers/      # REACT UI
│   ├── components/          # React components
│   └── ...
└── scripts/                 # TOOLING
    └── posix_suite.ts       # Compliance tests
```

---

## 5. Critical Notes for Agents

*   **Do not use `fs` (Node module) in client-side code.** Rely on the `FileSystem` entity.
*   **Respect strict mode.** Do not use `any` unless absolutely necessary (and documented).
*   **Comments are mandatory.** Use the "Pillar" format in file headers.
*   **Piping matters.** Always ensure commands like `cat`, `grep`, `sed` fallback to `input` if file args are missing.
