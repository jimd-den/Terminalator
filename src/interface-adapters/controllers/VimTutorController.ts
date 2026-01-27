/**
 * VimTutorController - Interface Adapter Layer
 *
 * Handles tutor engine integration for Vim lessons.
 * Decouples tutor state management from VimEditor.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (Single Responsibility)
 *
 * Intent:
 * Subscribes to TutorEngine and provides tutor display state for Vim.
 */

import { useState, useEffect } from 'react';
import { TutorEngine } from '../../domain/entities/TutorEngine';

export interface VimTutorState {
    active: boolean;
    text: string;
    completed: string;
}

/**
 * useVimTutorController - React Hook
 *
 * Subscribes to TutorEngine and provides state for tutor overlay in Vim.
 *
 * @param tutorEngine - TutorEngine instance
 */
export const useVimTutorController = (tutorEngine: TutorEngine): VimTutorState => {
    const [tutorState, setTutorState] = useState<VimTutorState>({
        active: false,
        text: '',
        completed: ''
    });

    useEffect(() => {
        // If tutor is not active, clear state
        if (!tutorEngine.isActive()) {
            setTutorState({ active: false, text: '', completed: '' });
            return;
        }

        /**
         * Updates tutor state from engine.
         */
        const updateTutor = () => {
            setTutorState({
                active: tutorEngine.isActive(),
                text: tutorEngine.getGhostText(),
                completed: tutorEngine.getCompletedText()
            });
        };

        // Initial sync
        updateTutor();

        // Subscribe to tutor events
        const unsubscribe = tutorEngine.subscribe(() => {
            updateTutor();
        });

        return unsubscribe;
    }, [tutorEngine]);

    return tutorState;
};
