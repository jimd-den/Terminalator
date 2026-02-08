import React from 'react';
import { useTutorMessaging } from '../context/TutorMessagingProvider';
import { TutorBar } from './TutorBar';

/**
 * GlobalTutorBar - Presentation Layer
 * 
 * A wrapper component that connects the TutorBar to the global granular providers.
 * Includes safety checks to prevent layout crashes.
 */
export const GlobalTutorBar = () => {
    try {
        const { activeTutorMessage } = useTutorMessaging();
        return <TutorBar message={activeTutorMessage} />;
    } catch (err) {
        console.error("[GlobalTutorBar] Error accessing messaging context:", err);
        return null;
    }
};
