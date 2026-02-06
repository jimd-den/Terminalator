
# Phase 3: Interface Adapters & Infrastructure Audit Report

## 1. Interface Adapters Audit (`src/interface-adapters`)

### Summary
The Interface Adapters layer is well-populated with Controllers, ViewModels, Mappers, and Repositories. It serves its primary purpose of converting data between the Domain and external agencies.

### Findings
- **React Hook Controllers:** Many controllers (e.g., `OutputController`, `InputController`) and viewmodels (e.g., `TerminalViewModel`) are implemented as React Hooks.
  - **Clean Architecture Assessment:** This creates a direct source code dependency on the `react` framework within the `src/interface-adapters` layer. 
  - **Violation:** This is a violation of the rule that Interface Adapters should be independent of the UI framework. In a strict implementation, the logic should be in framework-agnostic classes, with the hooks residing in the `frameworks-drivers` layer as wrappers.
  - **Pragmatic Note:** This pattern is common in React Native development to leverage hook-based state management, but it "leaks" the framework choice into the adapters layer.
- **Mappers:** `src/interface-adapters/mappers` correctly contains logic to map entities to DTOs for the view (e.g., `TerminalStateMapper`).
- **Repositories:** Classes like `DiskCreditRepository` and `DiskSettingsRepository` correctly implement domain interfaces (ports) and interact with the simulated filesystem (Domain Service).

## 2. Infrastructure Audit (`src/infrastructure`)

### Summary
The Infrastructure layer contains concrete implementations of domain interfaces and framework-specific services.

### Findings
- **Services:** `src/infrastructure/services` contains `StubCompilerService`, `WasmCompilerService`, etc.
  - **Compliance:** These correctly implement Domain ports (e.g., `ICompilerService`).
- **Telemetry:** `ConsoleTelemetryAdapter` correctly implements telemetry interfaces.
- **Dependency Rule:** Infrastructure correctly depends on the Domain. No inward dependencies from Domain to Infrastructure were found.

## 3. General Observation: Screaming Architecture
The folder structure `controllers`, `viewmodels`, `mappers`, `presenters` within `interface-adapters` is clear and aligned with Clean Architecture principles. However, the files *within* these folders "scream" React due to the hook-based implementation.

## 4. Recommendation
If strict decoupling is desired, the logic within the React-hook controllers should be moved to pure JavaScript/TypeScript classes. The React hooks should then be moved to `src/frameworks-drivers/ui/hooks/` and serve only to bridge the UI to the pure controllers.
