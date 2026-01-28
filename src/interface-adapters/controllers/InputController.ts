/**
 * InputController - Interface Adapter Layer
 *
 * Handles raw input state and key routing for the terminal.
 * Decouples input management from the TerminalViewModel.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (Single Responsibility)
 *
 * Intent:
 * Manages input buffer, ghost text, and autocomplete.
 * Routes keystrokes to appropriate handlers (shell or tutor).
 */

import { useState, useCallback } from 'react';
import { AutocompleteService } from '../../domain/services/AutocompleteService';

/**
 * InputTarget - Determines where keystrokes are routed.
 * 
 * Design Pattern: Strategy Pattern
 * Allows dynamic routing based on current terminal mode.
 */
export type InputTarget =
    | { type: 'SHELL' }
    | { type: 'TUTOR' }
    | { type: 'PROCESS'; processId: number };

export interface InputControllerState {
    input: string;
    ghostText: string;
}

export interface InputControllerActions {
    setInput: (text: string) => void;
    appendChar: (char: string) => void;
    deleteChar: () => void;
    clearInput: () => void;
    acceptAutocomplete: () => void;
    updateGhostText: (text: string) => void;
}

/**
 * useInputController - React Hook
 *
 * Provides input state and actions for terminal input management.
 * 
 * @param autocompleteService - Service for generating autocomplete suggestions
 * @param cwd - Current working directory for autocomplete context
 * @param isTutorActive - Function to check if tutor mode is active
 */
export const useInputController = (
    autocompleteService: AutocompleteService,
    cwd: string,
    isTutorActive: () => boolean
): InputControllerState & InputControllerActions => {
    const [input, setInputState] = useState('');
    const [ghostText, setGhostText] = useState('');

    /**
     * Generates autocomplete suggestion for given text.
     * Returns empty string if tutor is active (tutor controls ghost text).
     */
    const getAutocompleteSuggestion = useCallback((text: string): string => {
        if (isTutorActive()) {
            return '';
        }
        return autocompleteService.getSuggestion(text, cwd);
    }, [autocompleteService, cwd, isTutorActive]);

    /**
     * Sets input and updates ghost text accordingly.
     */
    const setInput = useCallback((text: string) => {
        setInputState(text);
        setGhostText(getAutocompleteSuggestion(text));
    }, [getAutocompleteSuggestion]);

    /**
     * Appends a character to input.
     */
    const appendChar = useCallback((char: string) => {
        setInputState(prev => {
            const next = prev + char;
            setGhostText(getAutocompleteSuggestion(next));
            return next;
        });
    }, [getAutocompleteSuggestion]);

    /**
     * Deletes the last character from input.
     */
    const deleteChar = useCallback(() => {
        setInputState(prev => {
            const next = prev.slice(0, -1);
            setGhostText(getAutocompleteSuggestion(next));
            return next;
        });
    }, [getAutocompleteSuggestion]);

    /**
     * Clears input and ghost text.
     */
    const clearInput = useCallback(() => {
        setInputState('');
        setGhostText('');
    }, []);

    /**
     * Accepts autocomplete suggestion (TAB completion).
     */
    const acceptAutocomplete = useCallback(() => {
        if (ghostText) {
            setInputState(prev => prev + ghostText);
            setGhostText('');
        }
    }, [ghostText]);

    /**
     * Directly updates ghost text (used by tutor controller).
     */
    const updateGhostText = useCallback((text: string) => {
        setGhostText(text);
    }, []);

    return {
        input,
        ghostText,
        setInput,
        appendChar,
        deleteChar,
        clearInput,
        acceptAutocomplete,
        updateGhostText
    };
};
