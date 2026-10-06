# VisualCortex & Humble View Architecture Specification

## 1. Overview
This track addresses the critical mobile stability issues (crashes, OOM, ANR) caused by "Bridge Overload" and "Resource Contention" in the `Terminalator` application. The high-frequency updates from the `RhythmHUD`, `Tutor`, and `VimEditor` are flooding the React Native bridge, causing main thread contention.

The solution is a two-pronged architectural refactor:
1.  **VisualCortex (The Mediator):** A central "Director" service in the Presentation Layer that manages UI resource contention using a priority system ("Juice Management").
2.  **Humble View Pattern:** Decoupling high-frequency Domain ticks from React state updates by utilizing `react-native-reanimated`'s `SharedValue` and direct Native Thread driver.

## 2. Functional Requirements

### 2.1 The Visual Cortex (Mediator)
-   **Priority System:** Define a `VisualPriority` enum to categorize UI intent:
    -   `CRITICAL` (System errors)
    -   `FOCUS` (Tutor feedback, Modals)
    -   `CONTENT` (Glyph Sessions, Text typing)
    -   `AMBIENT` (Background particles)
-   **The Director:** Implement a `useVisualDirector` hook (backed by a lightweight store, e.g., Zustand) that acts as the "Traffic Cop."
    -   Components must *request* focus before animating.
    -   The Director grants or denies permission based on current `focusOwner` and `priority`.
-   **Co-existence Strategy:** Implement a logic rule where `FOCUS` (Tutor) and `CONTENT` (Glyph Sessions) can animate simultaneously *only if* the performance budget allows (e.g., FPS > 55). If performance drops, lower priority animations are terminated.

### 2.2 Performance Monitor
-   Implement a system to monitor frame rates (`requestAnimationFrame` loop or `reanimated` callback).
-   **Circuit Breaker:** If FPS drops consistently below a threshold (e.g., 30fps for 1 second), trigger a global `reportLag()` event.
-   **Lag Response:** The `VisualDirector` enters a `reducedMotion` state, automatically suppressing all `AMBIENT` and non-essential `CONTENT` animations.

### 2.3 Humble View Implementation
-   **Refactor Targets:**
    -   `RhythmHUD` (Theatrical Animations)
    -   `TutorOverlay`
    -   `GlyphSession` visualization
-   **Implementation:** Replace `useState` / `useEffect` driven animations with `react-native-reanimated` `SharedValues`.
-   **Bridge Throttling:** Ensure Domain events (ticks) update the `SharedValue` directly (via Worklets where possible) without triggering a React Tree reconciliation/render.

## 3. Technical Constraints
-   **Library:** `react-native-reanimated` MUST be used for all new "Humble" animations.
-   **Exclusions:** Scanlines and CRT shaders are explicitly excluded from this system (as per user directive).
-   **Platform:** Solution must work identically on Web and Mobile (Android/iOS), respecting the "write once" nature of React Native but optimizing for the native bridge.

## 4. Acceptance Criteria
-   **AC1:** `VisualDirector` exists and successfully gates conflicting animations based on priority.
-   **AC2:** `RhythmHUD` and `Tutor` animations no longer trigger React re-renders on every frame/tick.
-   **AC3:** Simulating a "Heavy Load" (FPS drop) automatically disables lower-priority animations (The "Circuit Breaker").
-   **AC4:** Application does not crash on Android during intense "Tutor + Rhythm" sessions.
