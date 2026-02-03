# Data to Procedural Generation Pipeline Plan

**Goal:** Create a pipeline that transforms static JSON data and procedural seeds into a rich, interactive, and consistent game world (Locations, Devices, Connections) where missions can take place. This pipeline must respect the "Unix Edge Lord" theme and adhere to Clean Architecture (Martin) and Object-Oriented Analysis and Design (Booch) principles.

## 1. Architectural Alignment

### 1.1 Clean Architecture (Martin)
*   **Independence:** The generation logic (Domain Service) must be independent of the UI and frameworks.
*   **Entities:** The core data structures (`Location`, `Device`, `Connection`) are Domain Entities.
*   **Use Cases:** The act of generating a world is a Use Case (e.g., `GenerateWorld`).
*   **Interfaces:** We will use interfaces (`IGenerator`, `ISeedProvider`) to decouple the generator from specific implementations.

### 1.2 OOAD (Booch)
*   **Object-Oriented Decomposition:** The world is not just a list of rooms; it's a graph of interacting objects.
*   **Hierarchy:** We will use class hierarchies for `Device` types (e.g., `Terminal`, `Lock`, `Sensor`) to encapsulate behavior.
*   **Abstraction:** The "World" is an abstraction that hides the complexity of the graph generation.

## 2. The Pipeline Steps

1.  **Seed Generation (The "Chaos"):**
    *   Input: A string seed or random noise.
    *   Output: A deterministic random number generator (RNG) state.
    *   *Mechanism:* A `SeedService` (Domain Service).

2.  **Topology Generation (The "Skeleton"):**
    *   Input: RNG state, parameters (e.g., "Corporate Office", "Research Station").
    *   Output: An abstract graph of nodes and edges (Room IDs and Connections).
    *   *Mechanism:* `TopologyGenerator` (Domain Service).
    *   *Constraint:* Ensure navigability (graph connectivity).

3.  **Entity Population (The "Flesh"):**
    *   Input: Abstract graph, Theme data (from JSON/Data Provider).
    *   Output: `Location` entities with descriptions, names, and attributes.
    *   *Mechanism:* `LocationPopulator` (Domain Service).

4.  **Device Placement (The "Organs"):**
    *   Input: Populated Locations, RNG state.
    *   Output: `Device` entities attached to Locations.
    *   *Mechanism:* `DeviceFactory` (Domain Factory).
    *   *Logic:* "Corporate Offices" get `Terminal` and `CoffeeMachine`; "Server Rooms" get `Mainframe` and `CoolingSystem`.

5.  **Network Overlay (The "Nervous System"):**
    *   Input: Devices (specifically Terminals/Mainframes).
    *   Output: A logical network map (IP addresses, hostnames) overlaid on the physical map.
    *   *Mechanism:* `NetworkGenerator` (Domain Service).

6.  **State Projection (The "Life"):**
    *   Input: The complete World Graph.
    *   Output: Virtual filesystem artifacts (files in `/tmp/world/` or internal memory).
    *   *Mechanism:* `WorldManager` (Interface Adapter) coordinating `StateProjector`.

## 3. Implementation Tasks

### Phase 1: Core Generators (Domain Services)
*   [ ] **Create `SeedService`**: Simple seeded RNG wrapper.
*   [ ] **Enhance `WorldGenerator`**:
    *   Implement `generateTopology()`: Create a graph (e.g., grid, tree, or hub-and-spoke).
    *   Implement `populateLocations()`: Assign themes and names.
    *   Implement `placeDevices()`: Add interactive elements.

### Phase 2: Data Integration (Infrastructure)
*   [ ] **Update `JsonMissionDataProvider`**: Add `WorldThemes` (names, descriptions, device lists).
*   [ ] **Refactor `WorldManager`**: Use the enhanced pipeline.

### Phase 3: "Real" Navigation (The Fix)
*   **Problem:** Tutor sends user to `/tmp/`.
*   **Solution:**
    *   The "World" should be mounted at a specific mount point in the virtual FS (e.g., `/mnt/remote/` or just mapped to hostnames).
    *   When a mission starts, the `SSH` command should "transport" the user's shell context to that remote world.
    *   **Crucial:** The `FileSystemService` must support *virtual mounts* or the `TerminalState` must track the `currentHost`.
    *   **Current State:** `TerminalState` has `fsContext` (hostname).
    *   **Fix:** Ensure `ExecuteCommand` and `TutorService` respect `fsContext` and do not default to local `/tmp`. The "Remote World" files should be generated in memory or a dedicated persistence layer, not mixed with local temp files.

## 4. Refined "Remote" Logic
*   **Localhost (`terminalator`):** The user's home machine.
*   **Remote Host (`corp-server-01`):** A generated world.
*   **Connection:** `ssh user@corp-server-01`.
*   **State Change:**
    *   `TerminalState.fsContext` changes from `terminalator` to `corp-server-01`.
    *   `TerminalState.cwd` changes to `/home/user` (on remote).
    *   `FileSystemService` switches context to the *Remote* file system instance.

## 5. Action Plan
1.  **Refactor `WorldGenerator`** to be more robust and theme-aware.
2.  **Update `WorldManager`** to manage multiple `FileSystem` instances (one per generated host).
3.  **Update `TutorService`** to guide the player through `ssh` and verify they are on the *correct host* before issuing local commands (like `grep`).
