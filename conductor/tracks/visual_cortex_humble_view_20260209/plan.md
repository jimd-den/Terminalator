# VisualCortex & Humble View Implementation Plan

## Phase 1: Infrastructure & Core Logic
- [x] Task: Install Dependencies (`zustand`, `react-native-reanimated`) and configure `babel.config.js`. [33254c4]
- [x] Task: Create `VisualPriority` Enum definition. [eb4af5c]
- [x] Task: TDD `useVisualDirector` store (Zustand). [5530c95]
    - [ ] Create test: `tests/VisualDirector.test.ts` (Verify priority rules, locking, and lag reporting).
    - [ ] Implement: `src/interface-adapters/ui/VisualCortex/useVisualDirector.ts`.
- [x] Task: TDD `PerformanceMonitor` Service. [1dbc53d]
    - [ ] Create test: `tests/PerformanceMonitor.test.ts`.
    - [ ] Implement: `src/frameworks-drivers/ui/VisualCortex/PerformanceMonitor.ts` (Frame rate tracking).
- [ ] Task: Conductor - User Manual Verification 'Infrastructure & Core Logic' (Protocol in workflow.md).

## Phase 2: Humble View - Tutor Refactor
- [ ] Task: Create `TutorPresenter` to decouple logic from view.
    - [ ] Create test: `tests/TutorPresenter.test.ts` (Verify throttling/debouncing).
    - [ ] Implement: `src/interface-adapters/presenters/TutorPresenter.ts`.
- [ ] Task: Refactor `TutorOverlay` to use `react-native-reanimated`.
    - [ ] Write failing test/verification script for re-render counts.
    - [ ] Replace `useState`/`useEffect` animation logic with `SharedValue` and `useAnimatedStyle`.
- [ ] Task: Wire `TutorOverlay` to `useVisualDirector`.
    - [ ] Add logic to request `VisualPriority.FOCUS` before animating.
- [ ] Task: Conductor - User Manual Verification 'Humble View - Tutor Refactor' (Protocol in workflow.md).

## Phase 3: Humble View - Rhythm & Theatrics
- [ ] Task: Refactor `RhythmHUD` to use `react-native-reanimated`.
    - [ ] Isolate "Theatrical" animations from React Render cycle.
    - [ ] Implement `SharedValue` drivers for visual beats.
- [ ] Task: Wire `RhythmHUD` and `GlyphSession` to `useVisualDirector`.
    - [ ] Request `VisualPriority.CONTENT`.
    - [ ] Implement "Co-existence" logic (Check FPS or Director permission).
- [ ] Task: Conductor - User Manual Verification 'Humble View - Rhythm & Theatrics' (Protocol in workflow.md).

## Phase 4: The Circuit Breaker & Integration
- [ ] Task: Connect `PerformanceMonitor` to `VisualDirector`.
    - [ ] Trigger `reportLag()` when FPS drops below threshold (e.g., 30fps for 1s).
- [ ] Task: Implement Global "Reduced Motion" switch.
    - [ ] Ensure all "Humble Views" respect the `reducedMotion` flag from the Director.
- [ ] Task: Conductor - User Manual Verification 'The Circuit Breaker & Integration' (Protocol in workflow.md).
