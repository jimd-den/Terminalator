import React, { useEffect } from 'react';
import { useGame } from '../context/GameContext';

/**
 * AppInitializer - Presentation Layer
 * 
 * Handles initial system boot logic, such as sending the first Tutor message.
 */
export const AppInitializer = () => {
    const { sendTutorMessage } = useGame();

    useEffect(() => {
        // Send initial welcome message on boot
        sendTutorMessage(
            "Uplink established. Welcome back to the Grid, operator. (◕‿◕✿)",
            "hint",
            "TUTOR"
        );
    }, []);

    return null;
};
