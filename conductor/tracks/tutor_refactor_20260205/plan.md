# Implementation Plan - Refactor Tutor Architecture for Persistence and Concurrency

## Phase 1: Logic Migration (Humble Object)
- [~] Task: Extend `TutorBrain` to handle `GameManager` events.
    - [ ] Write Tests: Brain receives 'COMMAND_EXECUTED' and decides whether to speak.
    - [ ] Implement: `TutorBrain.observe(gameManager)`.
- [ ] Task: Move "Random Comment" logic to `TutorBrain`.
    - [ ] Implement: Logic for 30% chance (configurable in Persona) moved to Domain.
- [ ] Task: Refactor `useTutorMessagingController` to be "Humble".
    - [ ] Implement: Remove all logic; it just connects the pipe.
- [ ] Task: Conductor - User Manual Verification 'Logic Migration' (Protocol in workflow.md)

## Phase 2: Persistence Layer
- [ ] Task: Define `ICreditRepository` and `IMasteryRepository`.
- [ ] Task: Implement `DiskCreditRepository` and `DiskMasteryRepository`.
    - [ ] Write Tests: Saving/Loading from `FileSystem`.
    - [ ] Implement: JSON serialization to hidden file paths.
- [ ] Task: Update `CreditService` and `MasteryTracker` to use Repositories.
    - [ ] Implement: Load on init, save on change.
- [ ] Task: Conductor - User Manual Verification 'Persistence Layer' (Protocol in workflow.md)

## Phase 3: Concurrency & Queue Consumption
- [ ] Task: Implement `TutorMessageQueue` Logic in Domain.
    - [ ] Ensure `TutorMessagingService` is the single source of truth.
- [ ] Task: Implement `useTutorQueue` Hook.
    - [ ] Implement: A hook that polls the service, handles the typing delay state locally, and ensures serial playback.
- [ ] Task: Refactor `GameContext` to delegate to `useTutorQueue`.
- [ ] Task: Conductor - User Manual Verification 'Concurrency & Queue Consumption' (Protocol in workflow.md)
