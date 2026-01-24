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
 * Handles input processing, autocomplete, state updates, and navigation routing.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { FileSystem } from '../../domain/entities/FileSystem';
import { FileSystemService } from '../../domain/services/FileSystemService';
import { ExecuteCommand, CommandResponse } from '../../domain/usecases/ExecuteCommand';
import { GameManager } from '../GameManager';
import { createInitialTerminalState, TerminalState } from '../../domain/entities/TerminalState';
import { TutorEvent, TutorEmotion } from '../../domain/entities/TutorEngine';
import { AutocompleteService } from '../../domain/services/AutocompleteService';
import { GameEventObserver } from '../../domain/services/GameEventObserver';

export type ActiveApp = { type: 'SHELL' } | { type: 'VIM', filename: string };

export interface TerminalOutputLine {
    text: string;
    type: 'input' | 'output';
    exitCode?: number;
}

export const useTerminalViewModel = (
    fs: FileSystem,
    commandExecutor: ExecuteCommand,
    gameManager: GameManager
) => {
    const navigation = useNavigation();

    // -- Services --
    const autocompleteService = React.useMemo(() => {
        return new AutocompleteService(new FileSystemService(fs));
    }, [fs]);

    const gameObserver = React.useMemo(() => {
        return new GameEventObserver(gameManager);
    }, [gameManager]);

    // -- State --
    const [activeApp, setActiveApp] = useState<ActiveApp>({ type: 'SHELL' });
    const [state, setState] = useState<TerminalState>(createInitialTerminalState());
    const [input, setInput] = useState('');
    const [tutorEmotion, setTutorEmotion] = useState<TutorEmotion>(TutorEmotion.NORMAL);
    const [crashingIndices, setCrashingIndices] = useState<number[]>([]);
    const [outputLines, setOutputLines] = useState<TerminalOutputLine[]>([
        { text: 'SYSTEM INITIALIZED... BOOT SEQUENCE READY', type: 'output' },
        { text: 'WELCOME TO MAINFRAME v1.0', type: 'output' },
        { text: 'TYPE "mail" TO CHECK TRANSMISSIONS', type: 'output' },
    ]);
    const [ghostText, setGhostText] = useState('');
    const [isTransitioning, setIsTransitioning] = useState(false);

    // State Refs for Event Handlers (avoid stale closures)
    const cwdRef = useRef(state.currentDirectory);
    const preTutorCwdRef = useRef<string | null>(null);
    const handleCommandRef = useRef<((cmd?: string) => Promise<void>) | null>(null);

    useEffect(() => {
        cwdRef.current = state.currentDirectory;
    }, [state.currentDirectory]);



    // -- Logic --
    // Tutor Engine Subscription
    useEffect(() => {
        const unsubscribe = gameManager.tutorEngine.subscribe((event: TutorEvent) => {
            const engine = gameManager.tutorEngine;

            if (event.type === 'START') {
                const lesson = event.payload;
                // Save context
                preTutorCwdRef.current = cwdRef.current;
                const targetCwd = lesson.cwd || '/home/operator';

                // Switch context
                setState(prev => ({ ...prev, currentDirectory: targetCwd }));
                setOutputLines(prev => [...prev, { text: `[ SYSTEM ] RELOCATING TO TRAINING ENVIRONMENT: ${targetCwd}...`, type: 'output' } as TerminalOutputLine]);

            } else if (event.type === 'STOP') {
                // Restore context
                const original = preTutorCwdRef.current;
                if (original) {
                    setState(prev => ({ ...prev, currentDirectory: original }));
                    preTutorCwdRef.current = null;
                    setOutputLines(prev => [...prev, { text: `[ SYSTEM ] TRAINING HALTED. RESTORING CONTEXT: ${original}`, type: 'output' } as TerminalOutputLine]);
                }

            } else if (event.type === 'EMOTION_CHANGE') {
                setTutorEmotion(event.payload);
            } else if (event.type === 'CORRECTION') {
                // Show the bad character briefly
                const completed = engine.getCompletedText();
                const badChar = event.payload.actual;
                setInput(completed + badChar);
                // Ghost text stays as is (from verified progress)
                setGhostText(engine.getGhostText());

                setTimeout(() => {
                    setInput(completed); // Snap back to correct state
                }, 200);
            } else if (event.type === 'PROGRESS') {
                setInput(engine.getCompletedText());
                setGhostText(engine.getGhostText());
            } else if (event.type === 'MISTAKE') {
                // Crash / Aggressive Backspace Animation
                const droppedCount = event.payload.dropped;
                const completed = engine.getCompletedText();
                const startIdx = completed.length;
                const endIdx = startIdx + droppedCount;

                const indices = [];
                for (let i = startIdx; i < endIdx; i++) {
                    indices.push(i);
                }
                setCrashingIndices(indices);

                // Delay state update to allow animation to play
                setTimeout(() => {
                    setInput(completed);
                    setGhostText(engine.getGhostText());
                    setCrashingIndices([]);
                }, 400);
            } else if (event.type === 'COMPLETE') {
                const lesson = event.payload;
                setInput(lesson.text);
                setGhostText('');

                if (handleCommandRef.current) {
                    handleCommandRef.current(lesson.text);
                }

                // Auto-restore context if needed
                const original = preTutorCwdRef.current;
                if (original) {
                    setTimeout(() => {
                        setState(prev => ({ ...prev, currentDirectory: original }));
                        preTutorCwdRef.current = null;
                        setOutputLines(prev => [...prev, { text: `[ SYSTEM ] MISSION ACCOMPLISHED. RETURN TO BASE: ${original}`, type: 'output' } as TerminalOutputLine]);
                    }, 1000);
                }
            }
        });

        return unsubscribe;
    }, [gameManager]);

    const getAutocompleteSuggestion = useCallback((inputText: string): string => {
        // If Tutor is Active, it controls ghostText via subscription (PROGRESS event).
        if (gameManager.tutorEngine.isActive()) {
            return '';
        }

        return autocompleteService.getSuggestion(inputText, state.currentDirectory);
    }, [autocompleteService, state.currentDirectory, gameManager]);

    const handleInputChange = useCallback((text: string) => {
        setInput(text);
        setGhostText(getAutocompleteSuggestion(text));
    }, [getAutocompleteSuggestion]);

    const handleCommand = useCallback(async (manualCommand?: string) => {
        const cmdToRun = manualCommand !== undefined ? manualCommand : input;
        if (!cmdToRun) return;

        // Special Command: exit
        if (cmdToRun === 'exit') {
            gameManager.tutorEngine.stop();
            setOutputLines([]);
            setInput('');
            setGhostText('');
            return;
        }

        // Special Command: train
        if (cmdToRun === 'train') {
            const lesson = gameManager.startRandomLesson();
            setOutputLines(prev => [
                ...prev,
                { text: `> ${cmdToRun}`, type: 'input' } as TerminalOutputLine,
                { text: `[ SYSTEM ] LOADING SIMULATION: ${lesson.id}`, type: 'output' } as TerminalOutputLine,
                { text: `[ MISSION ] ${lesson.instructions}`, type: 'output' } as TerminalOutputLine
            ]);
            setInput('');
            setGhostText('');
            return;
        }

        // Execute via Domain Logic
        const response: CommandResponse = await commandExecutor.execute(cmdToRun, state);
        const { output: cmdOutput, newState, navigationAction, uiAction, exitCode } = response;

        // Handle UI Actions
        if (uiAction === 'CLEAR') {
            setOutputLines([]);
            if (newState) setState(prev => ({ ...prev, ...newState }));
            setInput('');
            setGhostText('');
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
        setOutputLines(prev => {
            const nextLines = [
                ...prev,
                { text: `> ${cmdToRun}`, type: 'input', exitCode } as const
            ];

            if (cmdOutput) {
                nextLines.push({ text: cmdOutput, type: 'output' } as const);
            }

            return nextLines;
        });

        if (newState) setState(prev => ({ ...prev, ...newState }));
        setInput('');
        setGhostText('');

        // Simulate random procedural events (Game Logic)
        // Decoupled via GameEventObserver
        const eventMsg = gameObserver.checkProceduralEvents(outputLines.length);
        if (eventMsg) {
            setOutputLines(prev => [...prev, { text: eventMsg, type: 'output' } as TerminalOutputLine]);
        }
    }, [input, state, commandExecutor, navigation, gameManager, outputLines.length, gameObserver]);

    useEffect(() => {
        handleCommandRef.current = handleCommand;
    }, [handleCommand]);

    const handleKeyPress = useCallback((key: string) => {
        // -- 1. TUTOR INTERCEPTION --
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

        // -- 2. STANDARD SHELL LOGIC --
        if (key === 'TAB') {
            if (ghostText) {
                const fullCommand = input + ghostText;
                setInput(fullCommand);
                setGhostText('');
            }
        } else if (key === 'ESC') {
            setInput('');
            setGhostText('');
        } else if (key === 'BACKSPACE') {
            setInput(prev => {
                const next = prev.slice(0, -1);
                setGhostText(getAutocompleteSuggestion(next));
                return next;
            });
        } else if (key === 'ENTER') {
            handleCommand();
        } else {
            if (key.length === 1) {
                setInput(prev => {
                    const next = prev + key;
                    setGhostText(getAutocompleteSuggestion(next));
                    return next;
                });
            }
        }
    }, [input, ghostText, getAutocompleteSuggestion, handleCommand, gameManager]);

    const handleVimExit = useCallback(() => {
        setIsTransitioning(true);
        setTimeout(() => {
            setActiveApp({ type: 'SHELL' });
            setTimeout(() => setIsTransitioning(false), 300);
        }, 100);
    }, []);

    return {
        activeApp,
        state,
        input,
        tutorEmotion,
        crashingIndices,
        outputLines,
        ghostText,
        isTransitioning,
        handleInputChange,
        handleKeyPress,
        handleCommand,
        handleVimExit
    };
};
