# Implementation Plan: Dispositional Tutor AI

## Phase 1: Utterance Engine & Domain (High Priority)
- [x] Task: Refactor `CombinatorialFactory` to output `MissionGrammar` (Single Source of Truth).
- [x] Task: Define `TutorIntent` and `TutorToneProfile` Enums.
- [x] Task: Define `TutorTemplate` interface (`id`, `intent`, `tone`, `text`, `weight`).
- [x] Task: Implement `UtteranceEngine` pure function: `(intent, tone, context) -> TutorAction`.
- [x] Task: Create a basic `TemplateCatalog`.
- [x] Task: Conductor - User Manual Verification 'Phase 1: Utterance Engine'

## Phase 2: PsychAdapter & Proxies (High Priority)
- [x] Task: Implement `PsychAdapter` to manage `ToneProfile` state.
- [x] Task: Implement `TutorProxy` factory to wrap `CpuState` and `FileSystem`.
- [x] Task: Implement interception logic to capture deep `Context` for the Utterance Engine.
- [x] Task: Conductor - User Manual Verification 'Phase 2: PsychAdapter & Proxies'

## Phase 3: Integration with Simulation Bus (Medium Priority)
- [x] Task: Create `TutorObserver` service that subscribes to the `SimulationBus`.
- [x] Task: Map `GameEvent`s to `TutorIntent` triggers (e.g., Error -> REPRIMAND) or `ToneProfile` shifts.
- [x] Task: Conductor - User Manual Verification 'Phase 3: Integration'

## Phase 4: Polish & Technical Thesaurus (Low Priority)
- [x] Task: Implement `TechnicalThesaurus` using reflection.
- [x] Task: Add "Juicy" feedback for specific command interactions.
- [x] Task: Conductor - User Manual Verification 'Phase 4: Polish'

## Phase 5: Event-Driven Refactor (EDA)
- [x] Task: Audit and Refactor `TutorService` to be reactive (subscribe to domain events).
- [x] Task: Finalize `TutorObserver.ts` as the sole entry point for reactive behavior.
- [x] Task: Register `TutorObserver` in `DependencyContainer.ts` (Dependency Injection).
- [x] Task: Decouple `MissionService` from manual `TutorService` calls (Inversion of Control).
- [x] Task: Refactor `useTutorMessagingController.ts` to be a pure subscriber (Humble View).
- [x] Task: Verification - Ensure Tutor interjects proactively based on `SimulationBus` events.
