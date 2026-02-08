# Specification: Refactor Tutor Architecture for Persistence and Concurrency

## Overview
This track addresses critical architectural debt identified in the "Robust Multi-Persona Tutor" implementation. We will refactor the system to strictly adhere to Clean Architecture principles by moving business logic out of the UI layer, implementing proper persistence for gamification data, and ensuring thread-safe message handling for the Tutor UI.

## Core Refactoring Goals

### 1. Fix the "Humble Object" Violation
- **Problem:** `useTutorMessagingController` contains probability logic (30% chance for comments) and direct event subscription logic.
- **Solution:** Move all decision-making logic into the `TutorBrain` (Entity/Use Case). The Controller should simply wire the Brain's output to the `TutorMessagingService`.
- **Mechanism:** `TutorBrain` will observe `GameManager` directly (via a new Domain Event or Port).

### 2. Implement Persistence (The "Detail")
- **Problem:** Credits and Mastery Levels are lost on restart.
- **Solution:** Implement `DiskCreditRepository` and `DiskMasteryRepository` using the existing `FileSystem` infrastructure.
- **Mechanism:** `CreditService` and `MasteryTracker` will depend on repository interfaces (`ICreditRepository`, `IMasteryRepository`), not in-memory maps.

### 3. Concurrency & Message Queueing
- **Problem:** The UI (`GameContext`) has a race condition where rapid messages overwrite each other or desync from the Domain Queue.
- **Solution:** Implement a proper `MessageQueueConsumer` in the UI layer that pulls one message, plays the typing animation, and *then* requests the next message.
- **Mechanism:** `GameContext` will no longer hold `activeTutorMessage` state directly in a way that conflicts with the service. It will act as a pipeline.

### 4. Decompose GameContext (The "God Class")
- **Problem:** `GameContext` knows too much.
- **Solution:** While a full DI refactor is out of scope, we will extract `useTutorSystem` and `useGamification` into separate custom hooks or sub-providers to reduce the bloat in the main provider.

## Technical Constraints
- **Strict SRP:** UI code must contain NO probability or game logic.
- **Persistence:** Must use the simulated `FileSystem` (e.g., `/home/operator/.local/share/credits.json`).
- **Testing:** New logic must be unit tested without React.

## User Stories
- As a player, I want my credits and skill levels to save so I can progress over multiple sessions.
- As a player, I want to see every message the Tutor sends, even if they happen quickly, without them getting cut off.
