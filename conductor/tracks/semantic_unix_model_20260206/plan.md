# Implementation Plan: Semantic Unix Model & Constraint-Based Generation

## Phase 1: The Unix Knowledge Base (High Priority)
- [x] Task: Define `UnixCommandDefinition`, `UnixFlag`, and `CommandCapability` (Expanded) interfaces.
- [x] Task: Implement `UnixKnowledgeBase` service and populate it with core commands (`grep`, `ls`, `cd`, `rm`, `cat`, `awk`).
- [x] Task: Verify: Ensure the KB can be queried by capability (e.g., "Get all SEARCH tools").
- [x] Task: Conductor - User Manual Verification 'Phase 1: Knowledge Base'

## Phase 2: Constraint-Based Factory (High Priority)
- [x] Task: Create `ConstraintMissionFactory` (replacing/wrapping `CombinatorialFactory`).
- [x] Task: Implement `ConstraintSolver` to chain tools (e.g., `chmod` -> `grep`) to solve composite problems.
- [ ] Task: Implement logic to solve a "Problem Statement" (e.g., "Find text in file") by selecting a tool from the KB. [IN PROGRESS]
- [ ] Task: Ensure the Factory generates a `MissionGrammar` and `SystemPreparationSpec` derived *directly* from the selected tool's requirements.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Constraint Factory'

## Phase 3: Tutor Integration (Medium Priority)
- [x] Task: Refactor `TechnicalThesaurus` to consume `UnixKnowledgeBase`.
- [x] Task: Update `UtteranceEngine` to use Combinatorial Logic (Vocabulary Pools + Structures).
- [x] Task: Implement `SentenceConstructor` to build sentences from parts-of-speech (No templates).
- [x] Task: Create `Lexicon` with tagged vocabulary (Tech, Emotion, Urgent).
- [ ] Task: Update `AdaptiveTutorEngine` to use `SentenceConstructor` for dynamic generation. [IN PROGRESS]
- [ ] Task: Verify: Tutor explains "why" based on the generated mission's specific flags.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Tutor Integration'