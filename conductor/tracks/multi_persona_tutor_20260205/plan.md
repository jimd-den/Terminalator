# Implementation Plan - Robust Multi-Persona Tutor System & Gamification Core

## Phase 1: Core Architecture & Credit System
- [ ] Task: Create `CreditSystem` Entity and `ICreditService` Interface.
    - [ ] Write Tests: Earning credits, spending credits, persistence.
    - [ ] Implement: Basic credit tracking logic.
- [ ] Task: Implement `CreditDisplay` Component (UI).
    - [ ] Implement: A simple, retro-styled credit counter on the main screen.
- [ ] Task: Define `ITutorPersona` Interface and `TutorBrain` Entity.
    - [ ] Write Tests: Switching personas changes the reaction logic.
    - [ ] Implement: The core state machine for the Tutor.
- [ ] Task: Conductor - User Manual Verification 'Core Architecture & Credit System' (Protocol in workflow.md)

## Phase 2: Adaptive Learning & Input Control
- [ ] Task: Implement `InputControlService` (Lock/Unlock/Inject).
    - [ ] Write Tests: Service can prevent input and inject keystrokes.
    - [ ] Implement: Integration with `VimInputHandler` and Shell Input.
- [ ] Task: Implement `MasteryTracker` (Learning Algorithm).
    - [ ] Write Tests: Tracking success/failure counts for specific commands (`cd`, `ls`, `vim`).
    - [ ] Implement: Logic to determine if a user is "Novice", "Competent", or "Master" at a skill.
- [ ] Task: Conductor - User Manual Verification 'Adaptive Learning & Input Control' (Protocol in workflow.md)

## Phase 3: Visual Fidelity & Typing Animations
- [ ] Task: Create `TypingIndicator` Component.
    - [ ] Implement: A "..." animation that plays before a message appears.
- [ ] Task: Refactor `TutorBar` to support Typing State.
    - [ ] Implement: Logic to queue messages and display them with a "typing" delay.
- [ ] Task: Conductor - User Manual Verification 'Visual Fidelity & Typing Animations' (Protocol in workflow.md)

## Phase 4: Data-Driven Personas & Content
- [ ] Task: Create JSON Schema for Tutor Personas.
    - [ ] Implement: `Standard.json`, `Rogue.json`.
- [ ] Task: Implement `PersonaLoader` Service.
    - [ ] Write Tests: Loading valid/invalid JSON.
    - [ ] Implement: Parsing and hydrating the `TutorBrain`.
- [ ] Task: Wire Everything Together.
    - [ ] Implement: `GameManager` uses `MasteryTracker` to trigger `TutorBrain` reactions, which use `InputControlService` to demonstrate skills.
- [ ] Task: Conductor - User Manual Verification 'Data-Driven Personas & Content' (Protocol in workflow.md)
