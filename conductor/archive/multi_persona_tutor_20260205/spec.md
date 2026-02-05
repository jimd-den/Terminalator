# Specification: Robust Multi-Persona Tutor System & Gamification Core

## Overview
This track focuses on architecting a robust, data-driven Tutor system capable of supporting multiple personas (e.g., "Big Sister", "Rogue AI") and adaptive learning algorithms. It also introduces a global gamification layer (Credits) to reward mastery. The system must adhere to Clean Architecture, allowing for easy extension of personas and learning strategies without modifying core logic.

## Core Features

### 1. Multi-Persona Architecture (The Brain)
- **Goal:** Support swappable "Tutor Personalities" (Strategy Pattern) that define voice, tone, and reaction logic.
- **Requirement:** A `TutorBrain` entity that orchestrates the active persona.
- **Data-Driven:** Personas and their dialogue lines must be loaded from JSON/Data definitions, allowing for infinite variety.

### 2. Adaptive Learning Algorithm (The Teacher)
- **Goal:** Analyze user input (shell commands, Vim edits) to detect skill level and intent.
- **Requirement:** "Show, Don't Tell." If a user fails `cd` 3 times, the Tutor shouldn't just say "type cd"; it should lock the input, type it out to demonstrate, and then unlock for the user to try.
- **Metrics:** Track WPM, Error Rate, and "Concept Mastery" (boolean flags for known concepts).

### 3. Visual Fidelity & Control (The Body)
- **Goal:** Make the Tutor feel "alive" and integrated into the machine.
- **Requirement:** 
    - **Typing Animation:** Messages appear character-by-character or with a "..." processing indicator.
    - **Input Control:** The Tutor must be able to **Lock/Unlock** the keyboard during critical explanations.
    - **Glitch Effects:** Visual shaking/color-shifting synced to the Tutor's "Emotion" state.

### 4. Global Credit System (The Reward)
- **Goal:** Gamify the learning process.
- **Requirement:** A persistent `CreditSystem` entity. Credits are displayed on the main dashboard and awarded for:
    - Completing Missions.
    - Mastering a new command (first successful use).
    - High-speed/High-accuracy streaks.

## Technical Constraints
- **Clean Architecture:** 
    - **Entities:** `TutorBrain`, `Persona`, `CreditAccount`.
    - **Use Cases:** `EvaluatePerformance`, `SwitchPersona`, `AwardCredits`.
    - **Adapters:** `TutorController` (React hooks), `PersonaLoader` (JSON).
- **SOLID/KISS:** Keep the core loop simple. Complex logic belongs in the swappable Strategies, not the Controller.
- **Testing:** TDD is mandatory. All learning algorithms must be unit tested.

## User Stories
- As a novice, I want the Tutor to notice if I'm struggling with a command and show me how to do it.
- As a player, I want to unlock "Rogue" personas that mock me or give me illegal missions.
- As a player, I want to see my Credits increase when I perform well, giving me a sense of progression.
