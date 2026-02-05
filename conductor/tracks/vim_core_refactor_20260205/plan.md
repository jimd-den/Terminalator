# Implementation Plan - Clean Architecture Vim Refactor

## Phase 1: The Command Pattern (Persistence & Undo)
- [x] Task: Define `IVimCommand` Entity and `CommandHistory` Use Case. 1fb0c81
    - [x] TDD: Write tests for a mock command being executed and undone. 1fb0c81
- [x] Task: Implement `InsertCharCommand` and `DeleteCharCommand`. 1fb0c81
    - [x] TDD: Verify buffer state after undoing an insertion. 1fb0c81
- [x] Task: Implement `VimCommandManager` to handle the Undo/Redo stack. 1fb0c81

## Phase 2: The State Pattern (Modes & OCP)
- [x] Task: Define `IVimMode` Interface (Use Case Layer). 4d5b958
- [x] Task: Implement `NormalMode` Strategy. 4d5b958
    - [ ] Move `hjkl` and mode transitions (`i`, `a`, `:`) into this class.
    - [ ] TDD: Verify mode transition logic in isolation.
- [x] Task: Implement `InsertMode` Strategy. 1478630
    - [ ] Handle `BACKSPACE`, `ENTER`, and character delegation to `InsertCharCommand`.
- [x] Task: Refactor `VimEngine` to delegate to the active `IVimMode`. 9a6b9d1

## Phase 3: Advanced Motions (Strategy Pattern)
- [ ] Task: Implement `MotionStrategy` utilities.
    - [ ] TDD: Test `findNextWordStart` and `findEndOfLine` logic.
- [ ] Task: Implement word-wise movement (`w`, `b`, `e`) in `NormalMode`.
- [ ] Task: Implement `DeleteMotionCommand` (e.g., `dw`, `d$`).

## Phase 4: Command Mode & I/O
- [ ] Task: Extract Command Mode (`:`) logic into a Use Case.
- [ ] Task: Decouple `VimSimulator` from direct `:w` implementation via a `SaveBuffer` Use Case.
