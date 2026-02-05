# Implementation Plan - Refactor Tutor Architecture for Persistence and Concurrency

## Phase 1: Logic Migration (Humble Object) [checkpoint: 5af9404]
- [x] Task: Extend `TutorBrain` to handle `GameManager` events. da1b545
    - [x] Write Tests: Brain receives 'COMMAND_EXECUTED' and decides whether to speak. da1b545
    - [x] Implement: `TutorBrain.observe(gameManager)`. da1b545
- [x] Task: Move "Random Comment" logic to `TutorBrain`. da1b545
    - [x] Implement: Logic for 30% chance (configurable in Persona) moved to Domain. da1b545
- [x] Task: Refactor `useTutorMessagingController` to be "Humble". da1b545
    - [x] Implement: Remove all logic; it just connects the pipe. da1b545
- [x] Task: Conductor - User Manual Verification 'Logic Migration' (Protocol in workflow.md) 5af9404

## Phase 2: Persistence Layer [checkpoint: c40cf7d]
- [x] Task: Define `ICreditRepository` and `IMasteryRepository`. c40cf7d
- [x] Task: Implement `DiskCreditRepository` and `DiskMasteryRepository`. c40cf7d
    - [x] Write Tests: Saving/Loading from `FileSystem`. c40cf7d
    - [x] Implement: JSON serialization to hidden file paths. c40cf7d
- [x] Task: Update `CreditService` and `MasteryTracker` to use Repositories. c40cf7d
    - [x] Implement: Load on init, save on change. c40cf7d
- [x] Task: Conductor - User Manual Verification 'Persistence Layer' (Protocol in workflow.md) c40cf7d

## Phase 3: Concurrency & Queue Consumption [checkpoint: 4f681ab]
- [x] Task: Implement `TutorMessageQueue` Logic in Domain. 4f681ab
    - [x] Ensure `TutorMessagingService` is the single source of truth. 4f681ab
- [x] Task: Implement `useTutorQueue` Hook. 4f681ab
    - [x] Implement: A hook that polls the service, handles the typing delay state locally, and ensures serial playback. 4f681ab
- [x] Task: Refactor `GameContext` to delegate to `useTutorQueue`. 4f681ab
- [x] Task: Conductor - User Manual Verification 'Concurrency & Queue Consumption' (Protocol in workflow.md) 4f681ab
