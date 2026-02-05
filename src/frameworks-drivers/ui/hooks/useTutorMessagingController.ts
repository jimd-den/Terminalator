import { useEffect } from 'react';
import { useGame } from '../context/GameContext';

/**
 * useTutorMessagingController - Interface Adapter Layer
 * 
 * Bridges the TutorBrain events to the TutorMessagingService.
 * This is the "Humble Object" that wires the Brain to the UI/Service.
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Master’s Tool (Observer/Bridge Pattern)
 */
export const useTutorMessagingController = () => {
    const { gameManager, sendTutorMessage, tutorBrain } = useGame();

    useEffect(() => {
        if (!gameManager || !tutorBrain) return;

        // Initialize Brain observation
        tutorBrain.observe(gameManager);

        // Subscribe to Brain's reactions and forward to Messaging Service
        const unsubscribeBrain = tutorBrain.subscribe((text, type) => {
            // Forward reaction to UI message queue
            sendTutorMessage(text, type as any, tutorBrain.activePersona.name.toUpperCase());
        });

        return () => {
            unsubscribeBrain();
            // Note: We don't necessarily want to stop observing the game if the hook unmounts,
            // but in React context, this hook usually lives with the GameProvider.
        };
    }, [gameManager, tutorBrain, sendTutorMessage]);
};
