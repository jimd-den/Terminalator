# Presentation Layer Audit & Modernization Report

## Executive Summary

This report provides a comprehensive analysis of the Presentation Layer, specifically focusing on `TerminalViewModel.ts`, `VimScreen.tsx`, and the `VimEditor.tsx` component. The goal is to identify architectural violations (SOLID, KISS, DRY, Clean Architecture) and provide a roadmap for "hardening" the codebase. This will pave the way for advanced animations (80s futuristic mainframe aesthetics) and the integration of a real POSIX shell backend.

**Current State:** The presentation layer is functional but tightly coupled. ViewModels often perform "View" duties (returning JSX) or "Domain" duties (instantiating services), making them rigid and difficult to test or animate granularly.

---

## 1. Codebase Violations Analysis

### A. TerminalViewModel.ts (`src/interface-adapters/viewmodels/TerminalViewModel.ts`)

#### 1. Single Responsibility Principle (SRP) - **VIOLATION**
The `TerminalViewModel` acts as a "God Object" for the screen. It manages:
- **UI State:** `activeView` (switching between Shell, Comms, Buffers).
- **Domain Logic:** `saveToArchive` (orchestrating data persistence).
- **Business Rules:** Contextual Hint logic (timers, inactivity checks).
- **Composition:** Aggregating `useShellViewModel` and `useMissionViewModel`.

**Impact:** Adding new animations (e.g., a "CRT power-off" effect when switching views) requires modifying this central logic file, risking regressions in domain logic.

#### 2. Dependency Inversion Principle (DIP) - **VIOLATION**
The ViewModel strictly depends on concrete implementations rather than abstractions.
```typescript
// Hardcoded dependency instantiation
const archiveService = useMemo(() => new ArchiveService(), []);
const hintService = useMemo(() => new HintService(), []);
```
**Impact:** You cannot easily swap `ArchiveService` for a mock during testing, nor can you inject a different implementation (e.g., a "Real POSIX" logger) without changing the code.

#### 3. Clean Architecture (The Four-Fold Shield) - **VIOLATION**
The ViewModel imports `GameManager` directly.
- `GameManager` is a "God Class" (Interface Adapter/Controller).
- **Violation:** The ViewModel should depend on specific **Use Cases** (e.g., `StartMissionUseCase`, `GetHintsUseCase`) rather than the entire Game Controller. This creates a "spoke-and-hub" dependency where the ViewModel knows too much about the game engine.

---

### B. VimEditor.tsx (`src/frameworks-drivers/ui/components/vim/VimEditor.tsx`)

*Note: This file acts as the ViewModel and the View simultaneously for the Vim screen.*

#### 1. Clean Architecture - **CRITICAL VIOLATION**
The `useVimEditor` hook returns **React Elements (JSX)** (`topContent`, `middleContent`, `bottomContent`).
```typescript
return { topContent, middleContent, bottomContent };
```
**Violation:** ViewModels should return **State** (Plain Old JavaScript Objects), not **UI**.
**Impact:** The "Look and Feel" is hardcoded into the "Logic". You cannot animate the `topContent` sliding in separately because the hook constructs the final JSX. To change the view, you must edit the logic.

#### 2. Dependency Inversion Principle (DIP) - **VIOLATION**
The hook uses `require` to dynamically import domain services inside the body.
```typescript
const fsService = useMemo(() => new (require('../../../../domain/services/FileSystemService').FileSystemService)(fs), [fs]);
```
**Violation:** This bypasses the module system and strict dependency injection. It makes static analysis and testing impossible.

#### 3. KISS & Performance (React Best Practices) - **VIOLATION**
- **Styles in Render:** `dynamicStyles` is recreated on every render.
- **Render Logic in Hook:** The `renderLine` function is defined *inside* the hook/component body.
**Impact:** This causes unnecessary garbage collection and performance hits. For "80s futuristic animations" (e.g., scanlines, glowing text), we need stable object references to prevent React from re-rendering the entire terminal on every keystroke.

---

