# Mission Pipeline & World Simulation Architecture Report

## Executive Summary
This report analyzes the current "Mission Generation Pipeline" and "Tutor System" to identify architectural bottlenecks preventing the expansion into a "Netrunner Simulator" with deep Unix integration, Assembly programming, and a living NPC universe. It outlines a strict refactoring roadmap adhering to SOLID, KISS, DRY, and Clean Architecture principles.

## 1. Current Architecture Analysis & Violations

### 1.1. SOLID Principles Analysis

*   **Open/Closed Principle (OCP) Violation [CRITICAL]**
    *   **Location:** `src/domain/services/TutorService.ts` and `MissionRepository.ts`.
    *   **Issue:** The `strategies` map in `TutorService` and the `MissionCatalog.json` import in `MissionRepository` are hardcoded. Adding a new mission type (e.g., "Assembly Hack") requires modifying the *source code* of these services.
    *   **Impact:** Extending the game with new mechanics requires constant core code modification, increasing regression risk.
*   **Single Responsibility Principle (SRP) Violation**
    *   **Location:** `src/domain/services/mission-strategies/ExfiltrateStrategy.ts` (and others).
    *   **Issue:** Strategies currently mix *State Inspection* (checking commands), *Narrative Logic* (generating hints), and *Progression Logic* (advancing steps).
    *   **Impact:** Changing how a hint is phrased requires touching the logic that determines if a step is complete.
*   **Dependency Inversion Principle (DIP) Weakness**
    *   **Location:** `MissionService` -> `TutorService`.
    *   **Issue:** The high-level `MissionService` depends on a concrete `TutorService` implementation which is tightly coupled to specific strategies.

### 1.2. DRY (Don't Repeat Yourself) & KISS (Keep It Simple, Stupid) Violations

*   **Procedural Hardcoding (KISS Violation):** `SystemGenerator.ts` contains hardcoded user lists and file paths (`/home/admin/test_code.sh`). This is simple to write but complex to maintain as the world grows. It should be data-driven.
*   **Logic Duplication (DRY Violation):** `MissionService` and `MissionRepository` both contain logic for "random selection" and "variable injection". This logic should be centralized in a generic `ContentGenerator` or `TemplateEngine`.

### 1.3. Clean Architecture Violations

*   **Data Leakage:** `MissionRepository` imports a specific JSON file (`MissionCatalog.json`) directly. In a strict Clean Architecture, the Repository should definition an interface for data retrieval, and the implementation (Data Layer) should handle file I/O or JSON loading, allowing the source to be swapped (e.g., from a folder of files) without affecting the Domain.

---

## 2. Proposed "Netrunner" Architecture

To support a dynamic universe, real Unix tools, and Assembly, we must move from a **Procedural** architecture to a **Data-Driven, Event-Based** architecture.

### 2.1. Dynamic Mission Loading (The "Folder of JSONs" Solution)

**Pattern:** *Abstract Factory + Repository Pattern*

Instead of bundling one JSON, the system should scan a `data/missions/` directory.

*   **Refactoring:**
    1.  Create `IMissionLoader` interface in Domain.
    2.  Implement `FileSystemMissionLoader` in Infrastructure/Data layer.
    3.  `MissionRepository` depends on `IMissionLoader`.
    4.  **Result:** You can drop a new `assembly_hack_01.json` into the folder, and the game automatically registers it.

**JSON Structure Proposal:**
```json
{
  "id": "assembly_injection",
  "type": "assembly",
  "objectives": [
    {
      "step": "compile",
      "validator": "FileExistsValidator",
      "params": { "path": "payload.o" }
    },
    {
      "step": "execute",
      "validator": "ProcessOutputValidator",
      "params": { "expected_stdout": "Subject Zero" }
    }
  ]
}
```

### 2.2. The "Real Unix" & "Assembly" Extension

**Pattern:** *Strategy Pattern + Adapter Pattern*

To "get dirty with Unix" and teach Assembly, the Tutor needs to stop looking for specific hardcoded commands (like `ls` or `scp`) and start looking at **System State Changes**.

*   **The Assembly Sandbox:**
    *   Create a `VirtualCPU` entity (registers, stack, flags).
    *   Implement an `AssemblyInterpreter` service.
    *   **Integration:** The "Assembly Mission" validator checks the `VirtualCPU` state (e.g., "Is the EAX register 0xFF?"), not just the text output.
*   **Real Unix Tools:**
    *   Instead of `if (cmd == 'grep')`, use a **State Validator**.
    *   **Example:** "Find the password in the logs."
    *   **Validator:** "Does the user's clipboard/knowledge-base contain the string 'P@ssw0rd'?" OR "Has the file `decrypted.txt` been created?"
    *   This allows the user to use *any* tool (`grep`, `awk`, `sed`, or manual inspection) to solve the problem.

### 2.3. The Living Universe (NPCs, Orgs, Tech)

**Pattern:** *Entity Component System (ECS) or Event-Driven Architecture*

Currently, NPCs are just static names in `SystemGenerator`. We need them to "talk" and have relationships.

*   **The World State Graph:**
    *   **Entities:** NPCs, Organizations, Servers, Secrets.
    *   **Relationships:** `NPC_A --[WORKS_FOR]--> ORG_B`, `ORG_B --[HOSTILE_TO]--> ORG_C`.
*   **The Event Bus:**
    *   When a player hacks a server, an event `SECURITY_BREACH` is published.
    *   **Reaction:**
        *   `OrgAI` sees the breach.
        *   `OrgAI` publishes `HIRE_MERCENARY` mission.
        *   `MercenaryNPC` accepts mission and emails the player.
*   **Implementation:**
    *   `src/domain/services/WorldSimulationService.ts` (Manages the graph).
    *   `src/domain/events/GameEventBus.ts` (Pub/Sub system).

---

## 3. Implementation Roadmap

### Phase 1: Foundation (The Data Layer)
1.  **Extract Interfaces:** define `IMissionSource` and `IWorldState`.
2.  **Refactor MissionRepository:** Remove `MissionCatalog.json` import. Inject `IMissionSource`.
3.  **Implement FileSystemLoader:** Write logic to `glob` all `*.json` files in a directory.

### Phase 2: The Tutor Brain (The Strategies)
1.  **Decouple Strategies:** Create a `StrategyRegistry` that can dynamically register strategies at runtime.
2.  **State-Based Validation:** Rewrite `ExfiltrateStrategy` to use `FileSystem.exists()` checks instead of `Command.history.includes()`. This enables "Real Unix" solving.

### Phase 3: The Assembly Module
1.  **Create VirtualCPU:** TypeScript implementation of a simple 16-bit or 32-bit CPU.
2.  **Create Assembler:** A simple parser converting `MOV EAX, 1` to bytecode.
3.  **Create AssemblyStrategy:** A Tutor strategy that steps through the CPU ticks and validates register states.

### Phase 4: The Living World
1.  **World Graph:** Implement the relationship database (in-memory graph).
2.  **Event System:** Create the bus. Hook `MissionService` to listen for events.
3.  **Tech Embedding:** Add "Cyberdecks" or "Hardware" as items in the `FileSystem` (e.g., `/dev/deck0`).

## 4. Conclusion

By shifting from **Procedural Hardcoding** to **Data-Driven Composition**, the system will gain the flexibility required for a complex "Netrunner" simulation. The core shift is treating the Game World not as a script to be followed, but as a State Machine to be manipulated by standard Unix tools.
