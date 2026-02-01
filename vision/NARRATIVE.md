# Concept: The Hard Line (Magic vs. Math)

In this system, we draw a strict line between **The Character (Magic/Dice)** and **The Machine (Logic/POSIX)**.

## 1. The Core Philosophy
The terminal is **Never Random**. If you type `rm -rf /`, it deletes everything. There is no saving throw. The "Game" is about getting access to the terminal where that command matters.

| The Magic| Block | Description | Example (Cyberpunk) | Example (Submarine) |
| :--- | :--- | :--- | :--- |
| **Locale** | Hostnames, OS branding, MOTD. | `CORP-NODE-01` | `USS-VALIANT-MAIN` |
| **Archetypes** | NPC templates and careers. | `Data Courier`, `Sysadmin` | `Sonar Op`, `Reactor Tech` |
| **Logic Scenarios** | Unique mission mechanics. | `Decrypt Log`, `Hack Node` | `Seal Breach`, `Track Mole` |
| **Daemon Logic** | The automated threat script. | `Intrusion Prevention System (IPS)` | `Automated Integrity Check` |
| **Linguistic Style** | Mail and log vocabulary. | High-tech, street slang. | Nautical, technical, terse. |
 **Syntax**: Writing a valid `awk` script to parse the log. |

### The "Why": Donald Knuth's World
We explore algorithms as life metaphors.
- **Sorting**: Why bring order to chaos? (Efficiency).
- **Permissions**: Who has the right to change the state of the world? (Power).
- **Recursion**: How do we solve a problem by solving a smaller version of it? (Understanding).
Every mission starts with a **Character Role** (d6-d12) and a **Goal**. Simple terminal commands are for information gathering, but commands taken under pressure require a **Skill Check**.

### A. Risk vs. Consequence (The Foot Gun)
We allow the user to bite themselves in the foot.
- **No Magic Glitches**: If `ssh` fails, it's because the port is closed or the key is wrong.
- **The Dice Roll**: Determines if you *found* the key in time, or if the Admin trusts you enough to open the port.
- **Failure**: 
    - **Technical**: `Permission denied`. Solution: Find a vulnerability or social engineer `su` access.
    - **Logic**: You wrote an infinite loop in your `scheme` script. Consequence: The reactor overheats (Game Over) because the cooling cycle hung.

### B. Access & Truth
- **People Lie**: An NPC email might say "I deleted the logs."
- **Computers Don't**: The `/var/log` shows the file is still there.
- **The Game**: verifying Human Lies against Computer Truth.
    - *Scenario*: The Captain claims the comms array is down (`social` check). You run `ping` and get a response (`real work`). You now know he is the Mole.

### B. Character Roles & Skills
Different roles change your relationship with the machine:
- **The Infiltrator (d8 Stealth, d6 Tech)**: Can `cd` into secure folders without alert, but struggles with `scheme` scripts.
- **The SysAdmin (d10 Tech, d6 Social)**: Can `kill` watcher processes easily but NPCs are naturally suspicious of them.
- **The Rogue Agent (d8 Social, d8 Stealth)**: Specialist in "The Mole" scenarios. Can lie comfortably in `/var/mail` but has basic tech skills.

---

## 2. Core Gameplay Mechanics (The Building Blocks)

