# Specification: "Glass Box" Refactor

## Overview
Transform the Terminalator simulation from a standard terminal emulator into a high-fidelity, gamified "Glass Box" mainframe simulation where every action is observable, rhythmic, and theatrical.

## Core Pillars

### Phase I: Functional Purity (The WASM Purge)
*   **Eliminate Opaque Execution:** Remove WASM infrastructure (`src/infrastructure/wasm/`, `WasmCompilerService.ts`).
*   **Observable Compilation:** `CompileCommand` will use the internal `Assembler.ts` to produce JSON "Executable Artifacts".
*   **Observable Execution:** `ExecuteCommand` will route these artifacts to `RISCVInterpreter` for step-by-step execution.

### Phase II: The ZINC Economy (ZINC Is Not Cash)
*   **Cryptocurrency Implementation:** Replace `creditService` with `EconomyService.ts` (Ƶ balance).
*   **Proof of Rhythm Mining:** Introduce `MiningSession.ts` to track typing rhythm subdivisions (quarter, eighth, sixteenth notes).
*   **Persistence:** Store balance in a secure, hidden `.wallet` file.

### Phase III: The Shadow Architecture (Input Gating)
*   **Unified Interception:** Route all keyboard input through `TutorShadow.ts`.
*   **"Rail Shooter" Gating:** Enforce specific command sequences by consuming and "erasing" incorrect keystrokes with a screen shake effect.
*   **Mining Integration:** Hash current blocks through correct, rhythmic hits.

### Phase IV: Theatrical Mainframe Presentation
*   **Presentation Director:** `PresentationDirector.ts` will coordinate full-display theatrical sequences for command execution (verbs like "SYNTHESIZING BINARY", "PURGING ARTIFACTS").
*   **Piping Visualization:** Visualize "Data Handshakes" between piped processes.
*   **Consequence Loop:** High-impact "CRITICAL ERROR" (red theme) for failures vs "SYSTEM SECURE" for success.

### Phase V: The GRID Overlay (UI/UX)
*   **Projector HUD:** Massive, high-contrast glyph overlay for the "Next Character" required by the Tutor.
*   **Ghost Text:** Faint cyan input line that "fills in" as the user types correctly.
*   **Dynamic Hash Rate Monitor:** Real-time monitoring of Chain Streaks and Overdrive multipliers.
*   **80s Aesthetic:** Monochrome palettes, sharp pixel-perfect edges, vector-style pipe animations.
