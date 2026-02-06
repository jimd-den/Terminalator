# Implementation Plan: Clean Architecture Refactor & Root Cleanup

## Phase 1: Project Root Reorganization
- [ ] Task: Create `docs/references/` and move `.txt` book files.
- [ ] Task: Move all `.md` reports and legacy plans from root to appropriate `conductor/` subfolders.
- [ ] Task: Update references in any remaining documentation.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Project Root Reorganization'

## Phase 2: VimEngine Dependency Inversion
- [ ] Task: Refactor `VimEngine` to accept `VimInputHandler` and `VimCommandManager` via constructor injection or a specialized provider.
- [ ] Task: Update all instantiations of `VimEngine`.
- [ ] Task: Verify with unit tests.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: VimEngine Dependency Inversion'

## Phase 3: GameManager Breakdown
- [ ] Task: Extract mission-related orchestration from `GameManager` into a `MissionCoordinator` Use Case.
- [ ] Task: Extract lesson-related orchestration from `GameManager` into a `LessonCoordinator` Use Case.
- [ ] Task: Update `GameManager` to delegate to these new Use Cases.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: GameManager Breakdown'
