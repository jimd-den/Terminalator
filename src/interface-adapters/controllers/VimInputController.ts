/**
 * VimInputController - Interface Adapter Layer
 *
 * Handles Vim key input routing and command mode buffer.
 * Decouples input management from VimEditor.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (Single Responsibility)
 *
 * Intent:
 * Routes keystrokes based on current Vim mode.
 * Manages command-line mode input buffer.
 */

import { useState, useCallback } from 'react';
import { VimSimulator } from '../VimSimulator';
import { VimState, VimMode } from '../../domain/entities/VimEngine';
import { TutorEngine } from '../../domain/entities/TutorEngine';
import { TutorShadow } from '../../domain/services/tutor/TutorShadow';

export interface VimInputControllerState {
    state: VimState & { lines: string[] };
    commandInput: string;
}

export interface VimInputControllerActions {
    handleVirtualKey: (key: string) => void;
    handleCommandSubmit: () => boolean;
    resetCommandInput: () => void;
}

/**
 * useVimInputController - React Hook
 *
 * Provides Vim input handling with mode-aware key routing.
 *
 * @param simulator - VimSimulator instance
 * @param onExit - Callback when user exits vim
 * @param tutorEngine - TutorEngine for tutor mode input forwarding
 */
export const useVimInputController = (
    simulator: VimSimulator,
    onExit: () => void,
    tutorEngine: TutorEngine,
    tutorShadow: TutorShadow
): VimInputControllerState & VimInputControllerActions => {
    const [state, setState] = useState(simulator.getSnapshot());
    const [commandInput, setCommandInput] = useState('');

    /**
     * Handles command-line mode submission (:w, :q, etc.)
     * Returns true if vim should exit.
     */
    const handleCommandSubmit = useCallback((): boolean => {
        const { exit, message } = simulator.executeCommand(commandInput);
        if (exit) {
            onExit();
            return true;
        } else {
            const nextState = simulator.getSnapshot();
            nextState.statusMessage = message;
            setState(nextState);
            setCommandInput('');
            return false;
        }
    }, [commandInput, onExit, simulator]);

    /**
     * Resets command input buffer.
     */
    const resetCommandInput = useCallback(() => {
        setCommandInput('');
    }, []);

    /**
     * Main key handler - routes keys based on mode.
     */
    const handleVirtualKey = useCallback((key: string) => {
        // -- TUTOR SHADOW INTERCEPTION (GATING) --
        const allowed = tutorShadow.intercept(key, 'VIM');
        if (!allowed) return;

        // -- BACKSPACE HANDLING --
        if (key === 'BACKSPACE') {
            if (state.mode === 'COMMAND') {
                if (commandInput.length > 0) {
                    setCommandInput(prev => prev.slice(0, -1));
                } else {
                    // Exit command mode if backspace on empty
                    simulator.handleInput('ESC');
                    setState(simulator.getSnapshot());
                }
                return;
            }
            setState(simulator.handleInput('BACKSPACE'));
            return;
        }

        // -- COMMAND MODE HANDLING --
        if (state.mode === 'COMMAND') {
            if (key === 'ESC') {
                simulator.handleInput('ESC');
                setState(simulator.getSnapshot());
                setCommandInput('');
                return;
            }
            if (key === 'ENTER') {
                handleCommandSubmit();
                return;
            }
            if (key.length === 1) {
                setCommandInput(prev => prev + key);
            }
            return;
        }

        // -- ENTERING COMMAND MODE --
        if (state.mode === 'NORMAL' && key === ':') {
            setCommandInput(':');
        }

        // -- PASS TO ENGINE --
        setState(simulator.handleInput(key));
    }, [state.mode, commandInput, simulator, handleCommandSubmit, tutorEngine]);

    return {
        state,
        commandInput,
        handleVirtualKey,
        handleCommandSubmit,
        resetCommandInput
    };
};
