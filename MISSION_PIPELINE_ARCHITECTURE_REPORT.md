# Mission Pipeline & World Simulation Architecture Report

## Executive Summary
This report analyzes the current "Mission Generation Pipeline" and "Tutor System" to identify architectural bottlenecks preventing the expansion into a **"Netrunner Simulator"** with deep Unix integration, Assembly programming, and a living NPC universe. It outlines a strict refactoring roadmap adhering to SOLID, KISS, DRY, and Clean Architecture principles, targeting a **Data-Driven Procedural World Generator** that simulates a universe built by "Unix Edge Lords" where reality is controlled via POSIX-compliant terminals, and mastery of *The Art of Computer Programming* is the ultimate weapon.

## 1. Current Architecture Analysis & Violations

### 1.1. SOLID Principles Analysis

*   **Open/Closed Principle (OCP) Violation [CRITICAL]**
    *   **Location:** `src/domain/services/TutorService.ts` and `MissionRepository.ts`.
    *   **Issue:** The `strategies` map in `TutorService` and the `MissionCatalog.json` import in `MissionRepository` are hardcoded. Adding a new mission type (e.g., "Knuthian Sort") requires modifying the *source code*.
    *   **Impact:** Extending the game with new mechanics requires constant core code modification, increasing regression risk.
*   **Single Responsibility Principle (SRP) Violation**
    *   **Location:** `src/domain/services/mission-strategies/ExfiltrateStrategy.ts` (and others).
    *   **Issue:** Strategies currently mix *State Inspection* (checking commands), *Narrative Logic* (generating hints), and *Progression Logic* (advancing steps).
    *   **Impact:** Changing how a hint is phrased requires touching the logic that determines if a step is complete.
*   **Dependency Inversion Principle (DIP) Weakness**
    *   **Location:** `MissionService` -> `TutorService`.
    *   **Issue:** The high-level `MissionService` depends on a concrete `TutorService` implementation which is tightly coupled to specific strategies.

### 1.2. DRY (Don't Repeat Yourself) & KISS (Keep It Simple, Stupid) Violations

*   **Procedural Hardcoding (KISS Violation):** `SystemGenerator.ts` contains hardcoded user lists and file paths. This prevents the dynamic generation of "Corporations" or "Stations".
*   **Logic Duplication (DRY Violation):** `MissionService` and `MissionRepository` both contain logic for "random selection" and "variable injection". This should be centralized.

### 1.3. Clean Architecture Violations

*   **Data Leakage:** `MissionRepository` imports a specific JSON file (`MissionCatalog.json`) directly. The Data Layer should be abstract, allowing for a folder-based or mod-based loading system.

---

## 2. Proposed Architecture: The "Unix Edge Lord" Universe

We will move from a static script system to a **Procedural Generation Engine** simulating a world where *everything*—from airlocks to coffee machines—is controlled by strict POSIX-compliant systems.

### 2.1. The "Real World" POSIX Simulation

In this universe, computers are the interface to reality.

*   **Diegetic Interface:** The player sits at a terminal. The "World" is a graph of connected nodes.
*   **Environmental Manipulation (Not "Hacking"):**
    *   You don't "hack" an alien. You use `ssh` to access the *Life Support Control Node*.
    *   *Action:* `echo "VENT" > /dev/airlock_3`
    *   *Constraint:* You need `root` or `sudo` privileges, or you need to find a user who has them.
*   **Social Engineering & Deception:**
    *   *Problem:* An alien is in the Mess Hall. You need it in the Airlock.
    *   *Solution:* Use `talk` or `mail` to impersonate a Commanding Officer (`-f commander@station.net`).
    *   *Command:* `talk private_hudson` -> "Order: Lure target to Airlock 3. Bait required."
    *   *Outcome:* The NPC moves (bait), the Alien follows. Then you trigger the vent.

### 2.2. The "Knuthian" Curriculum: The Art of Computer Programming

Missions are not just "find the file"; they are rigorous tests of Computer Science fundamentals. The "Edge Lords" who built this world locked high-level functions behind algorithmic performance gates.

**Pattern:** *Strategy Pattern (Performance Validators)*

*   **Concept:** To access the *Mainframe Core*, your script must process data efficiently. Inefficient code triggers "Timeout" defenses.
*   **Mission Types:**
    *   **Vol 1 (Fundamental Algorithms):** "The door lock requires a valid Stack Permutation. Write a program to generate it."
    *   **Vol 3 (Sorting & Searching):** "The firewall throttles traffic. Sort this routing table (`routes.dat`) using a QuickSort implementation to minimize latency and bypass the throttle."
    *   **Optimization Challenges:** "Your recursive solution caused a Stack Overflow. Rewrite it iteratively."
*   **Implementation:** The Tutor evaluates the *Time Complexity* and *Correctness* of the user's submitted binary/script.

### 2.3. Technology: Help vs. Hurt

The architecture must support the theme that reliance on technology is a double-edged sword.

*   **The Help:** Automated systems (Doors, Oxygen, Drones) allow one person to run a station.
*   **The Hurt:** If the `oxygen_daemon` crashes or is killed (`kill -9 $(pidof oxygen)`), everyone dies.
*   **Scenario:** A mission might require you to *manually* operate a system via Assembly interrupts because the high-level OS is corrupted.

### 2.4. Data-Driven Procedural Generation

**Pattern:** *Abstract Factory + Builder Pattern*

*   **Entity: LocationTemplate (The Setting)**
    *   Defines the physical layout and the *Unix Device Map*.
    *   *Example:* `/dev/airlock_1`, `/sys/class/sensors/motion`.
*   **Entity: JobTemplate (The Contract)**
    *   Defines the objective and the "Success" state (e.g., "Alien Status: VENTED").

---

## 3. Implementation Roadmap

### Phase 1: The Diegetic World (Data Layer)
1.  **Schema Definition:** Create `ILocation` (Rooms), `IDevice` (Unix Nodes), and `INPC`.
2.  **Simulation Engine:** Implement the logic that maps Unix file writes (`/dev/door`) to World State changes (`Room.Locked = false`).

### Phase 2: The Social & Environmental Engine
1.  **Communication Protocols:** Implement `mail`, `talk`, `write` with "Impersonation" checks (headers, user spoofing).
2.  **NPC AI:** Simple state machines that react to orders based on "Authority Level" and "Persuasion" (determined by chat choice).
3.  **Threat Simulation:** Entities (Aliens) that move through the Room Graph, trackable via simulated sensors (`tail /var/log/syslog`).

### Phase 3: The Knuthian Sandbox
1.  **VirtualCPU:** Implement a lightweight 16/32-bit CPU emulator.
2.  **CS Validator:** Create strategies that benchmark user code (cycles/memory) against known algorithms (Bubble vs Quick Sort).

## 4. Conclusion

This architecture transforms the system into a **"Unix Edge Lord" Simulator**. It respects the player's intelligence by requiring real Computer Science skills (Knuthian Algorithms) and real Unix comprehension to manipulate a dangerous, indifferent world.
