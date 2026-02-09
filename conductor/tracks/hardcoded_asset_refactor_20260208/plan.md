# Implementation Plan - Hardcoded Asset Refactor

## Phase 1: Theme Entity Expansion [checkpoint: 5bab2d4]
- [x] Task: Update `ThemeColors` Interface [bbc687d]
    - [x] Modify `src/domain/entities/Theme.ts` to include opacity keys: `primary_05`, `primary_10`, `primary_20`, `error_15`, `error_20`, `background_80`, `surface_50`.
- [x] Task: Update Theme Definitions [bbc687d]
    - [x] Update `THEMES` constant in `src/domain/entities/Theme.ts` to populate these new keys for Matrix, Amber, Nord, and Dracula themes.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Theme Entity Expansion' (Protocol in workflow.md)

## Phase 2: Component Refactor - Core UI [fa5ba88]
- [x] Task: Refactor Basic UI Components [fa5ba88]
    - [x] Update `src/frameworks-drivers/ui/components/InputBar.tsx` (Colors).
    - [x] Update `src/frameworks-drivers/ui/components/Cursor.tsx` (Colors).
    - [x] Update `src/frameworks-drivers/ui/components/TutorBar.tsx` (Colors).
    - [x] Update `src/frameworks-drivers/ui/components/ConsoleLayout.tsx` (Colors & Fonts).
- [x] Task: Refactor "Theatrical" Components [fa5ba88]
    - [x] Update `src/frameworks-drivers/ui/components/theatrical/RhythmHUD.tsx` (Backgrounds, Borders).
    - [x] Update `src/frameworks-drivers/ui/components/theatrical/ResultStackView.tsx`.
    - [x] Update `src/frameworks-drivers/ui/components/theatrical/TutorOverlay.tsx`.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Component Refactor - Core UI' (Protocol in workflow.md)

## Phase 3: Component Refactor - Complex Views
- [ ] Task: Refactor Vim & Terminal Views
    - [ ] Update `src/frameworks-drivers/ui/components/vim/VimEditor.tsx` (Syntax Highlighting placeholder colors).
    - [ ] Update `src/frameworks-drivers/ui/components/OutputContainer.tsx` (Press states).
    - [ ] Update `src/frameworks-drivers/ui/screens/BufferScreen.tsx`.
- [ ] Task: Refactor Mainframe & Screens
    - [ ] Update `src/frameworks-drivers/ui/components/MainframeOverlay.tsx`.
    - [ ] Update `src/frameworks-drivers/ui/screens/SettingsScreen.tsx` (if any residual hardcodes).
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Component Refactor - Complex Views' (Protocol in workflow.md)

## Phase 4: Final Sweep & Font Standardization
- [ ] Task: Global Font Replacement
    - [ ] Search for any remaining `'SpaceMono_400Regular'` and replace with `settings.fontFamily`.
    - [ ] Search for `'#00FF41'` and other raw hexes to ensure 100% coverage.
- [ ] Task: Verify Theme Switching
    - [ ] Manual verification to ensure all new dynamic colors render correctly.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Sweep & Font Standardization' (Protocol in workflow.md)
