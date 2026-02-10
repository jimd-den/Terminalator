import React, { useEffect, useMemo } from 'react';
import { useTutorMessaging } from '../context/TutorMessagingProvider';
import { useInput } from '../context/InputContext';
import { TutorPersonalityService } from '../../../domain/services/tutor/TutorPersonalityService';
import { PerformanceMonitor } from '../VisualCortex/PerformanceMonitor';
import { useVisualDirector } from '../../../interface-adapters/ui/VisualCortex/useVisualDirector';

/**
 * AppInitializer - Presentation Layer
 * 
 * Handles initial system boot logic, such as sending the first Tutor message.
 */
export const AppInitializer = () => {
    const { sendTutorMessage } = useTutorMessaging();
    const { setInputLocked } = useInput();
    const personality = useMemo(() => new TutorPersonalityService(), []);
    const { reportLag } = useVisualDirector();

    useEffect(() => {
        // Ensure input is unlocked on boot
        setInputLocked(false);

        // Send initial welcome message on boot
        sendTutorMessage(
            personality.getLine('GREETING'),
            "hint",
            "TUTOR"
        );

        // Initialize Performance Monitor
        const monitor = new PerformanceMonitor();
        monitor.onLagDetected(() => {
            console.warn("[AppInitializer] Performance Lag Detected. Triggering Reduced Motion.");
            reportLag();
        });
        monitor.start();

        return () => monitor.stop();
    }, [reportLag]);

    return null;
};
