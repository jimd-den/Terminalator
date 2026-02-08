# Headless Architecture & Universal Interface Plan

## Executive Summary
This plan details the refactoring of `Terminalator` into a **Headless Architecture**. The goal is to decouple the Core Logic (Domain/Use Cases) from the Presentation Layer (UI), enabling:
1.  **Infinite Theming:** Themes can dictate Layout (3D, Organic, Glitch), not just colors.
2.  **Cultural Rendering:** Support for complex non-Latin scripts (Bamum, Xhosa) via interchangeable Text Renderers.
3.  **Performance:** Preparation for moving core logic to a Web Worker.

## Phase 1: Decoupling the Editor (Vim)

**Current Status:** `useVimEditor` returns JSX Elements (`topContent`, etc.), tightly coupling logic to React Native primitives.

### Action Plan
1.  **Create `useHeadlessVim` Hook:**
    *   **Input:** `filename`, `fsService`.
    *   **Output (Pure State):**
        ```typescript
        interface VimState {
            lines: string[];
            cursor: { line: number, col: number };
            mode: 'NORMAL' | 'INSERT' | 'VISUAL' | 'COMMAND';
            viewport: { startLine: number, endLine: number };
            lintErrors: LintError[];
            tokens: SemanticToken[]; // Pre-computed generic tokens, not colors
        }
        ```
    *   **Logic:** Move all `VimSimulator` wiring here. remove `StyleSheet` and `View` imports.

2.  **Refactor `VimEditor.tsx`:**
    *   Rename to `DefaultVimRenderer.tsx`.
    *   Consume `useHeadlessVim`.
    *   Render the state using the *current* layout (preserving existing behavior).

3.  **Update `VimScreen.tsx`:**
    *   Point it to the new `DefaultVimRenderer`.

## Phase 2: Decoupling the Terminal (Shell)

**Current Status:** `TerminalViewModel` manages generic App State (`activeView`) but hardcodes it to specific strings ('SHELL' | 'COMMS'). It also mixes Hint timers (UI logic) with State.

### Action Plan
1.  **Create `ViewStack` Logic:**
    *   Replace `activeView: string` with a `ViewStack` array.
    *   Allows stacking views (e.g., [Shell, Vim, Dialog]).

2.  **Refactor `useTerminalViewModel` -> `useHeadlessTerminal`:**
    *   **Output:**
        ```typescript
        interface TerminalState {
            output: BufferLine[];
            input: string;
            ghostText: string;
            views: ViewIdentifier[]; // ['shell', 'vim:file.txt']
            systemStatus: SystemStatus;
        }
        ```
    *   Remove `contextualHint` timer logic (move to a specialized `HintPresenter`).

## Phase 3: The Theme Engine (The "Universal Interface")

**Current Status:** `ThemeContext` serves a `ThemeDefinition` which is primarily colors. `ConsoleLayout` is hardcoded.

### Action Plan
1.  **Expand `ThemeDefinition`:**
    ```typescript
    interface ThemeDefinition {
        id: string;
        colors: ThemeColors;
        // The Magic: Components defined by the Theme
        components: {
            Layout: React.ComponentType<LayoutProps>;
            TextRenderer: React.ComponentType<TextProps>; // Handles Bamum/Xhosa
            WindowFrame: React.ComponentType<WindowProps>;
            Cursor: React.ComponentType<CursorProps>;
        }
    }
    ```

2.  **Create "Standard 80s" Theme:**
    *   Move `ConsoleLayout.tsx` into `src/frameworks-drivers/ui/themes/standard/`.
    *   Implement standard `TextRenderer` (using React Native `<Text>`).

3.  **Refactor `App.tsx` / `TerminalScreen.tsx`:**
    *   Instead of `<ConsoleLayout>`, use:
        ```typescript
        const { theme } = useTheme();
        const Layout = theme.components.Layout;
        return <Layout ... />;
        ```

## Phase 4: Implementation Steps & Verification

1.  **Step 1:** Create `src/interface-adapters/viewmodels/useHeadlessVim.ts`.
2.  **Step 2:** Update `VimEditor.tsx` to use it. Verify "Vim" still works.
3.  **Step 3:** Create `src/domain/entities/ThemeComponents.ts` (Interface definitions).
4.  **Step 4:** Update `ThemeContext` to load component maps.

## Success Criteria
*   `useHeadlessVim` contains **ZERO** React Native imports (View, Text).
*   `TerminalViewModel` does not hardcode 'SHELL'/'COMMS'.
*   The Application runs exactly as before, but the structure is malleable.
