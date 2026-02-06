# Specification: Mission & Tutor Scaling (Mega Track)

## Overview
This "Mega Track" aims to scale the Terminalator Mission Generator to 10,000+ permutations and implement a dynamic, context-aware Tutor system. It transitions the codebase from hardcoded archetypes and reactive scripting to a "Mission Grammar" and "Intent Interpretation" model. This track prioritizes the "gbòǹgbò" (root) architectural shifts necessary for comprehensive POSIX mastery.

## Functional Requirements
- **Grammar Registry & Combinatorial Factory:**
    - Implement a registry for Motives, Verbs, Nouns, and Utilities.
    - Develop a Combinatorial Factory that generates valid Mission entities by cross-multiplying these pools.
- **Structured Command Model:**
    - Refactor 170+ POSIX utilities to implement `UtilityCapability` protocols (e.g., `IFilterable`, `IModifiable`).
    - Enable programmatic construction of commands by the Factory.
    - Ensure 100% compliance with `posix_comprehensive_suite.ts` during refactoring.
- **Tutor-Led Progression:**
    - Integrate `MasteryTracker` into the Mission Generator to filter permutations based on the user's "Current Learning Zone".
    - Logic for the Tutor to proactively "suggest" or "force" missions based on recent user performance (stalls/mistakes).
- **Mastery-Gap Pedagogical Intensity:**
    - Implement dynamic dialogue scaling: High hand-holding (hints) for new utilities (<20% mastery) and high chastising (mocking) for mastered utilities.

## Non-Functional Requirements
- **Clean Architecture Adherence:** Strict separation between Generation logic (Use Cases) and Utility implementations (Entities/Adapters).
- **Universal Readability:** Use semantic naming for the Grammar registries so domain experts can understand the "Reality-Based" mission motives.
- **Literate Documentation:** Treatment of the implementation as a technical whitepaper.

## Acceptance Criteria
- **Variety Milestone:** The generator can produce 10,000+ logically valid, unique mission permutations.
- **Compliance Milestone:** All refactored utilities pass the `posix_comprehensive_suite.ts`.
- **Dynamic Hand-holding:** The Tutor demonstrates different intensities based on user mastery levels in a simulated walkthrough.

## Out of Scope
- Visual rendering improvements for the Terminal UI.
- Multiplayer or network-based mission synchronization.
