# SOLID Violations Report

This report documents SOLID violations identified in the codebase, with specific file paths, line numbers, and descriptions.

| File Path | Line Number | Violation | Description |
|-----------|-------------|-----------|-------------|
| `src/domain/commands/CommandBase.ts` | 48 | **OCP** | The `parseArgs` method uses a hardcoded check for option definitions. Extending parsing logic for new flag types requires modifying this base class. |
| `src/domain/commands/CommandBase.ts` | 24 | **SRP** | The `execute` method mixes template method pattern logic with argument parsing invocation. |
| `src/domain/commands/core/SedCommand.ts` | 28 | **SRP** | The `execute` method is monolithic, handling argument parsing, file reading, and delegation to the VM in one large block. |
| `src/domain/commands/core/SedCommand.ts` | 82 | **SRP** | `processContent` is a complex function defined inside `execute`, mixing stream processing logic with command orchestration. |
| `src/domain/commands/core/AwkCommand.ts` | 36 | **SRP** | `execute` method mixes manual argument parsing with interpreter setup and file reading. |
| `src/domain/commands/core/AwkCommand.ts` | 105 | **DIP** | The command directly depends on concrete `AwkLexer`, `AwkParser`, and `AwkInterpreter` classes instead of abstractions. |
| `src/domain/commands/core/FindCommand.ts` | 36 | **SRP** | `execute` method contains a large `if/else if` block for parsing and creating inline predicate objects. |
| `src/domain/commands/core/FindCommand.ts` | 64 | **OCP** | Adding a new predicate (e.g., `-size`) requires modifying the `execute` method's switch logic. |
| `src/domain/services/ShellParser.ts` | 238 | **SRP** | `parseCommand` handles too many distinct grammar constructs (Subshell, Block, If, For, While, SimpleCommand) in a single method. |
| `src/domain/services/ShellParser.ts` | 277 | **OCP** | `parseIf`, `parseFor`, etc., are hardcoded in the parser. Adding new control structures requires modifying `parseCommand` and `isReservedWord`. |
| `src/domain/services/FileSystemService.ts` | 267 | **SRP** | The service, which claims to be a Facade, implements `symlink`, `link`, `readlink`, and `rename` logic inline instead of delegating to a service. |
| `src/domain/services/FileSystemService.ts` | 100 | **DRY** | `resolveAbsolutePath` logic duplicates path normalization logic found in `PathResolver`. |
| `src/interface-adapters/viewmodels/TerminalViewModel.ts` | 48 | **SRP** | `saveToArchive` contains business logic for parsing shell output buffers, which should belong in an `ArchiveService`. |
| `src/interface-adapters/viewmodels/TerminalViewModel.ts` | 88 | **SRP** | `useEffect` hook contains specific "Game Rules" (contextual hints based on mission state) leaking into the ViewModel. |
| `src/frameworks-drivers/ui/screens/TerminalScreen.tsx` | 53 | **OCP** | The view switching logic uses a hardcoded ternary chain. Adding a new application type requires modifying the render method. |
| `src/frameworks-drivers/ui/screens/TerminalScreen.tsx` | 38 | **SRP** | The component mixes layout configuration (creating `StyleSheet` in render) with view orchestration. |
| `src/interface-adapters/GameManager.ts` | 17 | **SRP** | **God Class**. Manages Missions, NPCs, Mail, Tutor, FileSystem prep, and Lesson generation. |
| `src/domain/usecases/ExecuteCommand.ts` | 44 | **SRP** | Constructor implements logic to instantiate `FileSystemService` if not provided, coupling it to a specific implementation. |
| `src/domain/usecases/ExecuteCommand.ts` | 82 | **OCP** | `resolveInterpreter` contains hardcoded logic for switching between local and remote interpreters. |
