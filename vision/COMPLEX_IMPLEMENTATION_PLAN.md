# 24XX RPG Terminal System: RPG-First Architecture

The terminal is an instrument in an RPG session. This plan formalizes how the 24XX RpgEngine governs terminal logic, character roles, and mission consequences.

## Narrative & Standardization Prerequisite
- **24XX Core Engine**: The master logic that handles d6-d12 rolls and success tiers.
- **Character Roles**: Standardized roles (Infiltrator, SysAdmin, Rogue) that determine skill dice.
- **Risk Mapping**: Identifying which terminal commands/scenarios trigger 24XX checks.

## User Review Required

> [!IMPORTANT]
> **The 24XX Roll**: Every high-stakes command (e.g., `ssh`, `rm` on a remote, or complex `scheme` scripts) will trigger a 24XX die roll based on your character's skills.
> **Success Tiers**:
> - **5+ Success**: Command works as intended.
> - **3-4 Setback**: Command works, but a "cost" is incurred (e.g., a "Process Hunter" spawns).
> - **1-2 Disaster**: Command fail or "hurts" the process (terminal glitch, system shock).

## Proposed Changes

### Domain Entities

#### [NEW] [RpgEngine.ts](file:///home/dbslim/Terminalator/src/domain/entities/RpgEngine.ts)
- The central logic for rolling dice for **Access** (getting a key), **Time** (speed), and **Social** (detection).
- It NEVER glitches a valid command. `rm` always works if permissions allow.

#### [NEW] [Skill.ts](file:///home/dbslim/Terminalator/src/domain/entities/Skill.ts)
- 24XX Dice system (d6-d12) mapped to character stats.
- **New Skills**: `ASSEMBLY_LOGIC` (Low-level optimization) and `SOCIAL_INTUITION` (Detecting lies).

#### [NEW] [AssemblyCpu.ts](file:///home/dbslim/Terminalator/src/domain/entities/AssemblyCpu.ts)
- A simulated, simplified CPU for the "Low Level" educational arc.
- Registers: `AX`, `BX`, `PC`. Instruction Set: `MOV`, `ADD`, `JMP`.
- Used for "Machine Logic" puzzles.

#### [MODIFY] [Character.ts](file:///home/dbslim/Terminalator/src/domain/entities/Character.ts)
- Defined by 24XX Career and Skills (d6-d12).

### Domain Services

#### [NEW] [WorldLoader.ts](file:///home/dbslim/Terminalator/src/domain/services/WorldLoader.ts)
- The "JSON Parser" that turns thousands of setting definitions into game states.

#### [NEW] [RiskEvaluator.ts](file:///home/dbslim/Terminalator/src/domain/services/RiskEvaluator.ts)
- Determines if a command cluster or environment (Submarine depth, Corporate alert) constitutes a **Risk**.

#### [NEW] [UrgencyManager.ts](file:///home/dbslim/Terminalator/src/domain/services/UrgencyManager.ts)
- Coordinates **Watchdog Daemons** (simulated background scripts) that check for user presence.
- Manages `RiskLevel` (system alert state).

#### [NEW] [TrustManager.ts](file:///home/dbslim/Terminalator/src/domain/services/TrustManager.ts)
- Tracks NPC trust levels and triggers social consequences (e.g., mail spoofing).
- Integrates with `MissionGenerator` to unlock "Trusted" mission paths.

#### [NEW] [TaskValidator.ts](file:///home/dbslim/Terminalator/src/domain/services/TaskValidator.ts)
- **Strict Mode**: If the user's script has a bug, the mission fails. No dice rolls can fix syntax errors.
- **Optimization**: Can fail a user if their efficient O(n^2) script causes a "Reactor Timeout" (simulated urgency).
- **Real Code Validation**: Missions will now require the user to write valid Shell functions or Scheme scripts. The system will "unit test" these in-game to verify success.
- **High Urgency**: We are implementing "Watchdog Daemons"—real background scripts that check `ps` and terminate the user's shell if they are detected.

### Interface Adapters

#### [MODIFY] [TerminalViewModel.ts](file:///home/dbslim/Terminalator/src/interface-adapters/viewmodels/TerminalViewModel.ts)
- Injects visual feedback (glitches/noise) based on `RpgEngine` consequences.

#### [MODIFY] [GameManager.ts](file:///home/dbslim/Terminalator/src/interface-adapters/GameManager.ts)
- Coordinates the 24XX game loop alongside the POSIX terminal state.

## Verification Plan

### Automated Tests
- `npm test src/domain/entities/RpgEngine.test.ts`: Verify roll success distributions.
- `npm test src/domain/services/RiskEvaluator.test.ts`: Test risk detection logic.

### Manual Verification
1.  Assume "SysAdmin" role.
2.  Attempt to `ssh` into a "High Security" node.
3.  Observe the 24XX roll feedback on the terminal.
4.  If a "Setback" is rolled, verify that a `ProcessHunter` PID is spawned.
