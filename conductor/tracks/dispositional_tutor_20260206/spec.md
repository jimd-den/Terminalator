# Specification: Dispositional Tutor AI

## Overview
The TutorBot must evolve from a simple template engine to a **Pure Functional Utterance Engine** that maps state and personality to specific actions. This track focuses on separating "Intent" (What) from "Tone" (How).

## Core Pillars

### 1. The Utterance Engine (Pure Logic)
**Goal:** Deterministic, testable dialogue generation.
*   **Concept:** `f(Intent, Tone, Context) -> TutorAction`.
*   **Mechanism:** A pure function that filters a **Template Catalog** based on the Intent and Tone, then performs string interpolation with the Context.

### 2. Tutor Intent & Tone (The Grammar)
**Goal:** Formalize communication moves.
*   **TutorIntent:** `EXPLAIN_COMMAND`, `NUDGE`, `REPRIMAND`, `CELEBRATE`, etc.
*   **TutorToneProfile:** `GENTLE_GUIDE`, `SNARKY_SYSADMIN`, `CORPORATE_DRONE`, `RESISTANCE_LEADER`.
*   **Mechanism:** Mission Strategies trigger an *Intent*. The Tutor's current state determines the *Tone*.

### 3. PsychAdapter (Personality Manager)
**Goal:** Dynamic personality modulation.
*   **Component:** `PsychAdapter` service.
*   **Concept:** Maintains the `ToneProfile` based on game events (e.g., failing a mission shifts tone from `GENTLE` to `SNARKY`).

### 4. Metaprogramming Proxies (Deep Context)
**Goal:** Provide the "Context" with deep insight.
*   **Implementation:** `TutorProxy`.
*   **Mechanism:** Wrap `FileSystem`, `CpuState`, and `Environment` in a TypeScript `Proxy`. This allows the Tutor to "see" specific values (e.g., "You set x1 to 0") to populate the Context.
