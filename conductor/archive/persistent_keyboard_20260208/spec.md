# Specification: Persistent Mobile Keyboard & Settings Refactor

## 1. Overview
This track addresses issues with keyboard focus and screen layout on mobile devices. It involves refactoring the `SettingsScreen` to follow the high-density visual style of the `CommsPane` ("CommTab"), ensuring the layout remains functional even when the mobile keyboard is visible, and implementing a system-wide "Always On" keyboard policy controlled via a persistent setting.

## 2. Functional Requirements
### 2.1 Persistent Keyboard ("Always On")
- Implement a global mechanism to keep the mobile keyboard open across all screens (Shell, Settings, Comms).
- The keyboard should not dismiss on screen transitions or user interaction with non-input elements.
- The user should not be able to manually close the keyboard when this mode is active.

### 2.2 Settings Refactor
- Refactor `SettingsScreen` to use the `CommsPane` layout style:
    - High-density information display.
    - Compact headers and reduced padding.
    - "Frequency/Channel" style tabs for navigating setting categories (Visual, Typography, System).
- Integrate a new setting: `Force Keyboard On` (Toggle).
- Ensure the Settings UI fits entirely above the keyboard area when it is active, using a compact mode if necessary.

### 2.3 Clean Architecture Integration
- **Domain Layer:** Add `forceKeyboardOpen: boolean` to the `Settings` entity.
- **Interface Adapters:** Update `SettingsRepository` to persist this new field.
- **Framework Layer:** Implement a global keyboard management strategy (e.g., in `App.tsx` or a dedicated `InputProvider`) that reacts to the domain setting.

## 3. Visual & UX Design
- **High-Density UI:** Mimic the `CommsPane`'s use of 1px borders, small font sizes for labels (IDX-001 style), and compact action blocks.
- **Adaptive Layout:** Use `KeyboardAvoidingView` or custom height calculations to ensure the "Return to Shell" button and active settings are always visible above the keyboard.

## 4. Acceptance Criteria
- [ ] Keyboard remains visible when switching from Shell to Settings.
- [ ] Keyboard remains visible when switching from Settings to Comms.
- [ ] `SettingsScreen` layout does not have hidden content obscured by the keyboard.
- [ ] `SettingsScreen` visual style matches `CommsPane` (Freq tabs, compact blocks).
- [ ] Toggling "Force Keyboard On" to `OFF` reverts to standard OS keyboard behavior.
- [ ] Setting is persisted across app restarts.

## 5. Out of Scope
- Implementing custom third-party keyboard extensions.
- Modifying the Vim engine's internal input handling (this refactor focuses on the *presence* of the keyboard).
