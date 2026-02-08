# Specification: Generative Narrative Overhaul

## Overview
The user reports persisting hardcoded strings ("Uplink established") despite the generative architecture. This track focuses on hunting down these legacy strings in `GameManager` and `Lesson` definitions and replacing them with calls to the `AdaptiveTutorEngine`.

## Core Pillars

### 1. Legacy String Elimination
**Goal:** Identify and remove all instances of hardcoded strings like "Uplink established" or "Connection secured".
*   **Targets:** `GameManager.startMission`, `GenericMissionStrategy` fallback hints, `CombinatorialFactory` descriptions.

### 2. Combinatorial Expansion (The Million Sentence Goal)
**Goal:** Ensure the `Lexicon` and `SentenceConstructor` are rich enough to generate 1,000,000+ unique permutations.
*   **Mechanism:**
    *   Expand `LexiconData.ts` significantly (more synonyms, tech jargon, adjectives).
    *   Add more recursive grammar structures to `SentenceConstructor` (e.g., [Intro] + [Imperative] + [Reason] + [Consequence]).
    *   Use `CombinatorialUtteranceEngine` for *all* mission briefing and lesson instruction text.

### 3. Dynamic Lesson Instructions
**Goal:** The `Lesson` object's `instructions` field must be generated, not static.
*   **Mechanism:**
    *   When `GameManager` or `GenericMissionStrategy` creates a `Lesson`, it must query the `AdaptiveTutorEngine` for the instruction text.

## Architectural Changes
- **Refactor:** `GameManager.startMission` to use `AdaptiveTutorEngine`.
- **Refactor:** `GenericMissionStrategy` to use `AdaptiveTutorEngine` for `START_LESSON` payloads.
- **Data:** Massive expansion of `LexiconData.ts`.
