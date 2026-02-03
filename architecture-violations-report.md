# Architecture Violations Report

## 1. CRITICAL: Dependency Inversion Principle (DIP) Violation
**Severity:** HIGH
**Status:** FIXED ✅

**The Violation:**
The Domain layer (Use Case) was directly importing from the Interface Adapter layer.
`src/domain/usecases/ExecuteCommand.ts` imported `WorldManager`.

**The Fix:**
1.  Defined `IWorldManager` interface in Domain Layer.
2.  Refactored `ExecuteCommand` to depend on `IWorldManager`.
3.  Implemented `IWorldManager` in `WorldManager` adapter.

---

## 2. Leaky Abstraction (Humble Object Pattern Violation)
**Severity:** MEDIUM
**Status:** OPEN ⚠️
**Location:** `src/domain/entities/Command.ts`

**The Violation:**
The `CommandResponse` entity contains UI-specific instructions:
```typescript
export interface CommandResponse {
    // ...
    uiAction?: 'CLEAR'; 
    navigationAction?: { ... };
}
```

**Why this breaks Clean Architecture:**
Martin states (Chapter 22): "The name of a software entity should not depend on the name of a web server... or the UI."
The Domain is knowing too much about *how* the data is presented. 'CLEAR' is a screen-specific concept.

**The Fix:**
Return a generic `SystemState` or `Signal`. The `TerminalViewModel` (Interface Adapter) should interpret that signal and decide to clear the screen.

---

## 3. The "Composition Root" Anti-Pattern (Hard Coupling)
**Severity:** MEDIUM
**Status:** FIXED ✅

**The Violation:**
`GameManager` was acting as a Factory, hardcoding the construction of the entire system graph using `new`.

**The Fix:**
1.  Created `src/infrastructure/di/DependencyContainer.ts` as the Composition Root.
2.  Refactored `GameManager` to use Constructor Injection for all services.
3.  Updated `GameContext.tsx` to use the `DependencyContainer`.

---

## 4. Anemic Domain Model (Data Structures vs Objects)
**Severity:** LOW (Debatable)
**Status:** OPEN ⚠️
**Location:** `src/domain/entities/TerminalState.ts`

**The Violation:**
`TerminalState` is a pure data structure (DTO) with no behavior, passed around to Services that manipulate it.

**Why this breaks OOAD:**
Booch (Chapter 3) defines an object as having "State, Behavior, and Identity."
Martin often critiques "Anemic Domain Models".

**The Fix:**
Encapsulate state mutation logic within the Entity itself.
