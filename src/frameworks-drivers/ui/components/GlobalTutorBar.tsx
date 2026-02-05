import React from 'react';
import { useGame } from '../context/GameContext';
import { TutorBar } from './TutorBar';

/**
 * GlobalTutorBar - Presentation Layer
 * 
 * A wrapper component that connects the TutorBar to the global GameContext.
 * Includes safety checks to prevent layout crashes.
 */
export const GlobalTutorBar = () => {
    try {
        const { activeTutorMessage } = useGame();
        return <TutorBar message={activeTutorMessage} />;
    } catch (err) {
        console.error("[GlobalTutorBar] Error accessing game context:", err);
        return null;
    }
};
