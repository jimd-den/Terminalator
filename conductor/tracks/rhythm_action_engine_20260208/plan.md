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

## Phase 3: Theatrical Execution & Result Stack
*Goal: Implement the managed lifecycle for commands.*

- [x] Task: Refine `SimulationMediator`
    - [x] Implement the full lifecycle: Pre-anim -> Execute -> Post-anim -> Result Card.
- [x] Task: Implement `ResultStackView` component
    - [x] Create `src/frameworks-drivers/ui/components/theatrical/ResultStackView.tsx`.
    - [x] Handle vertical stacking of static "flexible square" cards.
- [x] Task: Update `TheatricalCanvas`
    - [x] Add support for `PRE_ANIMATION` (Scan) and `POST_ANIMATION` (OK/ERR) visual states.
- [~] Task: Conductor - User Manual Verification 'Theatrical Execution' (Protocol in workflow.md)

## Phase 4: Core Command Porting
*Goal: Integrate core commands into the new metadata strategy.*

- [ ] Task: Implement `CommandMetadata` strategy
    - [ ] Refine `Command` entities to return metadata.
- [ ] Task: Port 10 core commands
    - [ ] Update `ls`, `cat`, `grep`, `cd`, `pwd`, `mkdir`, `touch`, `rm`, `cp`, `mv`.
- [ ] Task: Conductor - User Manual Verification 'Command Porting' (Protocol in workflow.md)

## Phase 5: Final Polishing & Performance
*Goal: Ensure a smooth mobile experience.*

- [ ] Task: Verify mobile performance
    - [ ] Check for frame drops and clock drift during heavy stacking.
- [ ] Task: Final UI Polish
    - [ ] Ensure clean transitions between Tutor and Execution modes.
- [ ] Task: Conductor - User Manual Verification 'Final Polished Engine' (Protocol in workflow.md)