### A. Remote System Simulation (The "Net")
Settings are not limited to one computer. The "Link" allows you to connect to **Remote Nodes**.
- **Discovery**: Use commands like `netstat` or `ping` (within the game's logic) to find IP addresses.
- **Access**: Commands like `ssh` or `connect` switch your filesystem view to a new, procedurally generated machine.
- **Persistence**: Files you download from a remote stay in your local `/home/operator/downloads`.

### B. Procedural Intelligence (Mail & Logs)
Every computer has a backstory hidden in its `/var/mail` and `/var/log`.
- **Mail Browsing**: Use `check-comms` or `mail` to read messages.
- **Intel Extraction**: NPCs will ask you to find specific "tokens" (passwords, coordinates) hidden in these messages.

### C. Cryptography (The "Lock")
Files can be encrypted (`.enc`). 
- **The Key**: You must find the correct `.key` file on a *different* machine.
- **The Roll**: Decrypting a file without the key requires a 24XX Skill Check (`CYBER_CRYPTOGRAPHY`).
    - **Success (5+)**: File decrypted.
    - **Setback (3-4)**: File decrypted but triggers a `TRACE` (timed event).
    - **Disaster (1-2)**: The file is corrupted, and the node locks you out.

### B. The Educational Arc: From Shell to Assembly
The game is a journey down the layers of abstraction.

1.  **High-Level (Shell)**: "Use these tools (`grep`, `sort`) to manage data."
    *   *Lesson*: Efficiency. Why do manually what a pipe `|` can do instantly?
2.  **Mid-Level (Scripting)**: "Automate your logic."
    *   *Lesson*: Repeatability. Defining functions to save your future self.
3.  **Low-Level (Assembly/Process)**: "Control the Machine directly."
    *   *Lesson*: Understanding. Modifying memory, managing CPU cycles (urgency), and seeing how the "magic" actually works.

### C. The Boundary of Trust (Computers vs. Characters)
In the 24XX system, the **Terminal** is an objective tool, but **Humans** are subjective variables.
- **Computer Limit**: A computer can tell you *who* logged in, but not *why*. `grep` can find a traitor's manifest, but characters can lie about what it means.
- **Trust Mechanics**:
    *   **The Infallible Log**: The machine never lies. If the log says "Door Open", it opened.
    *   **The Unreliable Narrator**: The NPC says "I was asleep." You use the Machine to prove them wrong.

### D. The Adversary: System Logic (Daemons)
You are not fighting a monster; you are fighting a script.
- **You are a PID**: You are a shell process (e.g., `bash` PID 4402).
- **The Enemy is a Daemon**: A `watchdog` service runs every 30 seconds.
    - *Script*: `if (user == "guest" && access_level == "restricted") kill(PID);`
- **The Gameplay**: You must escalate your privileges, hide your PID, or kill the watchdog before it kills you.

---

## Setting 1: The Hollows (Cyberpunk)
*Refer to previous section for details.*

---

## Setting 2: Deep Pressure (Submarine Mole Hunt)

### The Premise: The USS Valiant
You are the **Comms Officer** on the *USS Valiant*, a stealth sub on a mission that doesn't officially exist. Someone on board has disabled the long-range antennas and is planning to overload the reactor. You are the only person who hasn't been compromised because your terminal is on a separate, air-gapped circuit.

### Starter Mission: The Mole Hunt

#### 1. The Hook (Internal Alert)
> **Subject**: CRITICAL: REACTOR BYPASS DETECTED
> **From**: SYSTEM <root@valiant.internal>
>
> WARNING: Manual override of Cooling Pump 3 initiated at Terminal A-12.
> Radiation levels rising. Estimated reactor meltdown in T-minus 15 minutes.
> Find the process that initiated this and terminate it.

#### 2. The Objectives
- [ ] **Track**: Run `ps -ef` to find processes running from non-standard users.
- [ ] **Evidence**: Navigate to `/var/log/access` and search for the user who logged into Terminal A-12.
- [ ] **Intercept**: Use `check-comms` to read the ship's internal mail. Look for suspicious keywords like "Plan", "Deadline", "Traitor".
- [ ] **Confront**: Once you have the PID of the rogue process, `kill` it and lock `/etc/shadow` to prevent further access.

#### 3. The 24XX Stakes
- **Skill**: `SYSTEM_ADMIN` (Starts at d6)
- **Risk**: **Hull Integrity / Depth**. Mistakes cause the sub to dive deeper, increasing the "Visual Glitch" effect as pressure mounts.
- **Consequence**: "Disaster" (1-2) results in a **Pipe Burst**, flooding your terminal's keyboard buffer with `~~~~~~~~` (noise) for 5 seconds.

---

## Future Scenarios
- **The Black Market Node**: A hidden directory where you must `cd` into password-protected folders to retrieve decryption keys.
- **The Ghost in the Machine**: An interactive shell session where an AI talks to you through `/dev/tty`, begging for help while you try to format its drive.
