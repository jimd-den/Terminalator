# Specification: Architecture Cleanup & Error Resolution

## Overview
The application is crashing on boot due to `ReferenceError: fsService is not defined`. Additionally, the console is flooded with "Require cycle" warnings indicating deep structural issues in the `ShellParser` and `ThemeContext`. This track aims to stabilize the runtime and clean up the dependency graph.

## Core Pillars

### 1. Critical Runtime Fix (GameContext)
**Goal:** Fix the "White Page" crash.
*   **Root Cause:** `fsService` is being used in `useState` initializers before it is declared or initialized within the component scope.
*   **Solution:** Reorder state initialization or use `useMemo` for derived dependencies.

### 2. Shell Parser Decoupling
**Goal:** Eliminate `ShellParser` <-> `SubParser` cycles.
*   **Mechanism:**
    *   Introduce an `IParser` interface.
    *   Inject `ShellParser` (as `IParser`) into sub-parsers rather than importing the concrete class.
    *   Or, use a registry/factory pattern to break the import cycle.

### 3. Theme Architecture Cleanup
**Goal:** Eliminate `ThemeContext` <-> `ThemeRegistry` cycles.
*   **Mechanism:**
    *   Move shared types to a separate `ThemeTypes.ts` file.
    *   Ensure `ThemeRegistry` does not import `ThemeContext`.
    *   Refactor components to accept theme props or use a lighter-weight hook if necessary.

## Architectural Changes
- **GameContext.tsx:** Reordered initialization logic.
- **ShellParser.ts:** Refactored to use interface injection.
- **ThemeContext.tsx:** Extracted types and broke registry dependency.
