# Specification: Semantic Unix Model & Constraint-Based Generation

## Overview
The goal is to eliminate static "archetypes" (e.g., "log-analysis") and instead generate missions dynamically by solving constraints against a **Unix Knowledge Base**. Both the Mission Generator and the Tutor will rely on this single source of truth to understand *what* a command does, *how* it is used, and *why* it solves a specific problem.

## Core Pillars

### 1. The Unix Knowledge Base (The Source of Truth)
**Goal:** A rich, queriable registry of Unix commands, flags, and their semantic effects.
*   **Structure:** `UnixCommandDefinition`
    *   `name`: "grep"
    *   `capabilities`: ["SEARCH", "FILTER"]
    *   `flags`:
        *   `-r`: { effect: "RECURSIVE", description: "Search directories recursively" }
        *   `-l`: { effect: "LIST_FILES", description: "List matching files only" }
    *   `constraints`: { requiresInput: true, outputType: "TEXT" }

### 2. Constraint-Based Mission Generation
**Goal:** Generate missions by defining a *problem state* and finding a *solution path* using the Knowledge Base.
*   **Mechanism:**
    1.  **Define Goal:** e.g., "Find a string hidden in a nested directory."
    2.  **Query Knowledge Base:** "Find a command with capability SEARCH that supports RECURSIVE." -> `grep -r` or `find | xargs grep`.
    3.  **Generate Step:** Create a `StepRule` that requires this specific command chain.
    4.  **Populate World:** Create the nested directory structure required by the solution.
*   **Combinatorial Scale:** The "Problem" is not a static string. It is a procedural composition of **Constraints** (e.g., `Hidden(Recursive) + Encrypted(Rot13) + Locked(Permission)`).
    *   The Generator solves this by chaining tools: `chmod` -> `grep -r` -> `tr`.
    *   This creates **millions** of valid mission permutations from a finite set of atomic constraints.

### 4. Grammar-Based Sentence Generation (True Randomness)
**Goal:** Eliminate all fixed templates. The Tutor constructs sentences syntactically.
*   **Mechanism:**
    *   **Lexicon:** A database of parts-of-speech (Nouns, Verbs, Adjectives) tagged with semantic intent (e.g., "urgent", "technical").
    *   **Syntax Engine:** Assembles components: `[Imperative Verb] + [Technical Object] + [Reason Clause]`.
    *   **Context Injection:** The "Technical Object" is derived from the User's live input or the Mission state.
    *   **Output:** Instead of "Use grep," it generates: "Deploy the search utility immediately," or "Execute a pattern filter now."

## Architectural Changes
- **New Service:** `UnixKnowledgeBase` (Domain Service).
- **Refactor:** `CombinatorialFactory` -> `ConstraintMissionFactory`.
- **Refactor:** `IStructuredCommand` to link deeply with `UnixCommandDefinition`.