# Implementation Plan: Generative Mission Architecture

## Phase 1: Simulation Bus & Observer Foundation (High Priority)
- [x] Task: Create `SimulationBus` class (Event Emitter).
- [x] Task: Define `GameEvent` types (e.g., `CommandExecutedEvent`, `RegisterModifiedEvent`).
- [x] Task: Refactor `ShellInterpreter` and `RISCVInterpreter` to emit `GameEvent`s.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Simulation Bus'

## Phase 2: Mission Grammar & Generic Strategy (High Priority)
- [x] Task: Define the "Mission Grammar Domain" (`StepRule`, `StepTransition`, `MissionGrammar` interfaces).
- [x] Task: Implement `GenericMissionStrategy` class (The engine that runs the `MissionGrammar`).
- [x] Task: Design Scheme Macros to output this Grammar Data (e.g., `define-mission`).
- [x] Task: Conductor - User Manual Verification 'Phase 2: Grammar & Strategy'

## Phase 3: Instantiation & World Patching (Medium Priority)
- [x] Task: Define `SystemPreparationSpec` interface.
- [x] Task: Refactor `SystemPreparationService` into `WorldPatchService` (accepts `SystemPreparationSpec`).
- [x] Task: Implement `MissionInstantiationService` (Seed -> `MissionGrammar` + `SystemPreparationSpec`).
- [x] Task: Conductor - User Manual Verification 'Phase 3: Instantiation & Bridge'

## Phase 4: Vertical Slice Prototype (Medium Priority)
- [x] Task: Build one full mission (e.g., "Breach Server") using: Scheme DSL -> Grammar Data -> Generic Strategy -> Simulation Bus.
- [x] Task: Verify that the mission completes successfully upon correct event sequence.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Vertical Slice Prototype'

## Phase 5: Infinite Scaling & Cleanup (High Priority)
- [ ] Task: Fix Regression: Restore Tutor pushing `net-scan` to `RhythmHUD` in `TutorObserver.ts`.
- [ ] Task: Cleanup: Delete dead code `ProceduralMissionFactory.ts`.
- [ ] Task: Refactor: Virtualize `WorldGenerator.ts` to use lazy generation (Behavior instead of State).
- [ ] Task: Evolution: Map `ConstraintMissionFactory` solved steps directly to `MissionGrammar`.
- [ ] Task: Verify: Run `test_world_gen.ts` and `WorldGenerationPipeline.test.ts`.

