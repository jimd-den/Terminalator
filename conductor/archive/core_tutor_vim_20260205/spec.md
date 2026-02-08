# Specification: Core Tutor-Integrated Vim Interface & IRC-Style Interaction

## Overview
This track focuses on solidifying the user interface and interaction model for Terminalator. It involves refactoring the existing `VimEngine` to strictly adhere to Clean Architecture, creating a robust "IRC tab-like" modal interaction for text input, and integrating the Tutor as a persistent presence. The goal is to seamlessly blend the "game" (typing/learning) with the "system" (Vim/Shell) while ensuring the user can easily navigate between missions and the main dashboard.

## Core Features

### 1. Refactored VimEngine (Clean Architecture)
- **Goal:** Ensure `VimEngine` is a pure Entity or Use Case that is completely decoupled from the UI.
- **Requirement:** It must support modal editing (Normal, Insert, Visual) and be robust enough to handle the "Subliminal Mastery" assembly typing game.
- **Design:** "IRC Tab" style behavior. The Vim interface should feel like a dedicated channel or tab that the user focuses on, distinct from the global system chat.

### 2. Persistent Tutor Bar (IRC Style)
- **Goal:** Allow the Tutor to communicate with the user outside of active missions.
- **Requirement:** A small, persistent bar located just above the virtual keyboard (or bottom of screen).
- **Behavior:**
  - Displays messages from the Tutor (tips, lore, "cute" threats).
  - Acts as a "system status" ticker.
  - Maintains the "Cold Kawaii" aesthetic.

### 3. Mission Navigation
- **Goal:** Allow users to safely abort or exit a mission.
- **Requirement:** A dedicated "Exit Mission" button/command that cleanly saves state (if applicable) and returns the user to the Main Screen/Dashboard.

### 4. Integration
- The Vim interface must host the Assembly Typing Game.
- The Tutor Bar must react to events within the Vim interface (e.g., offering encouragement on successful compiles, or "comfort" on syntax errors).

## Technical Constraints
- **Architecture:** Must follow the defined Clean Architecture layers (Entities, Use Cases, Interface Adapters, Frameworks).
- **Testing:** All components must be TDD'd.
- **Styling:** React Native / Expo. Must match the `product-guidelines.md` (Cold Kawaii, "Beautiful Raw").

## User Stories
- As a user, I want to type assembly code in a Vim-like interface that feels responsive and robust.
- As a user, I want to see messages from the Tutor in a dedicated bar while I am navigating the main menu.
- As a user, I want to be able to exit a mission easily if I get stuck or want to take a break.
