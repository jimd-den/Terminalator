# SIMPLE PLAN: Terminalator Typing Trainer

## Objective
Create a straightforward, engaging typing practice experience within the terminal. No complex RPG logic yet—just "Train and Improve."

## 1. The Interaction Loop
1. **Command**: User types `train`.
2. **Action**: A random lesson from the existing `CURRICULUM` starts.
3. **Completion**: Once finished, the terminal displays:
   - WPM (Words Per Minute)
   - Accuracy (%)
   - Mistakes (Count)

## 2. Technical Steps (Planning Only)
- [ ] **Command Registration**: Add a `train` alias to the existing `TutorCommand`.
- [ ] **Data Capture**: Ensure the `TutorEngine` tracks total mistakes and elapsed time across the entire lesson.
- [ ] **Result Reporting**: Design a clean "Lesson Summary" output for the terminal.
- [ ] **Stability**: Ensure the tutor doesn't block the shell if the user wants to `Ctrl-C` out.

## 3. Future Expansion (from /vision)
- Once the simple trainer is solid, we can pull in the 24XX dice for "High Stakes" training.
- Add "Pressure" mechanics (time limits).
