# Implementation Plan: Tutor-as-Planner (GOAP Architecture)

## Phase 1: Knowledge Isolation (Blackboard Pattern)
- [x] Task: Define `KnowledgeEntity` types (IP, Path, PID, User) and `TutorKnowledgeBase` entity.
- [x] Task: TDD: Create `TutorKnowledgeBase.test.ts` to verify discovery, recall, and heuristic storage.
- [x] Task: Implement `TutorKnowledgeBase` with literate programming comments explaining the "Truth vs Perception" boundary.
- [x] Task: Type Check: `npx tsc --noEmit`
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Knowledge Isolation' (Protocol in workflow.md)

## Phase 2: GOAP Brain (Planning Engine)
- [ ] Task: Define `IPlannerAction` interface (Preconditions, Effects, Cost).
- [ ] Task: Implement a lightweight `AStar` pathfinder for action chains.
- [ ] Task: TDD: Create `GOAPPlanner.test.ts` to verify resolving a 3-step chain (e.g., Scan -> Identify -> Cat).
- [ ] Task: Implement `GOAPPlanner` using small, composable functions for node expansion and state comparison.
- [ ] Task: Type Check: `npx tsc --noEmit`
- [ ] Task: Conductor - User Manual Verification 'Phase 2: GOAP Brain' (Protocol in workflow.md)

## Phase 3: Strategy Library (Recon & Exfil)
- [ ] Task: Implement `ReconStrategies` (FindFile, NetworkScan) that generate Unix command strings from knowledge.
- [ ] Task: Implement `ExfilStrategies` (GrepContent, ReadFile).
- [ ] Task: TDD: Verify strategies output valid, idiomatic shell strings using `sh-parse` logic or simple regex checks.
- [ ] Task: Type Check: `npx tsc --noEmit`
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Strategy Library' (Protocol in workflow.md)

## Phase 4: Sensory Input (The Interpreter)
- [ ] Task: Implement `OutputInterpreter` using the Interpreter Pattern to parse `ls`, `ifconfig`, and `grep` outputs.
- [ ] Task: TDD: Verify `ls -la` output adds multiple `KnowledgeEntity` items to the Blackboard.
- [ ] Task: Wire `TutorObserver` to feed simulation `stdout` into the `OutputInterpreter`.
- [ ] Task: Type Check: `npx tsc --noEmit`
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Sensory Input' (Protocol in workflow.md)

## Phase 5: Refactor Planning Loop (Integration)
- [ ] Task: Refactor `TutorEngine.ts` to replace the linear mission tracker with the GOAP Loop.
- [ ] Task: Integrate `RhythmHUD` to pull the "Current Step" from the Planner's active chain.
- [ ] Task: Audit and Refactor for SOLID/DRY: Ensure strategies are decoupled from the core Planner.
- [ ] Task: Religious Final Type Check: `npx tsc --noEmit`
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Planning Loop' (Protocol in workflow.md)
