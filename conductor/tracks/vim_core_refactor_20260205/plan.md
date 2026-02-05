# Implementation Plan - Clean Architecture Vim Refactor

## Phase 1: The Command Pattern (Persistence & Undo)
- [~] Task: Define `IVimCommand` Entity and `CommandHistory` Use Case.
    - [ ] TDD: Write tests for a mock command being executed and undone.
- [ ] Task: Implement `InsertCharCommand` and `DeleteCharCommand`.
    - [ ] TDD: Verify buffer state after undoing an insertion.
- [ ] Task: Implement `VimCommandManager` to handle the Undo/Redo stack.

## Phase 2: The State Pattern (Modes & OCP)
- [ ] Task: Define `IVimMode` Interface (Use Case Layer).
- [ ] Task: Implement `NormalMode` Strategy.
    - [ ] Move `hjkl` and mode transitions (`i`, `a`, `:`) into this class.
    - [ ] TDD: Verify mode transition logic in isolation.
- [ ] Task: Implement `InsertMode` Strategy.
    - [ ] Handle `BACKSPACE`, `ENTER`, and character delegation to `InsertCharCommand`.
- [ ] Task: Refactor `VimEngine` to delegate to the active `IVimMode`.

## Phase 3: Advanced Motions (Strategy Pattern)
- [ ] Task: Implement `MotionStrategy` utilities.
    - [ ] TDD: Test `findNextWordStart` and `findEndOfLine` logic.
- [ ] Task: Implement word-wise movement (`w`, `b`, `e`) in `NormalMode`.
- [ ] Task: Implement `DeleteMotionCommand` (e.g., `dw`, `d$`).

## Phase 4: Command Mode & I/O
- [ ] Task: Extract Command Mode (`:`) logic into a Use Case.
- [ ] Task: Decouple `VimSimulator` from direct `:w` implementation via a `SaveBuffer` Use Case.
