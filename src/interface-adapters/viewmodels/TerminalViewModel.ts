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

import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FileSystem } from '../../domain/entities/FileSystem';
import { ExecuteCommand, CommandResponse } from '../../domain/usecases/ExecuteCommand';
import { GameManager } from '../GameManager';
import { createInitialTerminalState, TerminalState } from '../../domain/entities/TerminalState';

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

    // -- State --
    const [activeApp, setActiveApp] = useState<ActiveApp>({ type: 'SHELL' });
    const [state, setState] = useState<TerminalState>(createInitialTerminalState());
    const [input, setInput] = useState('');
    const [outputLines, setOutputLines] = useState<TerminalOutputLine[]>([
        { text: 'SYSTEM INITIALIZED... BOOT SEQUENCE READY', type: 'output' },
        { text: 'WELCOME TO MAINFRAME v1.0', type: 'output' },
        { text: 'TYPE "mail" TO CHECK TRANSMISSIONS', type: 'output' },
    ]);
    const [ghostText, setGhostText] = useState('');
    const [isTransitioning, setIsTransitioning] = useState(false);

    // -- Logic --

    const suggestions = ['help', 'ls', 'cd', 'cat', 'whoami', 'mail', 'check-comms', 'clear', 'vim', 'man', 'grep'];

    const getAutocompleteSuggestion = useCallback((inputText: string): string => {
        if (!inputText) return '';
        const parts = inputText.split(' ');
        const cmd = parts[0];

        // 1. Command Autocomplete
        if (parts.length === 1) {
            const match = suggestions.find(s => s.startsWith(inputText.toLowerCase()) && s !== inputText.toLowerCase());
            return match ? match.substring(inputText.length) : '';
        }

        // 2. File Autocomplete
        let lookingForFile = false;
        let partialName = '';

        if (['cd', 'cat', 'vim', 'ls'].includes(cmd) && parts.length === 2) {
            lookingForFile = true;
            partialName = parts[1];
        } else if (cmd === 'grep' && parts.length === 3) {
            lookingForFile = true;
            partialName = parts[2];
        }

        if (lookingForFile) {
            const targetDir = state.currentDirectory;
            const node = fs.getNode(targetDir);

            if (node && fs.isDirectory(node)) {
                const files = Array.from(node.children.keys());
                const match = files.find(f => f.startsWith(partialName) && f !== partialName);
                return match ? match.substring(partialName.length) : '';
            }
        }
        return '';
    }, [fs, state.currentDirectory]);

    const handleInputChange = useCallback((text: string) => {
        setInput(text);
        setGhostText(getAutocompleteSuggestion(text));
    }, [getAutocompleteSuggestion]);

    const handleCommand = useCallback(async () => {
        const cmdToRun = input;
        if (!cmdToRun) return;

        // Execute via Domain Logic
        const response: CommandResponse = await commandExecutor.execute(input, state);
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
                { text: `> ${input}`, type: 'input', exitCode } as const
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
        if (outputLines.length > 5 && outputLines.length % 4 === 0) {
            const mail = gameManager.spawnNPCEvent();
            setOutputLines(prev => [...prev, { text: `[ NEW TRANSMISSION: ID ${mail.id} FROM ${mail.from} ]`, type: 'output' }]);
        }
    }, [input, state, commandExecutor, navigation, gameManager, outputLines.length]);

    const handleKeyPress = useCallback((key: string) => {
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
            // Filter out control characters if any permeate through
            if (key.length === 1) {
                setInput(prev => {
                    const next = prev + key;
                    setGhostText(getAutocompleteSuggestion(next));
                    return next;
                });
            }
        }
    }, [input, ghostText, getAutocompleteSuggestion, handleCommand]);

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
        outputLines,
        ghostText,
        isTransitioning,
        handleInputChange,
        handleKeyPress,
        handleCommand,
        handleVimExit
    };
};
