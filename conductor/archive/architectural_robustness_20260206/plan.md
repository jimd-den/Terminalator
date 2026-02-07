# Implementation Plan: Architectural Robustness & Path Unity

## Phase 1: System Preparation & Initialization (High Priority)
- [ ] Task: Modify `IMissionStrategy` to return `SystemPreparationSpec`.
- [ ] Task: Update `MissionInstantiationService` to call `WorldPatchService.patch()` before mission activation.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: System Prep'

## Phase 2: Shell Execution Refactor (High Priority)
- [ ] Task: Refactor `ExecuteCommand` to be a standalone domain service.
- [ ] Task: Refactor `GameCommandExecutor` to compose `ExecuteCommand` instead of inheriting.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Composition Refactor'

## Phase 3: World-State Validation (Medium Priority)
- [ ] Task: Add validation in `ProceduralMissionFactory.ts` via `IWorldStateProvider`.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: World Validation'

## Phase 4: Unified Path Resolver (Medium Priority)
- [ ] Task: Create `src/domain/services/filesystem/PathResolver.ts`.
- [ ] Task: Refactor `CdCommand`, `CatCommand`, and `FileSystemService` to use `PathResolver`.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Path Resolver'
