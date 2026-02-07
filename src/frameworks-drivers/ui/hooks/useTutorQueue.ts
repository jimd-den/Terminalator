import { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { TutorMessage } from '../../../domain/entities/tutor/TutorMessage';

/**
 * useTutorQueue - Presentation Layer Hook
 * 
 * Consumes the TutorMessagingService queue and handles serial playback
 * with typing animations. This ensures that rapid domain events do not
 * result in lost or flickering UI messages.
 * 
 * Pillar: The Master’s Tool (Consumer/Pipeline Pattern)
 */
export const useTutorQueue = () => {
    const { tutorMessaging } = useGame();
    const [activeMessage, setActiveMessage] = useState<TutorMessage | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const processingRef = useRef(false);

    useEffect(() => {
        if (!tutorMessaging) return;

        const processQueue = async () => {
            if (processingRef.current) return;
            processingRef.current = true;

            let msg = await tutorMessaging.getNextMessage();
            while (msg) {
                // 1. Start Typing
                setIsTyping(true);
                
                // 2. Delay based on message length
                const delay = Math.min(2000, 500 + msg.text.length * 20);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // 3. Show Message
                setIsTyping(false);
                setActiveMessage(msg);

                // 4. Wait a bit for reading before next message if queue is not empty
                const next = await tutorMessaging.getAllMessages();
                if (next.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }

                msg = await tutorMessaging.getNextMessage();
            }

            processingRef.current = false;
        };

        // Initial process
        processQueue();

        // Subscribe to new messages
        const unsubscribe = tutorMessaging.subscribe(() => {
            processQueue();
        });

        return unsubscribe;
    }, [tutorMessaging]);

    return { activeMessage, isTyping };
};
