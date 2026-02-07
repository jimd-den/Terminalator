# Specification: Architectural Robustness & Path Unity

## Overview
This track addresses four key architectural improvements to ensure the system is stable, maintainable, and aligned with its intended experience.

## Core Pillars

### 1. System Preparation Specification
**Goal:** Ensure the environment is correctly set up before a mission starts.
*   **Refactor:** `IMissionStrategy` will now return a `SystemPreparationSpec`.
*   **Action:** `MissionInstantiationService` will call `WorldPatchService.patch()` before marking a mission as active.

### 2. Composition over Inheritance in Shell Execution
**Goal:** Decouple `GameCommandExecutor` from `ExecuteCommand`.
*   **Refactor:** `ExecuteCommand` becomes a standalone domain service. `GameCommandExecutor` will compose `ExecuteCommand`.

### 3. Lens of the Inhabitant: World-State Validation
**Goal:** Ensure mission targets exist in the simulated world.
*   **Action:** Add validation in `ProceduralMissionFactory.ts` to query `IWorldStateProvider` and verify that targeted `Device` paths exist in the `InodeTable`.

### 4. Unified Path Resolver
**Goal:** Consolidate path resolution logic.
*   **Mechanism:** Create a central `PathResolver.ts` to handle relative-to-absolute path logic consistently across all commands and services.
