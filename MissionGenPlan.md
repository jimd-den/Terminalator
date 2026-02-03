 Mission Pipeline & World Simulation Architecture Report

## Executive Summary
This report analyzes the current "Mission Generation Pipeline" and "Tutor System" to identify architectural bottlenecks preventing the expansion into a **"Netrunner Simulator"** with deep Unix integration, Assembly programming, and a living NPC universe. It outlines a strict refactoring roadmap adhering to SOLID, KISS, DRY, and Clean Architecture principles, targeting a **Data-Driven Procedural World Generator** that simulates a universe built by "Unix Edge Lords" where reality is controlled via POSIX-compliant terminals, and the principles of *The Art of Computer Programming* are the organic laws of physics.

## 1. Current Architecture Analysis & Violations

### 1.1. SOLID Principles Analysis

*   **Open/Closed Principle (OCP) Violation [CRITICAL]**
    *   **Location:** `src/domain/services/TutorService.ts` and `MissionRepository.ts`.
    *   **Issue:** The `strategies` map in `TutorService` and the `MissionCatalog.json` import in `MissionRepository` are hardcoded. Adding a new mission type requires modifying the *source code*.
    *   **Impact:** Extending the game with new mechanics requires constant core code modification.
*   **Single Responsibility Principle (SRP) Violation**
    *   **Location:** `src/domain/services/mission-strategies/ExfiltrateStrategy.ts` (and others).
    *   **Issue:** Strategies currently mix *State Inspection*, *Narrative Logic*, and *Progression Logic*.
    *   **Impact:** Changing how a hint is phrased requires touching the logic that determines if a step is complete.
*   **Dependency Inversion Principle (DIP) Weakness**
    *   **Location:** `MissionService` -> `TutorService`.
    *   **Issue:** The high-level `MissionService` depends on a concrete `TutorService` implementation.

### 1.2. DRY (Don't Repeat Yourself) & KISS (Keep It Simple, Stupid) Violations

*   **Procedural Hardcoding (KISS Violation):** `SystemGenerator.ts` contains hardcoded user lists and file paths. This prevents dynamic generation.
*   **Logic Duplication (DRY Violation):** `MissionService` and `MissionRepository` both contain logic for "random selection" and "variable injection".

### 1.3. Clean Architecture Violations

*   **Data Leakage:** `MissionRepository` imports a specific JSON file (`MissionCatalog.json`) directly. The Data Layer should be abstract.

---

## 2. Proposed Architecture: The "Unix Edge Lord" Universe

We will move from a static script system to a **Procedural Generation Engine** simulating a world where *everything* is controlled by strict POSIX-compliant systems.

### 2.1. The "Real World" POSIX Simulation

In this universe, computers are the interface to reality.

*   **Diegetic Interface:** The player sits at a terminal. The "World" is a graph of connected nodes.
*   **Environmental Manipulation (Not "Hacking"):**
    *   *Action:* `echo "VENT" > /dev/airlock_3`
    *   *Constraint:* You need `root` or `sudo` privileges.
*   **Social Engineering & Deception:**
    *   *Command:* `talk private_hudson` -> "Order: Lure target to Airlock 3."

### 2.2. The "Embraced" Knuthian Philosophy (Show, Don't Tell)

We do not teach "The Art of Computer Programming" via textbooks. We simulate the **problems that Knuth solved**, forcing the user to rediscover the solutions to survive.

**Pattern:** *Constraint-Based Procedural Generation*

*   **The Problem (Latency):**
    *   *Scenario:* "Infiltrate the Orbital Bank."
    *   *Obstacle:* The uplink is unstable (simulated 300 baud). Exfiltrating the raw database (`db.sql`, 500MB) will take 4 years.
    *   *The "Ah-Ha" Moment:* The user realizes they must **Compress** the data or **Filter** it *before* transmission.
    *   *Knuthian Principle:* Information Theory & Huffman Coding.
*   **The Problem (Search Efficiency):**
    *   *Scenario:* "Find the Mole's ID in the Citizen Registry."
    *   *Obstacle:* The Registry has 10 billion records. `grep` takes 45 minutes and times out.
    *   *The "Ah-Ha" Moment:* The user notices the records are time-stamped (partially sorted). They must write a **Binary Search** script to narrow it down in seconds.
    *   *Knuthian Principle:* Search Algorithms & Big O Notation (`O(n)` vs `O(log n)`).
*   **Implementation:**
    *   The `JobTemplate` defines **Constraints** (Bandwidth, CPU Cycles, Memory, Timeout).
    *   The **Validator** checks if the *result* was achieved within those constraints. It doesn't care *how* you did it, only that your solution was efficient enough to work.

### 2.3. Technology: Help vs. Hurt

The architecture must support the theme that reliance on technology is a double-edged sword.

*   **The Help:** Automated systems allow one person to run a station.
*   **The Hurt:** If the `oxygen_daemon` crashes, everyone dies. A mission might require manual Assembly interrupts to restart it.

### 2.4. Data-Driven Procedural Generation

**Pattern:** *Abstract Factory + Builder Pattern*

*   **Entity: LocationTemplate (The Setting)**
    *   Defines the physical layout and the *Unix Device Map*.
*   **Entity: JobTemplate (The Contract)**
    *   Defines the objective and the **Constraints** (e.g., "Max Uplink Time: 10s").

---

## 3. Implementation Roadmap

### Phase 1: The Diegetic World (Data Layer)
1.  **Schema Definition:** Create `ILocation` (Rooms), `IDevice` (Unix Nodes), and `INPC`.
2.  **Simulation Engine:** Implement the logic that maps Unix file writes to World State changes.

### Phase 2: The Social & Environmental Engine
1.  **Communication Protocols:** Implement `mail`, `talk`, `write` with "Impersonation" checks.
2.  **NPC AI:** Simple state machines that react to orders based on "Authority Level".

### Phase 3: The Knuthian Constraints System
1.  **VirtualCPU:** Implement a lightweight 16/32-bit CPU emulator.
2.  **Constraint Monitor:** A system that simulates bandwidth limits, CPU throttling, and memory caps to enforce algorithmic efficiency.

## 4. Conclusion

This architecture transforms the system into a **"Unix Edge Lord" Simulator**. It respects the player's intelligence by placing them in a world where **Computational Complexity** is a matter of life and death. Users learn *The Art of Computer Programming* not because they are told to, but because it is the only way to overcome the physics of this digital universe.
