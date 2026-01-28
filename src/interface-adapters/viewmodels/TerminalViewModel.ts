/**
 * TerminalViewModel - Interface Adapter Layer
 *
 * Manages the state and logic for the Terminal Screen.
 * Implements the "Humble Object" pattern by stripping all logic from the View.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (Passive View)
 *
 * Intent:
 * Decouples the UI (TerminalScreen) from the Business Logic (CommandExecutor).
 * Composes InputController, OutputController, and TutorController for clean separation.
 *
 * Design Pattern: Composite Controller
 * This ViewModel orchestrates three focused controllers:
 * - InputController: Input state and autocomplete
 * - OutputController: Output buffer management
 * - TutorController: Tutor engine events and state
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { FileSystem } from '../../domain/entities/FileSystem';
import { FileSystemService } from '../../domain/services/FileSystemService';
import { ExecuteCommand, CommandResponse } from '../../domain/usecases/ExecuteCommand';
import { GameManager } from '../GameManager';
import { createInitialTerminalState, TerminalState } from '../../domain/entities/TerminalState';
import { AutocompleteService } from '../../domain/services/AutocompleteService';
import { GameEventObserver } from '../../domain/services/GameEventObserver';
import { Lesson } from '../../domain/entities/TutorEngine';

// Import Controllers
import { useInputController } from '../controllers/InputController';
import { useOutputController, TerminalOutputLine } from '../controllers/OutputController';
import { useTutorController, TutorControllerCallbacks, createTutorActiveChecker } from '../controllers/TutorController';

export type ActiveApp = { type: 'SHELL' } | { type: 'VIM', filename: string };

// Re-export for backward compatibility
export { TerminalOutputLine } from '../controllers/OutputController';

export const useTerminalViewModel = (
    fs: FileSystem,
    commandExecutor: ExecuteCommand,
    gameManager: GameManager
) => {
    const navigation = useNavigation();

    // -- Services --
    const autocompleteService = useMemo(() => {
        return new AutocompleteService(new FileSystemService(fs));
    }, [fs]);

    const gameObserver = useMemo(() => {
        return new GameEventObserver(gameManager);
    }, [gameManager]);

    // -- Core State --
    const [activeApp, setActiveApp] = useState<ActiveApp>({ type: 'SHELL' });
    const [state, setState] = useState<TerminalState>(createInitialTerminalState());
    const [isTransitioning, setIsTransitioning] = useState(false);

    // -- Input Controller --
    const isTutorActive = useCallback(() => {
        return gameManager.tutorEngine.isActive();
    }, [gameManager]);

    const inputController = useInputController(
        autocompleteService,
        state.currentDirectory,
        isTutorActive
    );

    // -- Output Controller --
    const outputController = useOutputController();

    // -- Command Execution Ref (for TutorController callback) --
    const handleCommandRef = useRef<((cmd?: string) => Promise<void>) | null>(null);

    // -- Tutor Controller Callbacks --
    const tutorCallbacks: TutorControllerCallbacks = useMemo(() => ({
        onStart: (lesson: Lesson, targetCwd: string) => {
            setState(prev => ({ ...prev, currentDirectory: targetCwd }));
            outputController.appendSystemMessage(`[ SYSTEM ] RELOCATING TO TRAINING ENVIRONMENT: ${targetCwd}...`);
        },
        onStop: (originalCwd: string | null) => {
            if (originalCwd) {
                setState(prev => ({ ...prev, currentDirectory: originalCwd }));
                outputController.appendSystemMessage(`[ SYSTEM ] TRAINING HALTED. RESTORING CONTEXT: ${originalCwd}`);
            }
        },
        onProgress: (input: string, ghostText: string) => {
            inputController.setInput(input);
            inputController.updateGhostText(ghostText);
        },
        onCorrection: (input: string, ghostText: string) => {
            inputController.setInput(input);
            inputController.updateGhostText(ghostText);
        },
        onMistake: (input: string, ghostText: string, _droppedCount: number) => {
            inputController.setInput(input);
            inputController.updateGhostText(ghostText);
        },
        onComplete: (lesson: Lesson, originalCwd: string | null) => {
            inputController.setInput(lesson.text);
            inputController.updateGhostText('');

            // Execute the completed command
            if (handleCommandRef.current) {
                handleCommandRef.current(lesson.text);
            }

            // Restore context
            if (originalCwd) {
                setTimeout(() => {
                    setState(prev => ({ ...prev, currentDirectory: originalCwd }));
                    outputController.appendSystemMessage(`[ SYSTEM ] MISSION ACCOMPLISHED. RETURN TO BASE: ${originalCwd}`);
                }, 1000);
            }
        }
    }), [inputController, outputController]);

    // -- Tutor Controller --
    const tutorController = useTutorController(
        gameManager.tutorEngine,
        tutorCallbacks,
        state.currentDirectory
    );

    // -- Command Execution --
    const handleCommand = useCallback(async (manualCommand?: string) => {
        const cmdToRun = manualCommand !== undefined ? manualCommand : inputController.input;
        if (!cmdToRun) return;

        // Special Command: exit
        if (cmdToRun === 'exit') {
            gameManager.tutorEngine.stop();
            outputController.clear();
            inputController.clearInput();
            return;
        }

        // Special Command: train
        if (cmdToRun === 'train') {
            const lesson = gameManager.startRandomLesson();
            outputController.appendInput(cmdToRun);
            outputController.appendSystemMessage(`[ SYSTEM ] LOADING SIMULATION: ${lesson.id}`);
            outputController.appendSystemMessage(`[ MISSION ] ${lesson.instructions}`);
            inputController.clearInput();
            return;
        }

        // Execute via Domain Logic
        const response: CommandResponse = await commandExecutor.execute(cmdToRun, state);
        const { output: cmdOutput, newState, navigationAction, uiAction, exitCode } = response;

        // Handle UI Actions
        if (uiAction === 'CLEAR') {
            outputController.clear();
            if (newState) setState(prev => ({ ...prev, ...newState }));
            inputController.clearInput();
            return;
        }

        // Handle Navigation
        if (navigationAction && navigationAction.type === 'NAVIGATE') {
            if (navigationAction.target === 'Editor') {
                setIsTransitioning(true);
                setTimeout(() => {
                    setActiveApp({ type: 'VIM', filename: navigationAction.params.filename });
                    setTimeout(() => setIsTransitioning(false), 300);
                }, 100);
                return;
            }
            (navigation.navigate as any)(navigationAction.target, navigationAction.params);
            return;
        }

        // Update Shell Output
        outputController.appendInput(cmdToRun, exitCode);
        if (cmdOutput) {
            outputController.appendOutput(cmdOutput);
        }

        if (newState) setState(prev => ({ ...prev, ...newState }));
        inputController.clearInput();

        // Simulate random procedural events (Game Logic)
        const eventMsg = gameObserver.checkProceduralEvents(outputController.getLineCount());
        if (eventMsg) {
            outputController.appendSystemMessage(eventMsg);
        }
    }, [inputController, outputController, state, commandExecutor, navigation, gameManager, gameObserver]);

    // Update ref for TutorController callback
    useEffect(() => {
        handleCommandRef.current = handleCommand;
    }, [handleCommand]);

    // -- Key Press Handler --
    const handleKeyPress = useCallback((key: string) => {
        // 1. TUTOR INTERCEPTION
        if (gameManager.tutorEngine.isActive()) {
            const lesson = gameManager.tutorEngine.getCurrentLesson();
            if (lesson && lesson.type === 'SHELL') {
                if (key.length === 1) {
                    gameManager.tutorEngine.handleInput(key);
                    return;
                }
                if (key === 'ENTER') {
                    return;
                }
            }
        }

        // 2. STANDARD SHELL LOGIC
        if (key === 'TAB') {
            inputController.acceptAutocomplete();
        } else if (key === 'ESC') {
            inputController.clearInput();
        } else if (key === 'BACKSPACE') {
            inputController.deleteChar();
        } else if (key === 'ENTER') {
            handleCommand();
        } else if (key.length === 1) {
            inputController.appendChar(key);
        }
    }, [inputController, handleCommand, gameManager]);

    // -- Input Change Handler --
    const handleInputChange = useCallback((text: string) => {
        inputController.setInput(text);
    }, [inputController]);

    // -- VIM Exit Handler --
    const handleVimExit = useCallback(() => {
        setIsTransitioning(true);
        setTimeout(() => {
            setActiveApp({ type: 'SHELL' });
            setTimeout(() => setIsTransitioning(false), 300);
        }, 100);
    }, []);

    return {
        // App State
        activeApp,
        state,
        isTransitioning,

        // Input State (from InputController)
        input: inputController.input,
        ghostText: inputController.ghostText,

        // Output State (from OutputController)
        outputLines: outputController.outputLines,

        // Tutor State (from TutorController)
        tutorEmotion: tutorController.emotion,
        crashingIndices: tutorController.crashingIndices,

        // Handlers
        handleInputChange,
        handleKeyPress,
        handleCommand,
        handleVimExit
    };
};
