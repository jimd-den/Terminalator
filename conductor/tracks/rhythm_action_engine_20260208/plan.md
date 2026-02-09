# Implementation Plan: Rhythm-Action Command Engine

## Phase 1: Rhythm Conductor & Shared Heartbeat [checkpoint: 3a55ad5]
*Goal: Establish the central timing authority.*

- [x] Task: Create `RhythmConductor` Service
    - [x] Implement `src/domain/services/RhythmConductor.ts`.
    - [x] Implement High-Precision Heartbeat with drift correction (checking `Date.now()`).
    - [x] Emit `RHYTHM_TICK` on `SimulationBus`.
- [x] Task: Conductor - User Manual Verification 'Rhythm Conductor' (Protocol in workflow.md)

## Phase 2: Tutor Mode Enhancements (Rhythmic Guidance) [checkpoint: 724a784]
*Goal: Use the heartbeat to guide user typing.*

- [x] Task: Update `TutorEngine` to be rhythm-aware
    - [x] Add properties for BPM and "Next Beat" expectation.
- [x] Task: Implement `TutorOverlay` (or update `MainframeOverlay`)
    - [x] Create `src/frameworks-drivers/ui/components/theatrical/TutorOverlay.tsx`.
    - [x] Listen to `RHYTHM_TICK` and pulse the next character in the ghost text.
- [x] Task: Update reward logic
    - [x] Sync `MiningSession` rewards with the `RHYTHM_TICK` tolerance (e.g., 80ms window).
- [x] Task: Conductor - User Manual Verification 'Tutor Mode' (Protocol in workflow.md)

## Phase 3: Theatrical Execution & Result Stack [checkpoint: 615e021]
*Goal: Implement the managed lifecycle for commands.*

- [x] Task: Refine `SimulationMediator`
    - [x] Implement the full lifecycle: Pre-anim -> Execute -> Post-anim -> Result Card.
- [x] Task: Implement `ResultStackView` component (Unified Console)
    - [x] Create `src/frameworks-drivers/ui/components/theatrical/ResultStackView.tsx`.
    - [x] Handle unified "Active" and "History" cards with solid 80s mainframe aesthetics.
- [x] Task: Decommission `TheatricalCanvas`
    - [x] Consolidate animation logic into `ResultStackView`.
    - [x] Remove redundant component and references from screens.
- [x] Task: Conductor - User Manual Verification 'Theatrical Execution' (Protocol in workflow.md)

## Phase 4: Core Command Porting
*Goal: Integrate core commands into the new metadata strategy.*

- [x] Task: Implement `CommandMetadata` strategy
    - [x] Refine `Command` entities to return metadata.
- [x] Task: Port 10 core commands
    - [x] Update `ls`, `cat`, `grep`, `cd`, `pwd`, `mkdir`, `touch`, `rm`, `cp`, `mv`.
- [x] Task: Conductor - User Manual Verification 'Command Porting' (Protocol in workflow.md)

## Phase 5: Final Polishing & Performance
*Goal: Ensure a smooth mobile experience.*

- [ ] Task: Verify mobile performance
    - [ ] Check for frame drops and clock drift during heavy stacking.
- [ ] Task: Final UI Polish
    - [ ] Ensure clean transitions between Tutor and Execution modes.
- [ ] Task: Conductor - User Manual Verification 'Final Polished Engine' (Protocol in workflow.md)
