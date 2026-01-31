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
    pending?: boolean;
    timestamp?: number;
    metadata?: {
        renderType?: 'ls-pretty' | 'system-alert' | 'fish-style';
        data?: any;
    };
}

export interface OutputControllerState {
    outputLines: TerminalOutputLine[];
    renderedLineCount: number;
}

export interface OutputControllerActions {
    appendInput: (command: string, exitCode?: number, pending?: boolean) => void;
    updateInputStatus: (index: number, exitCode: number, pending: boolean) => void;
    appendOutput: (text: string, metadata?: any) => void;
    appendSystemMessage: (text: string) => void;
    appendLine: (line: TerminalOutputLine) => void;
    clear: () => void;
    getLineCount: () => number;
    markLineComplete: () => void;
}

/**
 * Default welcome messages displayed on terminal start.
 */
const INITIAL_OUTPUT: TerminalOutputLine[] = [
    { text: 'MAINFRAME v1.0 CONNECTION ESTABLISHED', type: 'system', timestamp: Date.now() },
    { text: 'AWAITING COMMAND INPUT...', type: 'system', timestamp: Date.now() },
];

/**
 * useOutputController - React Hook
 *
 * Provides output state and actions for terminal output management.
 */
export const useOutputController = (): OutputControllerState & OutputControllerActions => {
    const [outputLines, setOutputLines] = useState<TerminalOutputLine[]>(INITIAL_OUTPUT);
    const [renderedLineCount, setRenderedLineCount] = useState(INITIAL_OUTPUT.length);
    // Start with 0 if we want to animate startup, or length if we want it instant.
    // User wants "Startup sequence", but initial lines might just be static?
    // Let's stick to 2 for now to match strict equality, or 0 to animate.
    // Actually, setting to 0 causes them to type out. Let's try 0.
    // Use effect to set to 0? No, just initial state.
    // Wait, if I set it to 0, they will animate.
    // Let's set it to INITIAL_OUTPUT.length so they appear instantly on refresh, 
    // but typically the app starts fresh. 
    // If I reload, I want to see them again?
    // Let's stick to INITIAL_OUTPUT.length for "instant startup" to avoid annoyance during dev,
    // or 0 for "cool startup".
    // I'll keep it at INITIAL_OUTPUT.length for stability (no phantom typing on HMR).

    /**
     * Appends a user input line (command).
     * Displayed with '>' prefix in the terminal.
     */
    const appendInput = useCallback((command: string, exitCode?: number, pending?: boolean) => {
        setOutputLines(prev => [
            ...prev,
            {
                text: `> ${command}`,
                type: 'input',
                exitCode,
                pending,
                timestamp: Date.now()
            }
        ]);
        // Input is instant, so we increment rendered count immediately so the NEXT line knows it can start.
        setRenderedLineCount(prev => prev + 1);
    }, []);

    const updateInputStatus = useCallback((index: number, exitCode: number, pending: boolean) => {
        setOutputLines(prev => {
            const next = [...prev];
            if (next[index] && next[index].type === 'input') {
                next[index] = { ...next[index], exitCode, pending };
            }
            return next;
        });
    }, []);

    /**
     * Appends command output.
     */
    const appendOutput = useCallback((text: string, metadata?: any) => {
        setOutputLines(prev => [
            ...prev,
            {
                text: text || '', // Allow empty for blank lines
                type: 'output',
                metadata,
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
        if (line.type === 'input') {
            setRenderedLineCount(prev => prev + 1);
        }
    }, []);

    /**
     * Clears all output lines.
     */
    const clear = useCallback(() => {
        setOutputLines([]);
        setRenderedLineCount(0);
    }, []);

    /**
     * Returns current line count (useful for game events).
     */
    const getLineCount = useCallback(() => {
        return outputLines.length;
    }, [outputLines.length]);

    const markLineComplete = useCallback(() => {
        setRenderedLineCount(prev => prev + 1);
    }, []);

    return {
        outputLines,
        renderedLineCount,
        appendInput,
        updateInputStatus,
        appendOutput,
        appendSystemMessage,
        appendLine,
        clear,
        getLineCount,
        markLineComplete
    };
};
