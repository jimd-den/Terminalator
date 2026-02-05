import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { TutorEvent } from '../../../domain/entities/TutorEngine';

/**
 * useTutorMessagingController - Interface Adapter Layer
 * 
 * Bridges the TutorEngine events to the TutorMessagingService.
 * This is the "brain" that makes the Tutor talk in the IRC bar
 * based on what happens in the game (typing, speed, emotions).
 * 
 * Pillar: The Master’s Tool (Observer/Bridge Pattern)
 */
export const useTutorMessagingController = () => {
    const { gameManager, sendTutorMessage } = useGame();
    const tutorEngine = gameManager.tutorEngine;

    useEffect(() => {
        const unsubscribe = tutorEngine.subscribe((event: TutorEvent) => {
            switch (event.type) {
                case 'START':
                    sendTutorMessage(
                        `MISSION DATA UPLOADED: ${event.payload?.instructions || 'Awaiting synchronization.'}`,
                        'info'
                    );
                    break;
                case 'COMPLETE':
                    sendTutorMessage(
                        "Synchronization complete. Data integrity verified. Good work, operator.",
                        'hint'
                    );
                    break;
                case 'MISTAKE':
                    sendTutorMessage(
                        "Inefficient logic detected. I've corrected your buffer. Do not repeat the error.",
                        'warn'
                    );
                    break;
                case 'SPEED_WARNING':
                    if (event.payload === 'TOO SLOW') {
                        sendTutorMessage(
                            "Biological throughput falling below acceptable parameters. Accelerate.",
                            'warn'
                        );
                    } else if (event.payload === 'TOO FAST') {
                        sendTutorMessage(
                            "Input frequency exceeding buffer capacity. Precision is required.",
                            'info'
                        );
                    }
                    break;
                case 'EMOTION_CHANGE':
                    if (event.payload === 'CRASH_OUT') {
                        sendTutorMessage(
                            "SYSTEM INSTABILITY DETECTED. CEASE INCOHERENT INPUT IMMEDIATELY.",
                            'critical'
                        );
                    } else if (event.payload === 'MAD') {
                        sendTutorMessage(
                            "Your lack of precision is becoming... problematic.",
                            'warn'
                        );
                    }
                    break;
            }
        });

        return unsubscribe;
    }, [tutorEngine, sendTutorMessage]);
};
