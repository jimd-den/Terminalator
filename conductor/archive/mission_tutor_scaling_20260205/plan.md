# Implementation Plan: Mission & Tutor Scaling Mega Track

## Phase 1: The Grammar Foundation [checkpoint: cc35385]
- [x] Task: Define the `GrammarRegistry` (Motives, Verbs, Nouns) and the `StructuredCommand` protocol. 9639e0a
- [x] Task: Implement the `CombinatorialFactory` Use Case for basic mission assembly. 7687b9b
- [ ] Task: Conductor - User Manual Verification 'Phase 1: The Grammar Foundation' (Protocol in workflow.md)

## Phase 2: POSIX Smart Migration [checkpoint: 5447359]
- [x] Task: Refactor "Core File Ops" group (20 tools) to implement `UtilityCapability` protocols. 8e639bc
- [x] Task: Refactor "Text Processing" group (10 tools) to implement `UtilityCapability` protocols (Grep, Cat, etc.). 32563f7
- [ ] Task: Verify compliance for the first 30 tools using `posix_comprehensive_suite.ts`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: POSIX Smart Migration' (Protocol in workflow.md)

## Phase 3: Tutor Intent & Mastery Integration [checkpoint: cf0303e]
- [x] Task: Implement the `MissionVisitor` and `IntentInterpreter` to allow the Tutor to "read" missions. 3e54eb6
- [x] Task: Connect `MasteryTracker` to the `CombinatorialFactory` for learning-zone filtering. 9c3fa11
- [x] Task: Implement the "Tutor-Led Progression" logic (forcing missions based on errors). 0a35f64
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Tutor Intent & Mastery' (Protocol in workflow.md)

## Phase 4: Dynamic Intensity & Persona Logic
- [x] Task: Implement the `MasteryGapIntensity` calculator for dialogue scaling. 96f22a4
- [x] Task: Upgrade `PersonaLoader` with a `VariableTemplateEngine` for persona-specific dynamic dialogue. 2833e1b
- [x] Task: Implement `CombinatorialDialogueAssembler` for massive dialogue variety (Structures x Fragments). a706928
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Dynamic Intensity' (Protocol in workflow.md)

## Phase 5: Mega-Scale Stress Test & Finalization
- [x] Task: Run a combinatorial stress test to verify 10,000+ valid permutations. 44979c1
- [x] Task: Perform a final system-wide compliance run using the comprehensive suite. 82d1a51
- [x] Task: Conductor - User Manual Verification 'Phase 5: Mega-Scale Finalization' (Protocol in workflow.md)
