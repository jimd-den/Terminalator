# MASTER PLAN: 24XX RPG Terminal System

This master plan codifies the technical and narrative architecture for **Terminalator**. It integrates 24XX RPG mechanics with a strict POSIX-compliant terminal simulation to explore the utility, limits, and "why" of computation.

---

## 1. Core Philosophy: Hard Logic vs. RPG Magic

We maintain a strict boundary between the **Machine** (POSIX Logic) and the **Character** (RPG Dice).

### The Machine (The Logic)
- **POSIX Compliance**: Commands like `ls`, `rm`, `ssh`, and `grep` operate on real technical rules.
- **The "Foot Gun"**: Users can cause real system damage (e.g., deleting root directories, creating infinite loops). No dice rolls can "fix" a logic error.
- **Computable Truth**: Computers do not lie. Logs and processes are objective evidence.

### The Character (The Magic)
- **24XX Core Loop**: Dice rolls (d6-d12) govern **Access**, **Time**, and **Social Engineering**.
- **Roles**: Careers (Infiltrator, SysAdmin, Mole Hunter) determine skill dice.
- **Urgency**: Risk levels determine how often "Watchdog Daemons" (automated adversary scripts) check for the player's presence.

---

## 2. Technical Architecture

### Player as a Process (PID)
- The player is not a "character model" but an **Interactive Shell Session** (PID).
- **Identity**: Tracked via `IdentityService`. Access levels (root, user, guest) determine command success.
- **Survival**: If the PID is terminated by an external daemon or a user mistake, the session ends.

### Watchdog Daemons (The Adversary)
- Realistic "enemies" implemented as background scripts.
- **Behavior**: They run loops checking `ps` (detecting foreign PIDs), `netstat` (detecting unauthorized connections), or `/var/log` (detecting anomalies like `rm` on system files).
- **Mitigation**: Users must hide their PID, distract the daemon, or gain root to `kill` the watchdog.

---

## 3. Educational Arc: From Shell to Assembly

The game guides the user through layers of abstraction:
1. **Shell (Scale)**: Using pipes and filters to handle data volume humans can't process (The "Why" of computing).
2. **Scripting (Automation)**: Using `sh` and `scheme` to solve repeatable logic problems.
3. **Assembly (Hard Logic)**: Exploring the raw clock cycles, registers, and memory of a pre-transistor mechanical CPU.

---

## 4. Setting & Mission Schema (`ISettingTemplate`)

To scale to thousands of scenarios, we use a standardized JSON schema.

```json
{
  "id": "SUBMARINE_001",
  "name": "Deep Pressure",
  "character": { "career": "Comms Officer", "skills": { "TECH": "d10", "SOCIAL": "d6" } },
  "filesystem": { "root": { "var/log/sonar": "Entry 1..." } },
  "daemons": [ { "id": "LOG_CHECKER", "interval_ms": 30000, "script": "if (rm_detected) kill_user;" } ],
  "laws": { "urgency": "PRESSURE_INCREASE", "consequence": "VISUAL_DECAY" }
}
```

---

## 5. Implementation Roadmap

### Phase 1: Core RPG Engine
- [ ] **RpgEngine**: Implement d6-d12 roll logic and success tiers (5+ Success, 3-4 Setback, 1-2 Disaster).
- [ ] **Skill/Character System**: Define Roles and map them to dice.
- [ ] **RiskEvaluator**: Determine when an environment or action triggers a 24XX check.

### Phase 2: World & Interaction
- [ ] **WorldLoader**: Build a parser for Setting/Mission JSON.
- [ ] **TrustManager**: Implement social trust scores for NPCs and "Truth Verification" mechanics.
- [ ] **RemoteNode**: Implement `ssh` and multi-host filesystem contexts.

### Phase 3: The Adversary & Urgency
- [ ] **UrgencyManager**: Implement the Watchdog Daemon system.
- [ ] **Visual Feedback**: Build the "Visual Decay" (glitches/font distortion) component in `TerminalViewModel`.
- [ ] **TaskValidator**: Implement real-code validation (unit testing user shell/Scheme code).

### Phase 4: Assembly & Optimization
- [ ] **AssemblyCpu**: Build the simplified CPU simulator (Registers, Cycles).
- [ ] **Optimization Challenges**: Missions that require O(n) or cycle-limited solutions.

---

## 6. Verification Plan

### Automated
- `npm test src/domain/entities/RpgEngine.test.ts`: Success distributions.
- `npm test src/domain/services/TaskValidator.test.ts`: Verify real-code execution.

### Manual
1. Start "Mole Hunt" mission.
2. Infiltrate a remote node via `ssh`.
3. Purposely trigger a "Watchdog Daemon" by staysing logged in too long.
4. Verify the system terminates the user PID upon detection.
