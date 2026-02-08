# Unix Edge Lord Implementation Plan
## Philosophy: SOLID, KISS, DRY, Small Composable Functions

This plan breaks down the "Unix Edge Lord" transformation into atomic, testable, and strictly architected steps.

## Phase 1: Core Refactoring (SOLID Foundation)

**Goal:** Eliminate OCP, SRP, and DIP violations to enable extensible mission generation.

### 1.1 Data Layer Abstraction (DIP)
- [ ] **Define Interface:** Create `src/domain/interfaces/IMissionDataProvider.ts`.
    - *Contract:* `fetchMissions(): Promise<MissionDTO[]>`, `fetchMissionById(id: string): Promise<MissionDTO>`.
- [ ] **Implement Adapter:** Create `src/infrastructure/data/JsonMissionDataProvider.ts`.
    - *Logic:* encapsulate the reading of `MissionCatalog.json`.
- [ ] **Refactor Repository:** Modify `MissionRepository` to accept `IMissionDataProvider` in constructor.
    - *Benefit:* Allows swapping JSON for procedural generation later without touching the repository.

### 1.2 Strategy Pattern Implementation (OCP)
- [ ] **Define Strategy Interface:** Create `src/domain/interfaces/IMissionStrategy.ts`.
    - *Contract:* `evaluate(context: MissionContext): MissionResult`.
- [ ] **Create Registry:** Create `src/domain/services/StrategyRegistry.ts`.
    - *Logic:* Singleton or Scoped Map mapping `missionType` string to `IMissionStrategy`.
- [ ] **Refactor TutorService:** Remove hardcoded switch/map statements.
    - *Change:* Inject `StrategyRegistry`. Use `registry.get(mission.type).evaluate(...)`.

### 1.3 Strategy Decomposition (SRP)
- [ ] **Decompose ExfiltrateStrategy:** Break `src/domain/services/mission-strategies/ExfiltrateStrategy.ts` into:
    - `ExfiltrateInspector`: Pure function checking file system state.
    - `ExfiltrateNarrative`: Pure function generating text based on state.
    - `ExfiltrateProgression`: Pure function calculating completion %.
- [ ] **Generic Evaluator:** Create a composable `MissionEvaluator` that takes these three pure functions as arguments.

## Phase 2: The World Simulation (Diegetic Interface)

**Goal:** Implement the "World Graph" and "Unix Device" mapping.

### 2.1 Entity Definitions (Domain Layer)
- [ ] **World Entities:** Create `src/domain/entities/world/`.
    - `Location.ts`: Represents a node (Room, Server, Station).
    - `Device.ts`: Represents a Unix node (e.g., `/dev/airlock`).
    - `Connection.ts`: Edges between Locations (Network or Physical).
- [ ] **NPC Entity:** Create `src/domain/entities/world/NPC.ts`.
    - Properties: `name`, `locationId`, `accessLevel`, `state`.

### 2.2 Simulation Engine (Use Cases)
- [ ] **FileSystem Observer:** Create `src/domain/services/world/FileSystemObserver.ts`.
    - *Responsibility:* Monitor virtual file system writes to specific paths (e.g., `/dev/*`, `/proc/*`).
- [ ] **Effect Dispatcher:** Create `src/domain/services/world/WorldEffectDispatcher.ts`.
    - *Logic:* Map `{ path: "/dev/airlock", content: "OPEN" }` -> `WorldState.update(airlock, OPEN)`.
- [ ] **State Projector:** Create `src/domain/services/world/StateProjector.ts`.
    - *Responsibility:* Periodically write World State back to the File System (read-only views like sensors).

## Phase 3: The Knuthian Constraints (The "Physics")

**Goal:** Enforce algorithmic efficiency via simulated hardware constraints.

### 3.1 Resource Simulation
- [ ] **Bandwidth Simulator:** Create `src/domain/services/constraints/BandwidthSimulator.ts`.
    - *Logic:* `transferTime = size / bandwidth`.
- [ ] **Complexity Estimator:** Create `src/domain/services/constraints/ComplexityEstimator.ts`.
    - *Logic:* Rough analysis of user script (loops, recursion depth) or execution time measurement.

### 3.2 Job Templates
- [ ] **Job Definition:** Create `src/domain/entities/JobTemplate.ts`.
    - *Properties:* `constraints: { maxTimeMs: number, maxMemoryBytes: number }`.
- [ ] **Validation Logic:** Update `MissionValidator` to verify constraints are met, not just output correctness.

## Phase 4: Procedural Generation (The Engine)

**Goal:** Dynamically generate missions based on World State.

### 4.1 Generators
- [ ] **World Generator:** Create `src/domain/services/generation/WorldGenerator.ts`.
    - *Logic:* Generate graph of Locations and Devices.
- [ ] **Mission Factory:** Create `src/domain/factories/ProceduralMissionFactory.ts`.
    - *Logic:* Identify "Needs" in World State (e.g., "Broken Uplink") and generate a Job/Mission to fix it.

## Execution Strategy
1.  **Refactor First:** Complete Phase 1 to ensure the codebase can handle the new complexity.
2.  **Simulate Second:** Build the World Engine (Phase 2) alongside existing missions.
3.  **Constrain Third:** Add the "Physics" (Phase 3) to new procedural missions.
4.  **Generate Last:** Unleash the Procedural Factory (Phase 4).
