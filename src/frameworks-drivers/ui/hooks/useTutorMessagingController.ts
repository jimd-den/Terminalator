import { useEffect, useMemo } from 'react';
import { useGame } from '../context/GameContext';
import { TutorEvent } from '../../../domain/entities/TutorEngine';
import { TutorPersonalityService } from '../../../domain/services/tutor/TutorPersonalityService';

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
    const personality = useMemo(() => new TutorPersonalityService(), []);

    useEffect(() => {
        // Listen to Game Manager events (e.g. Commands)
        const unsubscribeGame = gameManager.subscribeToEvents((event) => {
            if (event === 'COMMAND_EXECUTED') {
                // 30% chance to comment on a random command if Tutor is otherwise idle
                if (Math.random() < 0.3 && !tutorEngine.isActive()) {
                    sendTutorMessage(
                        personality.getLine('COMMAND_GENERIC'),
                        'info'
                    );
                }
            }
        });

        const unsubscribeTutor = tutorEngine.subscribe((event: TutorEvent) => {
            switch (event.type) {
                case 'START':
                    sendTutorMessage(
                        `MISSION DATA UPLOADED: ${event.payload?.instructions || 'Awaiting synchronization.'}`,
                        'info'
                    );
                    sendTutorMessage(
                        personality.getLine('MISSION_START'),
                        'hint'
                    );
                    break;
                case 'COMPLETE':
                    sendTutorMessage(
                        personality.getLine('SUCCESS'),
                        'hint'
                    );
                    break;
                case 'MISTAKE':
                    sendTutorMessage(
                        personality.getLine('ERROR_LOW'),
                        'warn'
                    );
                    break;
                case 'SPEED_WARNING':
                    if (event.payload === 'TOO SLOW') {
                        sendTutorMessage(
                            personality.getLine('SPEED_LOW'),
                            'warn'
                        );
                    } else if (event.payload === 'TOO FAST') {
                        sendTutorMessage(
                            personality.getLine('SPEED_HIGH'),
                            'info'
                        );
                    }
                    break;
                case 'EMOTION_CHANGE':
                    if (event.payload === 'CRASH_OUT') {
                        sendTutorMessage(
                            personality.getLine('CRASH_OUT'),
                            'critical'
                        );
                    } else if (event.payload === 'MAD') {
                        sendTutorMessage(
                            personality.getLine('ERROR_HIGH'),
                            'warn'
                        );
                    }
                    break;
            }
        });

        return () => {
            unsubscribeGame();
            unsubscribeTutor();
        };
    }, [gameManager, tutorEngine, sendTutorMessage, personality]);
};
