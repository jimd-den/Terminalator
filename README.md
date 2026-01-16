# 📟 TERMINALATOR: The Grid Compass Mainframe

> **"STATUS: OPERATIONAL"**
> *Welcome back, Operator. The system is live. Secure your uplink.*

Terminalator is an immersive, 80s retro-futuristic mainframe simulation built for mobile navigation and high-stakes "hacking" gameplay. It blends a pure POSIX-compliant terminal experience with RPG elements, procedural missions, and a deep integrated toolset.

---

## 🏗️ Architectural Core: "The Four-Fold Shield"

This project is built from the ground up using **Strict Clean Architecture** to ensure maintenance-free evolution and extreme stability.

- **🛡️ Shield I: Pure Entities** — A full POSIX-compliant `FileSystem` (Inode/Dentry), `TerminalState`, and `VimEngine`.
- **🛡️ Shield II: Use Cases** — Orchestrated logic for command execution, mailing systems, and code compilation.
- **🛡️ Shield III: Adapters** — Decoupled `GameManager` and the persistent `ConsoleLayout` UI.
- **🛡️ Shield IV: Frameworks** — Premium React Native components with industrial aesthetics and high-performance animations.

---

## 🚀 Deployment Progress & Features

### 🟢 Completed Systems
- [x] **80s Industrial Aesthetic**: High-contrast green-on-black CRT styling, chunky header controls, and a blocky, persistent layout.
- [x] **Mobile-Optimized Terminal**: 
    - **Virtual Keyboard Toolbar**: Instant access to `TAB`, `ESC`, `/`, `-`, and arrow keys.
    - **Ghost Hint System**: Predictive command auto-suggestion.
- [x] **Seamless Vim Integration**: A full-screen, persistent Vim editor that "transforms" the console without screen flickering. Features include:
    - **Extreme Keyboard Persistence**: The keyboard never closes, even during mode transitions.
    - **Syntax Highlighting**: Strategy-pattern based highlighting for TypeScript and Scheme.
- [x] **POSIX Compliance**: 31+ core utilities implemented (`ls`, `cat`, `grep`, `mkdir`, `rm`, etc.).
- [x] **Mainframe Scheme**: A robust, R7RS-compatible Lisp engine with **Tail-Call Optimization (TCO)** for high-level scripting.
- [x] **RISC-V Assembly Engine**: A high-performance, interpreted RV32I virtual machine for "Hard Mode" hacking and optimization challenges. Supports `.s` files and Vim syntax highlighting.
- [x] **Mission System**: Procedural generation of transmissions via the `mail` and `check-comms` interfaces.

### 🟡 Active Development (On the Horizon)
- [ ] **Account Persistence**: Session-based survival with encrypted save states.
- [ ] **Network Simulation**: Remote host connection (`ssh`) and cross-system file transfers.
- [ ] **Advanced Assembly Engine**: A low-level "Mainframe Assembly" for micro-optimization challenges.

---

## 🛠️ Development & Tooling

### Strict Principles (The GEMINI System)
1. **Literate Documentation**: Every source file is a "whitepaper" for stakeholders.
2. **Dependency Minimalism**: Standard libraries first. No bloat.
3. **Observability**: Granular telemetry for every system event.
4. **SOLID/KISS Equilibrium**: Robust architecture, simple implementation.

### Running Compliance Tests
To verify the POSIX core and terminal logic:
```bash
npx tsx scripts/posix_suite.ts
```

To test the Scheme Lisp engine:
```bash
npx tsx scripts/test_scheme.ts
```

---

> [!NOTE]
> *This is a live terminal environment. Ensure your terminal font scaling is optimized for 30px (Industrial Standard).*
