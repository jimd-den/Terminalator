# Tech Stack

## Core Platform
- **Framework:** [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Execution Environments:** Android, iOS, Web (via `react-native-web`)

## Domain-Specific Engines
- **Terminal Simulation:** 
  - `VimEngine`: High-fidelity Vim modal editing simulation.
  - `TutorEngine`: Interactive pedagogical system for guided learning.
- **System Simulation:** 
  - `FileSystem`: A custom, in-memory/persistent POSIX-compliant file system abstraction.
  - `ProcessManager`: Simulation of process life cycles, signals, and job control.
  - `CommandRegistry`: Extensible architecture for implementing POSIX and custom commands.
- **World Generation:** 
  - `WorldManager`: Procedural generator for "The Grid" (Locations, Devices, Connections).

## Architectural Patterns
- **Paradigm:** Clean Architecture
- **Layers:**
  - **Entities:** Pure business logic (e.g., `Command.ts`, `FileSystem.ts`).
  - **Use Cases:** Application-specific business rules.
  - **Interface Adapters:** Mappers and controllers (e.g., `GameManager`, `WorldManager`).
  - **Frameworks & Drivers:** UI components and external service integrations.

## Infrastructure & Tools
- **State Management:** React Context / Custom State DTOs.
- **Navigation:** `@react-navigation/native`
- **Fonts:** Google Fonts via Expo (`Inconsolata`, `Roboto Mono`, `Space Mono`, `Ubuntu Mono`).
- **Build System:** Expo EAS.
- **Testing:** Custom TypeScript-based test runners and simulation scripts.
