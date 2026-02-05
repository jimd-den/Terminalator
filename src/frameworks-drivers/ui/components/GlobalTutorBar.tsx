import React from 'react';
import { useGame } from '../context/GameContext';
import { TutorBar } from './TutorBar';

/**
 * GlobalTutorBar - Presentation Layer
 * 
 * A wrapper component that connects the TutorBar to the global GameContext.
 */
export const GlobalTutorBar = () => {
    const { activeTutorMessage } = useGame();
    return <TutorBar message={activeTutorMessage} />;
};