### C. DRY (Don't Repeat Yourself)
- **Path Logic:** Both `TerminalViewModel` and `VimEditor` manually reconstruct file system services or context awareness logic that should be centralized in a `FileSystemProvider`.
- **Theme Access:** Multiple components access `theme.colors` and manually apply specific hex codes (e.g., `#CE9178` for strings) instead of using a centralized `SyntaxTheme` definition.

---

## 2. Modernization Roadmap (Recommendations)

To support your goal of **"More Animations"** and **"Real POSIX Shell"**, we must decouple the *State* from the *Render*.

### Phase 1: Structural Refactoring (The Separation)

#### 1. Refactor `TerminalViewModel` (Split UI from Logic)
Create specialized hooks. This allows the UI to animate independently of the business logic.

*   **`useTerminalLogic`**: Manages the *Shell* connection, file system, and command execution. (Returns `lines`, `cwd`, `user`).
*   **`useTerminalLayout`**: Manages `activeView`, `isTransitioning`, `tutorEmotion`. (Returns `viewState`, `transitions`).

**Benefit:** You can trigger a "glitch animation" in `useTerminalLayout` without checking the FileSystem state.

#### 2. Purify `useVimViewModel`
Change `useVimEditor` to return strictly **DATA**:
```typescript
// Proposed Interface
interface VimState {
    lines: string[];
    cursor: { line: number; col: number };
    mode: 'NORMAL' | 'INSERT' | 'COMMAND';
    status: string;
}
```
Create a separate **View Component** (`VimEditorView.tsx`) that takes this state and renders it.
**Benefit:** You can wrap the `VimEditorView` in an `Animated.View` or apply a CRT Shader effect to the text rendering layer without touching the Vim logic.

### Phase 2: Dependency Injection (The Flexible Core)

#### 1. Introduce a Service Container / Context
Instead of `new ArchiveService()`, pass these via a React Context (`ServiceContext`).
```typescript
// In App.tsx or similar
<ServiceContext.Provider value={{ archiveService, hintService, fileSystemService }}>
    <TerminalScreen />
</ServiceContext.Provider>
```
**Benefit:** When you want to bring in the "Real POSIX Shell", you simply inject a `RealPosixService` instead of the `GameMockService`. The UI code remains 100% identical.

### Phase 3: Preparing for Animations (The "80s Future" Look)

#### 1. Stable Identity for Lines
Ensure every output line has a stable `id`. Currently, using `index` as a key is common but bad for animations (reordering causes full re-renders).
```typescript
interface TerminalLine {
    id: string; // UUID
    content: string;
    timestamp: number;
}
```

#### 2. Componentization of Output
Move `renderLine` logic into a memoized component:
```typescript
const TerminalLine = React.memo(({ content, type }) => {
    // Heavy syntax highlighting or "glow" effects here
    return <Text style={glowStyle}>{content}</Text>;
});
```
**Benefit:** Only the changed line re-renders. This frees up the JS thread for heavy animation frames (scanlines, screen curvature).

### Phase 4: The "Real POSIX" Integration strategy

Since the user wants a real shell under the guise of the game:

1.  **Abstract the Executor:** Define a strict `ICommandExecutor` interface.
    *   Current: `GameCommandExecutor` (In-memory JS logic).
    *   Future: `SshCommandExecutor` or `WebContainerExecutor` (Real POSIX).
2.  **Bridge Pattern:** The `TerminalViewModel` should call `executor.execute(cmd)`. It shouldn't care if the result comes from a JS function or a real Linux kernel.

## Summary Checklist for Next Steps

1.  [ ] **Extract `VimView`**: Move JSX out of `useVimEditor`.
2.  [ ] **Apply SRP to `TerminalViewModel`**: Split into `Logic` vs `Layout` hooks.
3.  [ ] **Inject Services**: Remove `new Service()` calls; use Context.
4.  [ ] **Stable Keys**: Ensure all lists (buffer lines, vim lines) use stable IDs for animation support.

This approach adheres to **Clean Architecture** (Interface Adapters should be humble), **SRP** (One hook for logic, one for UI), and **OCP** (Open for new shells, closed for modification).
