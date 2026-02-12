# Tech Stack

## Core Platform
- **Framework:** [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Execution Environments:** Android, iOS, Web (via `react-native-web`)

## Domain-Specific Engines
  - **Terminal Simulation:** 
    - `VimEngine`: State-pattern based Vim engine with persistent Undo/Redo capability.
    - `InputProvider`: Global keyboard orchestration with "Always On" focus management.
    - `ThemeContext`: Dynamic provider for palette expansion and component context injection.
    - `SimulationBus`: Central nervous system for Event-Driven Architecture (EDA), broadcasting domain events (COMMAND_EXECUTED, SYSTEM_BOOT, PERSONA_SWITCHED, etc.).
    - `TutorObserver`: Autonomous "nervous system" bridge translating system events into semantic `TutorIntent` for the generative engines.
    - `TutorEngine`: Context-aware pedagogical system capable of interpreting procedural mission intent.
    - `TutorBrain`: Persona orchestration engine.
    - `TutorSpy`: Performance analysis engine (WPM, Accuracy, Stalls).
    - `MasteryTracker`: Command-level skill tracking algorithm.
    - `TutorMessagingService`: Serialized message delivery system with UI synchronization.
    - `CombinatorialUtteranceEngine`: Pure functional sentence factory capable of generating millions of unique dialogue permutations using a structural grammar and lexicon.
    - `AdaptiveTutorEngine`: Contextual advisor bridging knowledge base capabilities with the combinatorial engine for deep technical coaching.
  - **System Simulation:** 
    - `FileSystem`: A custom, in-memory/persistent POSIX-compliant file system abstraction.
    - `ProcessManager`: Simulation of process life cycles, signals, and job control.
    - `CommandRegistry`: Extensible architecture for implementing POSIX and custom commands.
    - `CreditService`: Global state management for user rewards.
    - `LanguageExecutionService`: Mock execution environment for Scheme and Assembly.- **World Generation:** 
    - `IVimCommand`, `CommandHistory`: Entity and Use Case for undoable editor operations.
    - `ThemeColors`: Expanded palette supporting opacity-based semantic variants (primary_10, etc.).
    - `IVimMode`: Strategy-based interface for Vim modes (Normal, Insert, Command).
  - `WorldManager`: Procedural generator for "The Grid" (Locations, Devices, Connections).

## Architectural Patterns
- **Paradigm:** Clean Architecture
- **Communication:** Event-Driven Architecture (EDA) via the Observer Pattern.
- **Layers:**
  - **Entities:** Pure business logic (e.g., `Command.ts`, `FileSystem.ts`, `IVimCommand.ts`).
    - *Constraint:* MUST NOT depend on Use Cases or outer layers.
  - **Use Cases:** Application-specific business rules.
  - **Interface Adapters:** Mappers and controllers (e.g., `GameManager`, `WorldManager`, `VimSimulator`).
    - *Constraint:* Ideally framework-agnostic. Move pure logic out of React Hooks where possible.
    - `DiskCreditRepository`, `DiskMasteryRepository`: Port implementations for simulated persistence.
    - `useTutorMessagingController`: Humble Object wiring domain logic to UI.
    - `VimSimulator`: Orchestrator implementing `BufferPersistencePort`.
    - `DiskSettingsRepository`: Persistent storage for user preferences (Theme, Typography, System).
  - **Frameworks & Drivers:** UI components and external service integrations.
    - `SettingsPane`: High-density, multi-tabbed configuration interface.

## Infrastructure & Tools
- **State Management:** React Context / Custom State DTOs.
- **Navigation:** `@react-navigation/native`
- **Fonts:** Google Fonts via Expo (`Inconsolata`, `Roboto Mono`, `Space Mono`, `Ubuntu Mono`).
- **Build System:** Expo EAS.
- **Testing:** Custom TypeScript-based test runners and simulation scripts.
