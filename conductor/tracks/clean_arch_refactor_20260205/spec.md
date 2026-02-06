# Specification: Clean Architecture Refactor & Root Cleanup

## Overview
Based on the Comprehensive Compliance Report, this track implements prioritized architectural improvements to resolve identified violations and reduce project clutter.

## Functional Requirements
- **Invert Entity Dependencies:** Refactor `VimEngine.ts` to remove direct dependencies on Use Cases (`VimInputHandler`, `VimCommandManager`).
- **Refactor GameManager:** Break down the `GameManager` facade into smaller, specialized Use Cases (e.g., `MissionCoordinator`, `LessonCoordinator`).
- **Project Root Reorganization:** 
    - Move all `.md` audit reports and plans from the root to `conductor/archive/` or `conductor/tracks/`.
    - Move vision/narrative documents to `vision/`.
    - Move book references (`.txt`) to `docs/references/`.
- **Infrastructure Abstraction:** (Optional/Stretch) Move pure logic out of at least one React Hook Controller in `src/interface-adapters`.

## Acceptance Criteria
- `VimEngine` no longer imports files from `src/domain/usecases`.
- `GameManager` logic is distributed among at least two new Use Case classes.
- Project root contains only essential configuration and README files.
- All existing tests pass.
