/**
 * TutorMessagingProvider - Presentation Layer
 * 
 * Manages the queue and display of messages from the Tutor.
 * Handles the "typing" simulation delay for immersion.
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture)
 * Pillar: THE STORYTELLER’S CODE (Rhythm/Timing)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { TutorMessage } from '../../../domain/entities/tutor/TutorMessage';
import { CoreEngine } from '../../../core/CoreEngine';

interface TutorMessagingContextType {
    activeTutorMessage: TutorMessage | null;
    isTutorTyping: boolean;
    sendTutorMessage: (text: string, type?: TutorMessage['type'], sender?: string) => Promise<void>;
    tutorMessaging: any; // Using any for simplicity or import specific type
}

const TutorMessagingContext = createContext<TutorMessagingContextType | undefined>(undefined);

export const TutorMessagingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const engine = CoreEngine.getInstance();
    const tutorMessaging = engine.getTutorMessaging();

    const [activeTutorMessage, setActiveTutorMessage] = useState<TutorMessage | null>(null);
    const [isTutorTyping, setIsTutorTyping] = useState(false);

    useEffect(() => {
        let isMounted = true;
        let isProcessing = false;

        const processQueue = async () => {
            if (isProcessing) return;
            isProcessing = true;

            let msg = await tutorMessaging.getNextMessage();
            while (msg && isMounted) {
                setIsTutorTyping(true);
                // Human-like typing delay
                const delay = Math.min(2000, 500 + msg.text.length * 20);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                if (!isMounted) break;
                setIsTutorTyping(false);
                setActiveTutorMessage(msg);

                const next = await tutorMessaging.getAllMessages();
                if (next.length > 0) {
                    // Pause between messages
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
                msg = await tutorMessaging.getNextMessage();
            }
            isProcessing = false;
        };

        const unsubscribe = tutorMessaging.subscribe(() => {
            processQueue();
        });

        // Trigger initial check if queue already has items
        processQueue();

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [tutorMessaging]);

    const sendTutorMessage = useCallback(async (text: string, type: TutorMessage['type'] = 'info', sender: string = 'TUTOR') => {
        await tutorMessaging.sendMessage(text, type, sender);
    }, [tutorMessaging]);

    return (
        <TutorMessagingContext.Provider value={{ 
            activeTutorMessage, 
            isTutorTyping, 
            sendTutorMessage,
            tutorMessaging
        }}>
            {children}
        </TutorMessagingContext.Provider>
    );
};

export const useTutorMessaging = () => {
    const context = useContext(TutorMessagingContext);
    if (!context) {
        throw new Error('useTutorMessaging must be used within a TutorMessagingProvider');
    }
    return context;
};
