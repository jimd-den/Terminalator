import React, { useEffect, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { TutorPersonalityService } from '../../../domain/services/tutor/TutorPersonalityService';

/**
 * AppInitializer - Presentation Layer
 * 
 * Handles initial system boot logic, such as sending the first Tutor message.
 */
export const AppInitializer = () => {
    const { sendTutorMessage } = useGame();
    const personality = useMemo(() => new TutorPersonalityService(), []);

    useEffect(() => {
        // Send initial welcome message on boot
        sendTutorMessage(
            personality.getLine('GREETING'),
            "hint",
            "TUTOR"
        );
    }, []);

    return null;
};
