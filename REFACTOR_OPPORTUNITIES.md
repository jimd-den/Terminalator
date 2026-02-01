# Refactoring Opportunities

This document outlines specific opportunities to apply the **KISS (Keep It Simple, Stupid)** principle and standard **Design Patterns** to improve the codebase's maintainability, readability, and testability.

## General Observations

1.  **Argument Parsing**:
    *   **Observation**: Almost every command (e.g., `GrepCommand`, `FindCommand`, `AwkCommand`) implements its own manual `while` loop to parse arguments and flags. This leads to code duplication and inconsistent behavior (e.g., handling of `--` delimiter, bundled flags like `-la`).
    *   **Opportunity**: Implement a **Command Argument Parser** utility or use the **Interpreter/Builder Pattern**. A shared `ArgParser` class could standardize flag handling and reduce boilerplate in every `execute` method.
2.  **Hardcoded Strings**:
    *   **Observation**: Error messages and formatting constants (e.g., file permissions, user names) are often hardcoded within the commands.
    *   **Opportunity**: Use a **Localization Service** or a central `Constants` file to manage these strings, improving maintainability and allowing for easier updates.

## Specific File Analysis

### `src/domain/commands/core/FindCommand.ts`

*   **Lines 40-140 (approx)**: `execute` method
    *   **KISS Opportunity**: The predicate parsing logic (handling `-name`, `-type`, `-exec`, etc.) is mixed directly into the main execution loop. This makes the method long and hard to follow.
    *   **Design Pattern**: **Chain of Responsibility** or **Composite Pattern**.
        *   Create a `PredicateFactory` that returns small, focused `IPredicate` objects.
        *   Use a Composite to handle complex expressions (though not fully implemented yet, it prepares for parentheses/logic operators).
    *   **Refactoring**: Extract the argument parsing loop into a separate method that returns a list of `Predicate` objects.

### `src/domain/commands/core/GrepCommand.ts`

*   **Lines 150-210 (approx)**: `parseArgs` method
    *   **KISS Opportunity**: A very long switch/case statement for parsing flags. As mentioned in "General Observations", this is repetitive.
*   **Lines 250-300 (approx)**: `processRows` inner function
    *   **KISS Opportunity**: This function handles multiple responsibilities: filtering lines, formatting output (line numbers, filenames), and counting matches.
    *   **Design Pattern**: **Strategy Pattern** for output formatting.
        *   Create `IOutputFormatter` implementations: `StandardFormatter`, `CountFormatter`, `ListOnlyFormatter`.
        *   Inject the appropriate formatter into the execution logic based on flags.

### `src/domain/services/ShellParser.ts`

*   **Lines 460-470 (approx)**: `isRedirect` method
    *   **KISS Opportunity**: relies on checking string values (`>`, `>>`, `<`) inside `TokenType.WORD`. This is brittle.
    *   **Refactoring**: Update the Lexer to emit specific `REDIRECT` tokens, simplifying the parser logic to a simple type check.
*   **Whole Class**:
    *   **Design Pattern**: **State Pattern** could be useful if the parser complexity grows, but currently, the Recursive Descent (Interpreter) approach is appropriate. However, extracting grammar rules into separate small classes (e.g., `PipelineParser`, `CommandParser`) could reduce the size of the main class.

### `src/domain/services/FileSystemService.ts`

*   **Lines 60-80 (approx)**: `resolveAbsolutePath`
    *   **KISS Opportunity**: Logic for path normalization seems partially duplicated or split between here and `PathResolver`.
    *   **Refactoring**: Centralize all path manipulation logic within `PathResolver` or a `PathUtils` static helper.
*   **Lines 270-350 (approx)**: `symlink`, `readlink`, `link`, `rename` methods
    *   **KISS Opportunity**: These methods are implemented "inline" within the facade.
    *   **Design Pattern**: **Command Pattern** or **Strategy Pattern**.
        *   Delegate these operations to specialized services (e.g., `LinkService`, `MoveService`) similar to how `FileOperationService` is used. This adheres to the "Specialized Services" architecture mentioned in the file header.

### `src/domain/entities/FileSystem.ts`

*   **Lines 75-100 (approx)**: `mkdir` (private bootstrap method)
    *   **KISS Opportunity**: This is a simplified, duplicated version of directory creation logic found in `DirectoryService`. It exists to bootstrap the default directories.
    *   **Design Pattern**: **Builder Pattern**.
        *   Use a `FileSystemBuilder` to construct the initial file system state (root, default folders) instead of embedding this logic in the entity constructor. This keeps the Entity pure and focused on data holding.

### `src/domain/commands/core/LsCommand.ts`

*   **Lines 30-100 (approx)**: `listDirectory` inner function
    *   **KISS Opportunity**: This function is complex, handling filtering, sorting, recursive traversal, and formatting all at once. It also closes over outer scope variables (`outputParts`, `metadataItems`), making it coupled and hard to unit test.
    *   **Refactoring**:
        *   Extract `filterFiles`, `sortFiles`, and `formatEntry` into pure helper functions.
        *   Pass `outputParts` as an accumulator or return the lines to be aggregated by the caller.
*   **Lines 60-80 (approx)**: Formatting logic
    *   **Design Pattern**: **Strategy Pattern**.
        *   `LongFormatStrategy`, `ShortFormatStrategy`, `ClassifyFormatStrategy`. This would clean up the `if (longFormat) ... else ...` conditional spaghetti.
