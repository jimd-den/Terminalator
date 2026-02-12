# Specification: Dispositional Tutor AI

## Overview
The TutorBot must evolve from a simple template engine to a **Pure Functional Utterance Engine** that maps state and personality to specific actions. This track focuses on separating "Intent" (What) from "Tone" (How).

## Core Pillars

### 1. The Utterance Engine (Pure Logic)
**Goal:** Deterministic, testable dialogue generation.
*   **Concept:** `f(Intent, Tone, Context) -> TutorAction`.
*   **Mechanism:** `CombinatorialUtteranceEngine`. A pure function that filters a **Template Catalog** based on the Intent and Tone, then performs string interpolation with the Context.

### 2. Event-Driven Reactivity (The Nervous System)
**Goal:** Inversion of Control to enable proactive behavior.
*   **Concept:** The Tutor "listens" rather than being "called".
*   **Mechanism:** `TutorObserver`. Subscribes to the `SimulationBus`. Maps low-level `GameEvent`s to high-level `TutorIntent`s.
*   **Architecture:** Adheres to the "Humble View" pattern; UI components are passive receivers of tutor messages.

### 3. Tutor Intent & Tone (The Grammar)
**Goal:** Formalize communication moves.
*   **TutorIntent:** `EXPLAIN_COMMAND`, `NUDGE`, `REPRIMAND`, `CELEBRATE`, etc.
*   **TutorToneProfile:** `GENTLE_GUIDE`, `SNARKY_SYSADMIN`, `CORPORATE_DRONE`, `RESISTANCE_LEADER`.
*   **Mechanism:** `PsychAdapter` maintains the current `ToneProfile`.

### 4. Metaprogramming Proxies (Deep Context)
**Goal:** Provide the "Context" with deep insight.
*   **Implementation:** `TutorProxy`.
*   **Mechanism:** Wrap `FileSystem`, `CpuState`, and `Environment` in a TypeScript `Proxy`. This allows the Tutor to "see" specific values (e.g., "You set x1 to 0") to populate the Context.
