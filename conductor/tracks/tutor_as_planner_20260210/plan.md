# Implementation Plan: Tutor-as-Planner (GOAP Architecture) & The Neo-Retro Lattice

## Phase 1: Knowledge Isolation (Blackboard Pattern) [checkpoint: b9b880b]
- [x] Task: Define `KnowledgeEntity` types (IP, Path, PID, User) and `TutorKnowledgeBase` entity.
- [x] Task: TDD: Create `TutorKnowledgeBase.test.ts` to verify discovery, recall, and heuristic storage.
- [x] Task: Implement `TutorKnowledgeBase` with literate programming comments explaining the "Truth vs Perception" boundary.
- [x] Task: Type Check: `npx tsc --noEmit`
- [x] Task: Conductor - User Manual Verification 'Phase 1: Knowledge Isolation' (Protocol in workflow.md)

## Phase 2: GOAP Brain (Planning Engine) [checkpoint: 1fc69e8]
- [x] Task: Define `IPlannerAction` interface (Preconditions, Effects, Cost).
- [x] Task: Implement a lightweight `AStar` pathfinder for action chains.
- [x] Task: TDD: Create `GOAPPlanner.test.ts` to verify resolving a 3-step chain (e.g., Scan -> Identify -> Cat).
- [x] Task: Implement `GOAPPlanner` using small, composable functions for node expansion and state comparison.
- [x] Task: Type Check: `npx tsc --noEmit`
- [x] Task: Conductor - User Manual Verification 'Phase 2: GOAP Brain' (Protocol in workflow.md)

## Phase 3: Strategy Library (Recon & Exfil) [checkpoint: 99bbd13]
- [x] Task: Implement `ReconStrategies` (FindFile, NetworkScan) that generate Unix command strings from knowledge.
- [x] Task: Implement `ExfilStrategies` (GrepContent, ReadFile).
- [x] Task: TDD: Verify strategies output valid, idiomatic shell strings using `sh-parse` logic or simple regex checks.
- [x] Task: Type Check: `npx tsc --noEmit`
- [x] Task: Conductor - User Manual Verification 'Phase 3: Strategy Library' (Protocol in workflow.md)

## Phase 4: Sensory Input (The Interpreter) [checkpoint: a865aec]
- [x] Task: Implement `OutputInterpreter` using the Interpreter Pattern to parse `ls`, `ifconfig`, and `grep` outputs.
- [x] Task: TDD: Verify `ls -la` output adds multiple `KnowledgeEntity` items to the Blackboard.
- [x] Task: Wire `TutorObserver` to feed simulation `stdout` into the `OutputInterpreter`.
- [x] Task: Type Check: `npx tsc --noEmit`
- [x] Task: Conductor - User Manual Verification 'Phase 4: Sensory Input' (Protocol in workflow.md)

## Phase 5: World Gen - Foundation (Seed & History)
- [x] Task: Implement `WorldSeed` service in `src/domain/services/world/generation/WorldSeed.ts`.
- [x] Task: TDD: Verify deterministic output from `WorldSeed` using Bun.
- [x] Task: Implement `HistorySimulator` in `src/domain/services/world/generation/HistorySimulator.ts` (Factions, Conflicts).
- [x] Task: TDD: Verify consistent history generation from same seed.
- [x] Task: Type Check: `npx tsc --noEmit`
- [ ] Task: Conductor - User Manual Verification 'Phase 5: World Gen - Foundation' (Protocol in workflow.md)

## Phase 6: World Gen - Topology & Population
- [x] Task: Implement `NetworkGraphGenerator.ts` (Star, Mesh, Ring topologies).
- [x] Task: Implement `NPCPopulator.ts` to assign `Actors` to specific `Nodes`.
- [x] Task: Add `isVendor` and `inventory` components to the Node data structure.
- [x] Task: TDD: Verify graph connectivity and vendor placement.
- [x] Task: Type Check: `npx tsc --noEmit`
- [ ] Task: Conductor - User Manual Verification 'Phase 6: World Gen - Topology' (Protocol in workflow.md)

## Phase 7: World Gen - Hydration & Artifacts
- [x] Task: Implement `FileSystemHydrator.ts` to convert abstract Graph Nodes into `FileSystem` entities.
- [x] Task: Implement `ArtifactSynthesizer.ts` (Markov/Templates) to generate files with embedded "Hyperlinks".
- [x] Task: Refactor `WorldGenerator.ts` to orchestrate the new Pipeline (Seed -> History -> Topology -> Hydration).
- [x] Task: TDD: Verify "Hyperlinks" (IPs/Paths) are correctly embedded in generated text files.
- [x] Task: Type Check: `npx tsc --noEmit`
- [ ] Task: Conductor - User Manual Verification 'Phase 7: World Gen - Artifacts' (Protocol in workflow.md)

## Phase 8: Economy - Money as a Process
- [x] Task: Create `src/domain/entities/economy/Wallet.ts`.
- [x] Task: Implement `TransferCommand.ts` in `src/domain/commands/core/`.
- [x] Task: Refactor `EconomyService.ts` to calculate passive ZCoins based on captured node CPU stats.
- [x] Task: Implement `ToolRegistry.ts` for buyable capabilities (e.g., `autopwn.sh`).
- [x] Task: TDD: Verify `transfer` command deducts funds and "downloads" tools to `/bin`.
- [x] Task: Type Check: `npx tsc --noEmit`
- [ ] Task: Conductor - User Manual Verification 'Phase 8: Economy' (Protocol in workflow.md)

## Phase 9: Integration - The Heist Loop
- [x] Task: Update `GOAPPlanner.ts` to handle Tool preconditions and buy-actions.
- [x] Task: Refactor `TutorEngine.ts` to run the Planning Loop (Analyze -> Plan -> Suggest).
- [x] Task: Implement `WorldVerifier.ts` to prove Start -> Goal solvability via information discovery.
- [x] Task: Integrate `RhythmHUD.tsx` to display the active Planner chain (The "Plan").
- [x] Task: Type Check: `npx tsc --noEmit`
- [ ] Task: Conductor - User Manual Verification 'Phase 9: Integration' (Protocol in workflow.md)
