# Specification: Tutor-as-Planner (GOAP Architecture) & The Neo-Retro Lattice

## Overview
This track unifies the **Tutor-as-Planner** (an autonomous agent capable of reasoning) with **The Neo-Retro Lattice** (a procedurally generated, historically simulated world) and **The Economy of Computation**. The Tutor serves as the primary "verification agent" for the generated world, ensuring that every procedurally generated scenario is solvable, while guiding the user through a resource-driven "Heist" loop.

## Core Pillars

### 1. The Blackboard (Perception)
*   **Component:** `TutorKnowledgeBase`.
*   **Logic:** A localized memory store distinct from the global world state. Stores "Discovered Truths" (IPs, file paths, PIDs) and "Heuristic Beliefs".
*   **Goal:** Ensure the Tutor only operates on what it has "seen", preventing omniscience.

### 2. The GOAP Planner (Brain)
*   **Algorithm:** Goal-Oriented Action Planning.
*   **Action Library:** Composable `ICommandStrategy` classes (Recon, Exfil, Sabotage).
*   **Tool Gating:** Strategies can have **Tool Preconditions** (e.g., `Requires: "autopwn.sh"`).
*   **Goal:** Generate unique, valid Unix command chains that adapt to the sandbox's layout and the user's inventory.

### 3. The Neo-Retro Lattice (World Generation)
*   **Vision:** A "Dwarf Fortress" of Cyber-Simulation. A graph of isolated nodes (servers) connected by "Hyperlinks" (IPs/Paths found in text artifacts).
*   **Pipeline:**
    1.  **Phase 0: The Seed:** Deterministic PRNG (`UserSeed123` + Salt).
    2.  **Phase 1: Macro-Simulation (History):** Generate Polities (Laws), Organizations (Corps, DAOs), and Conflicts (Mergers, Hacks).
    3.  **Phase 2: Topology (The Skeleton):** Generate Network Graphs based on Org type (Hierarchy vs. Mesh). **Vendor Nodes** are spawned here.
    4.  **Phase 3: Entity Population (Actors):** Assign NPCs (Lazy Sysadmin, Paranoid CSO) to nodes.
    5.  **Phase 4: Artifact Synthesis (The Web):** Generate files (.mbox, logs) containing "Hyperlinks" (IPs, Credentials) to other nodes.

### 4. The Economy of Computation (Resource Loop)
*   **ZCoins (Ƶ):** A system resource, not just a UI number.
*   **Mining:** Captured nodes (Root access) allow installing `miner_daemon` to generate passive ZCoins based on Node CPU stats.
*   **Spending:** `transfer` command to buy tools from **Vendor Nodes** (Black Market).
*   **Tools:** Executables (e.g., `autopwn.sh`, `decrypter.bin`) that unlock specific Planner Strategies.

### 5. Output Interpretation (Sensory Input)
*   **Component:** `OutputInterpreter`.
*   **Logic:** Parses simulated `stdout` (e.g., `ls`, `ifconfig`) to update the Blackboard.

## Functional Requirements
- [x] Implement `TutorKnowledgeBase` (Blackboard).
- [x] Implement `GOAPPlanner` (Brain).
- [x] Implement `ICommandStrategy` library (Recon, Exfil).
- [x] Implement `OutputInterpreter` (Sensory Input).
- [ ] Implement `WorldSeed` service for deterministic randomness.
- [ ] Implement `HistorySimulator` to generate Factions and Conflicts.
- [ ] Implement `NetworkGraphGenerator` for topology (Star, Mesh).
- [ ] Implement `FileSystemHydrator` to populate nodes with artifact files.
- [ ] Implement `MiningService` to calculate passive income from captured nodes.
- [ ] Implement `VendorService` and `transfer` command for tool purchases.
- [ ] Refactor `TutorEngine` to run the GOAP Planning Loop.
- [ ] Implement `WorldVerifier` using the Tutor to prove world solvability.

## Data Structures (ECS Approach)
```typescript
type EntityId = string;

interface Components {
  NetworkIdentity: { ip: string; hostname: string; mac: string };
  FileSystem: { root: DirectoryNode };
  SecurityProfile: { firewallRules: Rule[]; encryptionLevel: number };
  VulnerabilityState: { openPorts: number[]; unpatchedServices: string[] };
  SocialGraph: { reportsTo: EntityId; friendsWith: EntityId[] };
  EconomicProfile: { cpuPower: number; isVendor: boolean; inventory: Tool[] };
}

interface WorldLattice {
  nodes: Map<EntityId, Entity>;
  edges: Edge[];
  hyperlinks: Hyperlink[];
}
```

## Acceptance Criteria
- [ ] **Determinism:** The same Seed always produces the exact same World (History, Topology, Files).
- [ ] **Solvability:** The Tutor can autonomously navigate from a random Start Node to an Objective Node using only information found in files.
- [ ] **Economy Integration:** The Tutor can plan to "Mine ZCoins" -> "Buy Tool" -> "Hack Node" if a tool is required.
- [ ] **Diversity:** Generated worlds feature distinct topologies (Corporate vs. DAO) and narratives.
- [ ] **Performance:** World generation completes within acceptable limits (<2s), and Planning Loop remains performant.

## Out of Scope
- Multiplayer/Collaborative world editing.
- 3D visualization of the graph (Text/Terminal only for now).
