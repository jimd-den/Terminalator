/**
 * OutputController - Interface Adapter Layer
 *
 * Manages terminal output buffer and line rendering.
 * Decouples output management from the TerminalViewModel.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (Single Responsibility)
 *
 * Intent:
 * Manages output lines, system messages, and buffer operations.
 * Provides a clean API for appending different types of output.
 */

import { useState, useCallback } from 'react';

/**
 * TerminalOutputLine - Represents a single line in the terminal output.
 *
 * Types:
 * - 'input': User command (prefixed with '>')
 * - 'output': Command output
 * - 'system': System/game messages (styled differently)
 */
export interface TerminalOutputLine {
    text: string;
    type: 'input' | 'output' | 'system';
    exitCode?: number;
    timestamp?: number;
}

export interface OutputControllerState {
    outputLines: TerminalOutputLine[];
}

export interface OutputControllerActions {
    appendInput: (command: string, exitCode?: number) => void;
    appendOutput: (text: string) => void;
    appendSystemMessage: (text: string) => void;
    appendLine: (line: TerminalOutputLine) => void;
    clear: () => void;
    getLineCount: () => number;
}

/**
 * Default welcome messages displayed on terminal start.
 */
const INITIAL_OUTPUT: TerminalOutputLine[] = [
    { text: 'SYSTEM INITIALIZED... BOOT SEQUENCE READY', type: 'system', timestamp: Date.now() },
    { text: 'WELCOME TO MAINFRAME v1.0', type: 'system', timestamp: Date.now() },
    { text: 'TYPE "mail" TO CHECK TRANSMISSIONS', type: 'system', timestamp: Date.now() },
];

/**
 * useOutputController - React Hook
 *
 * Provides output state and actions for terminal output management.
 */
export const useOutputController = (): OutputControllerState & OutputControllerActions => {
    const [outputLines, setOutputLines] = useState<TerminalOutputLine[]>(INITIAL_OUTPUT);

    /**
     * Appends a user input line (command).
     * Displayed with '>' prefix in the terminal.
     */
    const appendInput = useCallback((command: string, exitCode?: number) => {
        setOutputLines(prev => [
            ...prev,
            {
                text: `> ${command}`,
                type: 'input',
                exitCode,
                timestamp: Date.now()
            }
        ]);
    }, []);

    /**
     * Appends command output.
     */
    const appendOutput = useCallback((text: string) => {
        if (!text) return;
        setOutputLines(prev => [
            ...prev,
            {
                text,
                type: 'output',
                timestamp: Date.now()
            }
        ]);
    }, []);

    /**
     * Appends a system message (styled differently).
     * Used for game events, notifications, tutor messages.
     */
    const appendSystemMessage = useCallback((text: string) => {
        setOutputLines(prev => [
            ...prev,
            {
                text,
                type: 'system',
                timestamp: Date.now()
            }
        ]);
    }, []);

    /**
     * Appends a raw line (for backward compatibility or custom lines).
     */
    const appendLine = useCallback((line: TerminalOutputLine) => {
        setOutputLines(prev => [...prev, { ...line, timestamp: line.timestamp || Date.now() }]);
    }, []);

    /**
     * Clears all output lines.
     */
    const clear = useCallback(() => {
        setOutputLines([]);
    }, []);

    /**
     * Returns current line count (useful for game events).
     */
    const getLineCount = useCallback(() => {
        return outputLines.length;
    }, [outputLines.length]);

    return {
        outputLines,
        appendInput,
        appendOutput,
        appendSystemMessage,
        appendLine,
        clear,
        getLineCount
    };
};
