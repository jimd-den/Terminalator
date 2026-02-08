import { useTutorMessaging } from '../context/TutorMessagingProvider';

/**
 * useTutorQueue - Presentation Layer Hook
 * 
 * Thin wrapper around useTutorMessaging.
 * 
 * Pillar: The Master’s Tool (Consumer/Pipeline Pattern)
 */
export const useTutorQueue = () => {
    const { activeTutorMessage, isTutorTyping } = useTutorMessaging();

    return { activeMessage: activeTutorMessage, isTyping: isTutorTyping };
};
