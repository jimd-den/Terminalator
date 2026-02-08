import React, { useEffect, useMemo } from 'react';
import { useTutorMessaging } from '../context/TutorMessagingProvider';
import { useInput } from '../context/InputContext';
import { TutorPersonalityService } from '../../../domain/services/tutor/TutorPersonalityService';

/**
 * AppInitializer - Presentation Layer
 * 
 * Handles initial system boot logic, such as sending the first Tutor message.
 */
export const AppInitializer = () => {
    const { sendTutorMessage } = useTutorMessaging();
    const { setInputLocked } = useInput();
    const personality = useMemo(() => new TutorPersonalityService(), []);

    useEffect(() => {
        // Ensure input is unlocked on boot
        setInputLocked(false);

        // Send initial welcome message on boot
        sendTutorMessage(
            personality.getLine('GREETING'),
            "hint",
            "TUTOR"
        );
    }, []);

    return null;
};
