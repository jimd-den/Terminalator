# Mission Pipeline & World Simulation Architecture Report

## Executive Summary
This report analyzes the current "Mission Generation Pipeline" and "Tutor System" to identify architectural bottlenecks preventing the expansion into a **"Netrunner Simulator"** with deep Unix integration, Assembly programming, and a living NPC universe. It outlines a strict refactoring roadmap adhering to SOLID, KISS, DRY, and Clean Architecture principles, targeting a **Data-Driven Procedural World Generator** that simulates an 80s futuristic mainframe environment inspired by the algorithmic rigor of Donald Knuth's *The Art of Computer Programming*.

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

## 2. Proposed Architecture: The "Diegetic Netrunner" World

We will move from a static script system to a **Procedural Generation Engine** that simulates a consistent fictional universe. Crucially, the **Unix Shell is the interface**, not the world itself. The player is a character *using* a terminal to interact with a physical reality.

### 2.1. The Diegetic Interface (Unix as a Tool)

*   **The Player Character:** A "Netrunner" or "SysOp" sitting at a console.
*   **The World:** A graph of **Rooms** (Physical Locations) containing **Nodes** (Computers, PDAs, Door Controls).
*   **Interaction:** You do not `cd` into a room. You `ssh` into the room's terminal to open the door.
    *   *Physical Action:* "I need to open the Medbay door."
    *   *Digital Action:* `ssh root@medbay_console` -> `echo "OPEN" > /dev/door_control`

### 2.2. Data-Driven Procedural Generation

**Pattern:** *Abstract Factory + Builder Pattern*

*   **Entity: LocationTemplate (Physical Space)**
    *   Defines the physical layout and the *digital footprint* of that layout.
    *   *Example:* An "Abandoned Station" has 10 Rooms.
    *   *Room Content:* 1 Mainframe (locked), 3 Crew PDAs (floating in zero-g), 1 Life Support System.
*   **Entity: JobTemplate (The Contract)**
    *   Defines the objective (e.g., "Retrieve the Captain's Log").
    *   The Log is a file located on the *Captain's PDA*, which is in the *Bridge*.

### 2.3. NPC Interaction & The "Living" Network

**Pattern:** *Observer / Event Bus*

NPCs are distinct entities in the world, not just processes. They carry devices (PDAs, Cyberdecks) that act as their digital interface.

*   **Communication Protocols:**
    *   **Asynchronous:** `mail -s "Job Offer" fixer@underground.net` (Wait for reply).
    *   **Synchronous:** `write user@host` or `talk user@host` (Real-time chat).
    *   **VOIP:** `comm --call 555-0199` (Voice link).
*   **The "Evil Alien" Scenario:**
    *   The Alien is a physical entity moving through rooms.
    *   **Detection:** You `tail -f /var/log/motion_sensors` on the Security Terminal to track it.
    *   **Interaction:** You cannot "hack" the alien directly. You hack the *Airlock Control* to vent the room it is currently in.

### 2.4. Agency & Delegation System (The Economy)

**Pattern:** *Strategy Pattern (Resolution)*

The player manages **Time**, **Money**, and **Skill**.

*   **The Problem:** "I need the encryption key from the Chief Scientist."
*   **Path A (Hacking - Knuthian):** Breach the scientist's private server and solve a "Sorting Algorithm" puzzle to decrypt their files. (High Skill).
*   **Path B (Social Engineering):** `mail` the scientist posing as IT support (`-f admin@corp.net`) asking for a password reset. (Social Skill).
*   **Path C (Delegation):** Hire a mercenary NPC to physically steal the PDA.
    *   *Command:* `transfer --amount 1000 --account MERC_01`
    *   *Feedback:* You receive a message 10 minutes later: "Item acquired. Uploading dump..."

### 2.5. The "Knuth" Sandbox (Assembly & Validation)

When the player chooses the "Hacking" path, they face deep algorithmic challenges appropriate for an 80s Mainframe.

*   **VirtualCPU:** A lightweight 16/32-bit CPU emulator.
*   **Algorithmic Missions:**
    *   "The mainframe uses a custom compression algorithm. Write an assembly routine to unpack this data stream."
    *   "Optimize this sorting routine to run in under 1000 cycles."

---

## 3. Implementation Roadmap

### Phase 1: The World Graph (Data Layer)
1.  **Schema Definition:** Create `ILocation`, `IDevice` (Terminal, PDA), and `INPC`.
2.  **Network Simulator:** Define how devices connect (LANs, Airgaps, Subnets).
3.  **Procedural Builder:** Generate a "Station" with rooms, placing PDAs and Terminals in realistic network topologies.

### Phase 2: The Communication Layer
1.  **Mail Server:** Implement a simulated `sendmail`/`postfix` backend.
2.  **Chat Daemon:** Implement `talkd` for real-time NPC interaction.
3.  **NPC AI:** Simple state machines that respond to emails or chat messages based on keywords and "Reputation".

### Phase 3: The Assembly Sandbox & Economy
1.  **VirtualCPU:** Implement the CPU emulator.
2.  **Knuth Strategies:** Implement validators for algorithmic puzzles.
3.  **Bank Service:** Implement the economy for paying NPCs.

## 4. Conclusion

This architecture clarifies the distinction between the **Simulated World** and the **Player's Tool (Unix)**. The player enacts their will upon the physical world (opening doors, tracking aliens, talking to people) *exclusively* through the realistic constraints of a terminal interface, creating a deeply immersive "Diegetic Netrunner" experience.
