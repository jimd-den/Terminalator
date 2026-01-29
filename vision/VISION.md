# VISION: Terminalator (Simple but Fun)

This document consolidates our design for a 24XX RPG-First terminal simulator. We answer the question: **Where is computing useful, and where does it fall short?**

## 1. The Hard Line: Logic vs. Magic
We separate strict POSIX computation from the RPG narrative layer.

- **The Logic (Work)**: The terminal follows POSIX laws. If you write an infinite loop in Scheme, the process hangs. If you `rm -rf /`, you bite your own foot. There are no "saving throws" for bad code.
- **The Magic (Dice)**: 24XX rolls determine **Access**, **Time**, and **Trust**. Can you social engineer a password? Does the Admin catch you before you finish your script?

## 2. You are a Process (PID)
You are not a "character" in a 3D world. You are an **Interactive Shell Session** (e.g., PID 4092).
- **Survival**: If the host system terminates your PID, you lose access.
- **Stealth**: You must use `ps`, `kill`, and `renice` to manage your visibility and survive within the system's logic.

## 3. The Adversary: Watchdog Daemons
The "enemies" are not monsters; they are **Watchdog Scripts**.
- Real, automated logic running on the host that checks for unauthorized PIDs, CPU spikes, or file modifications.
- To beat them, you don't "attack"—you **out-code** them or manipulate their environment.

## 4. The Educational Arc: The "Why"
We explore the utility of computation through a progression of complexity:
1. **Shell (Scale)**: Using `grep` and `find` to handle data that humans can't process manually.
2. **Scripting (Automation)**: Using `sh` and `scheme` to solve repeatable problems.
3. **Assembly (Understanding)**: Removing transistors and exploring the raw logic of cycles and memory.

## 5. Modular Worlds (Settings)
Settings are "Building Blocks" injected into the core engine.
- **Substratum 7**: Cyberpunk data-scavenging.
- **Deep Pressure**: Submarine mole-hunt with technical urgency.
- **The Archives**: A pre-transistor library where logic is physical.

---

### The Goal
Building a deep understanding of computer processes by placing them in high-stakes, narrative-driven RPG scenarios.
