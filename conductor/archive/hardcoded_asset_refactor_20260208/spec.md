# Specification: Hardcoded Asset Refactor (Theme & Font Purity)

## 1. Overview
The current codebase contains 180+ instances of hardcoded hex colors, RGBA strings, and font family names. This track will eliminate these hardcoded values, ensuring that the entire application—including theatrical HUDs and specialized components—fully respects the user's selected Theme and Font settings.

## 2. Functional Requirements
### 2.1 Expanded Theme Palette
- Update the `ThemeColors` interface in `src/domain/entities/Theme.ts` to include common opacity variants and semantic highlights found in the codebase.
- Proposed additions:
    - `primary_05`, `primary_10`, `primary_20` (5%, 10%, 20% opacity variants).
    - `error_15`, `error_20`.
    - `background_80` (High-opacity overlay).
    - `surface_50`.

### 2.2 Global Theme Compliance
- Replace all hardcoded hex codes (e.g., `#00FF41`) and RGBA strings (e.g., `rgba(0, 255, 65, 0.1)`) with references from `theme.colors`.
- Theatrical components (`RhythmHUD`, `TheatricalCanvas`, `TutorOverlay`) must be refactored to use dynamic theme colors.

### 2.3 Universal Font Application
- Replace all hardcoded `fontFamily` strings (e.g., `'SpaceMono_400Regular'`) with `settings.fontFamily`.
- Ensure that the font choice propagates to all UI labels, terminal text, and HUD elements.

### 2.4 Cleanup
- Remove any unused style constants that contain hardcoded values once they are no longer referenced.

## 3. Architectural Impact
- **Entities:** Modify `Theme.ts` to expand the `ThemeColors` interface and update all existing theme definitions (Matrix, Amber, Nord, Dracula) with the new color variants.
- **Frameworks & Drivers:** Audit and modify all `.tsx` files in `src/frameworks-drivers/ui/` to consume the theme/settings context.

## 4. Acceptance Criteria
- [ ] No hardcoded hex colors or RGBA strings remain in the `src/frameworks-drivers/ui/` directory (excluding the Theme definitions themselves).
- [ ] No hardcoded `fontFamily` strings remain in the component tree.
- [ ] Switching themes in Settings immediately updates the entire app, including the Rhythm HUD and Tutor overlays.
- [ ] Switching fonts in Settings immediately updates all text in the app.
- [ ] New theme color keys (`primary_10`, etc.) are correctly implemented for all 4 default themes.

## 5. Out of Scope
- Refactoring non-visual hardcodes (e.g., logic constants, file paths).
- Adding new themes (only updating existing ones).
