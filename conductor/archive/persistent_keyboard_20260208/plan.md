# Implementation Plan - Persistent Keyboard & Settings Refactor

## Phase 1: Domain & Persistence Updates [checkpoint: aa9b92b]
- [x] Task: Add `forceKeyboardOpen` to `Settings` entity [2a60a20]
    - [x] Update `src/domain/entities/Settings.ts` interface and default values.
- [x] Task: Update `SettingsRepository` for new field [ff21405]
    - [x] Update `src/interface-adapters/DiskSettingsRepository.ts` to handle the new field in read/write operations.
- [x] Task: Create specific test for Settings persistence [ff21405]
    - [x] Create `tests/settings_persistence_test.ts` to verify the boolean flag is saved and loaded correctly.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Domain & Persistence Updates' (Protocol in workflow.md)

## Phase 2: Global Keyboard Management
- [x] Task: Implement Keyboard Management Logic [b143c71]
    - [x] Create a `KeyboardManager` component/hook that listens to the `Settings` state.
    - [x] Implement the `force_stay_open` logic (prevent dismissal, auto-refocus).
    - [x] Integrate this manager into the root `App.tsx` or main layout to ensure global coverage.
- [x] Task: Verify Keyboard Persistence [N/A]
    - [x] Manual verification required (hard to unit test keyboard visibility in node).
    - [x] Create a small script `scripts/verify_keyboard_settings.ts` to check if the app state reflects the setting correctly.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Global Keyboard Management' (Protocol in workflow.md)

## Phase 3: Settings Screen UI Refactor [63ba40b]
- [x] Task: Create `SettingsPane` component (CommsPane style) [63ba40b]
    - [x] Create `src/frameworks-drivers/ui/components/SettingsPane.tsx`.
    - [x] Implement "Frequency" style tabs for categories (Visual, Type, System).
    - [x] Implement compact option blocks.
- [x] Task: Integrate `SettingsPane` into `SettingsScreen` [63ba40b]
    - [x] Replace existing `SettingsScreen` content with `SettingsPane`.
    - [x] Ensure `ConsoleLayout` is used correctly to wrap the new pane.
- [x] Task: Implement Adaptive Layout for Keyboard [63ba40b]
    - [x] Add `KeyboardAvoidingView` or dimension listeners to `SettingsScreen`.
    - [x] Style the container to resize dynamically when the keyboard is up (Compact Mode).
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Settings Screen UI Refactor' (Protocol in workflow.md)

## Phase 4: Final Integration & Polish [b5f2b3e]
- [x] Task: Connect "Force Keyboard" Toggle [b5f2b3e]
    - [x] Ensure the UI toggle in `SettingsPane` correctly calls the repository update.
    - [x] Verify the system reacts immediately to the toggle change.
- [x] Task: Visual Consistency Audit [b5f2b3e]
    - [x] Match fonts, borders, and colors exactly to `CommsPane`.
    - [x] Ensure the "Return to Shell" button is always accessible.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Integration & Polish' (Protocol in workflow.md)
