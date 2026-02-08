/**
 * TutorPersonaProvider - Presentation Layer
 * 
 * Manages the active Tutor persona and input gating (Shadow).
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture)
 * Pillar: THE STORYTELLER’S CODE (Persona Orchestration)
 */

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { CoreEngine } from '../../../core/CoreEngine';
import { DependencyContainer } from '../../../infrastructure/di/DependencyContainer';
import { useTutorMessaging } from './TutorMessagingProvider';

interface TutorPersonaContextType {
    tutorBrain: any;
    tutorShadow: any;
    switchPersona: (id: 'standard' | 'rogue') => void;
}

const TutorPersonaContext = createContext<TutorPersonaContextType | undefined>(undefined);

export const TutorPersonaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const engine = CoreEngine.getInstance();
    const tutorBrain = engine.getTutorBrain();
    const tutorShadow = engine.getTutorShadow();
    
    const { sendTutorMessage } = useTutorMessaging();

    const switchPersona = useCallback((id: 'standard' | 'rogue') => {
        const name = id === 'rogue' ? 'GLITCH' : 'TUTOR';
        tutorBrain.setPersona(DependencyContainer.createPersona(id, name));
        sendTutorMessage(`PERSONAL PROTOCOL ${name} INITIALIZED.`, 'info', name);
    }, [tutorBrain, sendTutorMessage]);

    return (
        <TutorPersonaContext.Provider value={{ tutorBrain, tutorShadow, switchPersona }}>
            {children}
        </TutorPersonaContext.Provider>
    );
};

export const useTutorPersona = () => {
    const context = useContext(TutorPersonaContext);
    if (!context) {
        throw new Error('useTutorPersona must be used within a TutorPersonaProvider');
    }
    return context;
};
