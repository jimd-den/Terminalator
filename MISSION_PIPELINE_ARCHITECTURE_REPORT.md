# Mission Pipeline & World Simulation Architecture Report

## Executive Summary
This report analyzes the current "Mission Generation Pipeline" and "Tutor System" to identify architectural bottlenecks preventing the expansion into a **"Netrunner Simulator"** with deep Unix integration, Assembly programming, and a living NPC universe. It outlines a strict refactoring roadmap adhering to SOLID, KISS, DRY, and Clean Architecture principles, targeting a **Data-Driven Procedural World Generator** that supports "Donald Knuth" style algorithmic missions, "Space Station" RPG dungeon crawls, and a robust "Delegation Economy" (Do it yourself vs. Pay an NPC).

## 1. Current Architecture Analysis & Violations

### 1.1. SOLID Principles Analysis

*   **Open/Closed Principle (OCP) Violation [CRITICAL]**
    *   **Location:** `src/domain/services/TutorService.ts` and `MissionRepository.ts`.
    *   **Issue:** The `strategies` map in `TutorService` and the `MissionCatalog.json` import in `MissionRepository` are hardcoded. Adding a new mission type (e.g., "Alien Containment Protocol") requires modifying the *source code*.
    *   **Impact:** Extending the game with new mechanics requires constant core code modification, increasing regression risk.
*   **Single Responsibility Principle (SRP) Violation**
    *   **Location:** `src/domain/services/mission-strategies/ExfiltrateStrategy.ts` (and others).
    *   **Issue:** Strategies currently mix *State Inspection* (checking commands), *Narrative Logic* (generating hints), and *Progression Logic* (advancing steps).
    *   **Impact:** Changing how a hint is phrased requires touching the logic that determines if a step is complete.
*   **Dependency Inversion Principle (DIP) Weakness**
    *   **Location:** `MissionService` -> `TutorService`.
    *   **Issue:** The high-level `MissionService` depends on a concrete `TutorService` implementation which is tightly coupled to specific strategies.

### 1.2. DRY (Don't Repeat Yourself) & KISS (Keep It Simple, Stupid) Violations

*   **Procedural Hardcoding (KISS Violation):** `SystemGenerator.ts` contains hardcoded user lists and file paths. This prevents the dynamic generation of "Corporations" or "Abandoned Stations" with unique file structures.
*   **Logic Duplication (DRY Violation):** `MissionService` and `MissionRepository` both contain logic for "random selection" and "variable injection". This should be centralized.

### 1.3. Clean Architecture Violations

*   **Data Leakage:** `MissionRepository` imports a specific JSON file (`MissionCatalog.json`) directly. The Data Layer should be abstract, allowing for a folder-based or mod-based loading system.

---

## 2. Proposed Architecture: The "Mainframe World" Generator

We will move from a static script system to a **Procedural Generation Engine** driven by definable Data Entities. This engine will support three pillars: **Algorithmic Puzzles**, **Spatial RPG Exploration**, and **Economic Agency**.

### 2.1. The Three Pillars of Gameplay

1.  **The Knuthian Protocol (Algorithms):** Coding and Logic puzzles (Sorting, Searching, Optimization).
2.  **The Spatial Crawl (RPG):** Navigating file systems that represent physical spaces (Stations, Ruins), managing environmental state (Doors, Power).
3.  **The Agency Economy (Delegation):** The constant choice: "Do I use my skill to solve this, or my credits to hire an NPC?"

### 2.2. Data-Driven Procedural Generation

**Pattern:** *Abstract Factory + Builder Pattern*

*   **Entity: LocationTemplate (The Setting)**
    *   Defines the physical/digital environment.
    *   *Example JSON (Abandoned Station):*
        ```json
        {
          "id": "station_ruin",
          "theme": "horror",
          "structure": {
            "/bridge": { "devices": ["door_control", "log_terminal"] },
            "/medbay": { "devices": ["stasis_pod"], "locked": true }
          },
          "threats": ["rogue_process_daemon", "oxygen_leak"]
        }
        ```
*   **Entity: JobTemplate (The Task)**
    *   Defines the objective and the "Success" state.

### 2.3. RPG & Spatial Exploration Mechanics

**Pattern:** *State Pattern + Composite Pattern*

We map the **File System** to **Physical Space**.

*   **Directories as Rooms:** `cd /medbay` is equivalent to "Walking into the Medbay".
*   **Devices as Files:** To open a door, you don't click a button; you interact with the device driver.
    *   `echo "OPEN" > /dev/door_control`
    *   `cat /var/log/sensor_array` (Read description of the room)
*   **The "Evil Alien" (Threat System):**
    *   Antagonists are represented as **Background Processes**.
    *   *Example:* A "Hunter" process (`pid 666`) continually greps for your user. If it finds you, it kills your session.
    *   *Counterplay:* `kill -9 666` or isolate the process in a `chroot` jail.

### 2.4. Agency & Delegation System (The Economy)

**Pattern:** *Strategy Pattern (Resolution)*

Every problem should offer multiple resolution paths.

*   **The Problem:** "The door is encrypted with a Rolling Bitmask Cipher."
*   **Path A (Skill - Knuthian):** Write an Assembly program to reverse the bitmask and output the key to `/dev/door`. (Cost: 0 Credits, High Skill).
*   **Path B (Delegation - Social):** Open your `comm` tool and hire "ZeroCool" (NPC).
    *   *Command:* `mail -s "JOB_OFFER" zerocool@underground.net < cash_transfer.dat`
    *   *Result:* NPC logs in remotely, solves the puzzle, and takes 500 credits.
*   **Implementation:**
    *   `MissionService` checks for *both* "Puzzle Solved" state AND "Transaction Complete" state.

### 2.5. The "Knuth" Sandbox (Assembly & Validation)

To support the Skill Path, we need real computing tools.

*   **VirtualCPU:** A lightweight 16/32-bit CPU emulator (Registers, Stack, Flags).
*   **State Validators:** The Tutor checks `VirtualCPU.EAX == 0xKEY` instead of simple text matching.

---

## 3. Implementation Roadmap

### Phase 1: The Foundation (Data & Economy)
1.  **Schema Definition:** Create `ILocationTemplate` and `INPCProfile`.
2.  **Economy Service:** Implement a `BankService` and `ContractService` to handle payments and NPC hiring.
3.  **FileSystem Loader:** Implement the "Folder of JSONs" loader.

### Phase 2: The Spatial Engine (RPG)
1.  **Device Drivers:** Create a system where writing to specific files triggers game events (e.g., `Door.open()`).
2.  **Process AI:** Implement simple "AI" processes that react to player presence (The "Evil Alien").

### Phase 3: The Assembly Sandbox
1.  **VirtualCPU:** Implement the CPU emulator.
2.  **Assembler:** A simple parser for `MOV`, `ADD`, `JMP`.
3.  **Knuth Strategies:** Implement validators for Sorting and Logic puzzles.

## 4. Conclusion

This architecture transforms the system into a rich **Simulated World**. It respects the player's agency by allowing them to be a "Master Hacker" (solving Knuthian puzzles in Assembly) or a "Fixer" (managing resources and hiring NPCs). The Unix shell becomes the interface for *dungeon crawling*, *combat*, and *economics* simultaneously.
