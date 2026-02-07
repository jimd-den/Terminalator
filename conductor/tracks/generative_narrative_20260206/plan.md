# Implementation Plan: Generative Narrative Overhaul

## Phase 1: Hunt and Kill Hardcoded Strings (High Priority)
- [ ] Task: Locate "Uplink established" and similar strings in `GameManager.ts`.
- [ ] Task: Locate static descriptions in `GenericMissionStrategy.ts`.
- [ ] Task: Replace these with calls to `AdaptiveTutorEngine.generateAdvice` or `CombinatorialUtteranceEngine.generate`.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: String Elimination'

## Phase 2: Combinatorial Explosion (High Priority)
- [ ] Task: Expand `LexiconData.ts` with 50+ new words per category (Technobabble, Hacker slang).
- [ ] Task: Add complex sentence structures to `SentenceConstructor` (Compound sentences, conditional clauses).
- [ ] Task: Verify permutation count (mathematically ensure > 1 million).
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Combinatorial Expansion'

## Phase 3: Dynamic Lesson Integration (Medium Priority)
- [ ] Task: Update `GameManager` to generate lesson instructions dynamically using the new engine.
- [ ] Task: Ensure `MissionGrammar` descriptions are generated, not static.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Dynamic Lessons'
