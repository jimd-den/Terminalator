# Tech Stack

## Core Platform
- **Framework:** [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Execution Environments:** Android, iOS, Web (via `react-native-web`)

## Domain-Specific Engines
  - **Terminal Simulation:** 
    - `VimEngine`: High-fidelity Vim modal editing simulation.
    - `TutorEngine`: Interactive pedagogical system for guided learning.
    - `TutorBrain`: Persona orchestration engine.
    - `TutorSpy`: Performance analysis engine (WPM, Accuracy, Stalls).
    - `MasteryTracker`: Command-level skill tracking algorithm.
    - `TutorMessagingService`: Serialized message delivery system with UI synchronization.
  - **System Simulation:** 
    - `FileSystem`: A custom, in-memory/persistent POSIX-compliant file system abstraction.
    - `ProcessManager`: Simulation of process life cycles, signals, and job control.
    - `CommandRegistry`: Extensible architecture for implementing POSIX and custom commands.
    - `CreditService`: Global state management for user rewards.
    - `LanguageExecutionService`: Mock execution environment for Scheme and Assembly.- **World Generation:** 
  - `WorldManager`: Procedural generator for "The Grid" (Locations, Devices, Connections).

## Architectural Patterns
- **Paradigm:** Clean Architecture
- **Layers:**
  - **Entities:** Pure business logic (e.g., `Command.ts`, `FileSystem.ts`).
  - **Use Cases:** Application-specific business rules.
  - **Interface Adapters:** Mappers and controllers (e.g., `GameManager`, `WorldManager`).
    - `DiskCreditRepository`, `DiskMasteryRepository`: Port implementations for simulated persistence.
    - `useTutorMessagingController`: Humble Object wiring domain logic to UI.
  - **Frameworks & Drivers:** UI components and external service integrations.

## Infrastructure & Tools
- **State Management:** React Context / Custom State DTOs.
- **Navigation:** `@react-navigation/native`
- **Fonts:** Google Fonts via Expo (`Inconsolata`, `Roboto Mono`, `Space Mono`, `Ubuntu Mono`).
- **Build System:** Expo EAS.
- **Testing:** Custom TypeScript-based test runners and simulation scripts.
