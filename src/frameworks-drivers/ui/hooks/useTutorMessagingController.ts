import { useEffect } from 'react';
import { useProcess } from '../context/ProcessProvider';
import { useTutorMessaging } from '../context/TutorMessagingProvider';
import { useTutorPersona } from '../context/TutorPersonaProvider';

/**
 * useTutorMessagingController - Interface Adapter Layer
 * 
 * Bridges the TutorObserver events to the TutorMessagingService.
 * This is the "Humble Object" that wires the reactive Domain to the UI.
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Master’s Tool (Observer/Bridge Pattern)
 */
export const useTutorMessagingController = () => {
    const { gameManager } = useProcess();
    const { sendTutorMessage } = useTutorMessaging();

    useEffect(() => {
        if (!gameManager) return;

        const observer = gameManager.getTutorObserver();
        if (!observer) return;

        // Sync active mission to observer
        const syncMission = () => {
            const active = gameManager.getActiveMissions().find(m => m.status === 'active');
            observer.setActiveMission(active || null);
        };

        syncMission();

        // Subscribe to TutorObserver's reactive reactions
        const unsubscribe = observer.onReaction((action: any) => {
            // Forward reaction to UI message queue
            sendTutorMessage(action.message, action.type || 'info', 'TUTOR');
        });

        // We also still support the legacy TutorBrain for now if needed,
        // but the goal is to migrate to the Observer.

        return () => {
            unsubscribe();
        };
    }, [gameManager, sendTutorMessage]);
};
