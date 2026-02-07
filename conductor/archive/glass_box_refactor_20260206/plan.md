# Implementation Plan: "Glass Box" Refactor

## Phase 1: Functional Purity & Observable Execution
- [x] Task: Delete WASM infrastructure (`src/infrastructure/wasm/`, `WasmCompilerService.ts`, `WasiFileSystemBridge.ts`).
- [x] Task: Refactor `CompileCommand` to use `Assembler.ts` and produce JSON artifacts.
- [x] Task: Update `ExecuteCommand` to detect JSON artifacts and route to `RISCVInterpreter`.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Observable Execution'

## Phase 2: ZINC Economy & Mining
- [x] Task: Implement `src/domain/entities/economy/MiningSession.ts` (Proof of Rhythm logic).
- [x] Task: Implement `src/domain/services/EconomyService.ts` (Ƶ wallet and persistence).
- [x] Task: Refactor `GameContext.tsx` to replace `creditService` with `EconomyService` and rename states to `zincBalance`.
- [x] Task: Conductor - User Manual Verification 'Phase 2: ZINC Economy'

## Phase 3: Shadow Input Gating
- [x] Task: Implement `src/domain/services/tutor/TutorShadow.ts` for unified input interception.
- [x] Task: Implement "Rail Shooter" gating logic (consume incorrect keys, trigger screen shake).
- [x] Task: Integrate mining hashing with `TutorShadow` hits.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Input Gating'

## Phase 4: Theatrical Presentation
- [x] Task: Implement `src/domain/services/PresentationDirector.ts` for theatrical command sequences.
- [x] Task: Add "Verb" mapping for core utilities (`gcc`, `ls`, `rm`, `cat`).
- [x] Task: Implement Piping Visualization ("Data Handshake").
- [x] Task: Conductor - User Manual Verification 'Phase 4: Theatrical Execution'

## Phase 5: The GRID Overlay (UI/UX)
- [x] Task: Implement `MainframeOverlay` component with "Big Glyph" Projector HUD.
- [x] Task: Implement "Ghost Text" input filling.
- [x] Task: Implement `HashRateMonitor` component with Chain Streaks and Overdrive visuals.
- [x] Task: Refine 80s Mainframe aesthetic (sharp edges, monochrome palettes).
- [x] Task: Conductor - User Manual Verification 'Phase 5: GRID UI'