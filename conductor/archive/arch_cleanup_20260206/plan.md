# Implementation Plan: Architecture Cleanup & Error Resolution

## Phase 1: Critical Fixes (High Priority)
- [x] Task: Fix `ReferenceError: fsService is not defined` in `GameContext.tsx`.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Runtime Boot'

## Phase 2: Shell Parser Decoupling (Medium Priority)
- [x] Task: Create `IParser` interface in `domain/interfaces/IParser.ts`.
- [x] Task: Refactor `ShellParser` to implement `IParser`.
- [x] Task: Update all sub-parsers (`IfParser`, `ForParser`, etc.) to depend on `IParser` instead of `ShellParser`.
- [x] Task: Conductor - User Manual Verification 'Phase 2: Shell Cycles'

## Phase 3: Theme & UI Cleanup (Medium Priority)
- [ ] Task: Extract theme types to `src/frameworks-drivers/ui/themes/ThemeTypes.ts`. [IN PROGRESS]
- [ ] Task: Refactor `ThemeContext` to remove direct dependency on `ThemeRegistry` (use injection or lazy loading).
- [ ] Task: Refactor `ThemeRegistry` to remove imports from `ThemeContext` or components that use it.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Theme Cycles'
