/**
 * MasteryProvider - Presentation Layer
 * 
 * Provides access to command mastery and skill progression.
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture)
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { MasteryTracker } from '../../../domain/services/tutor/MasteryTracker';
import { CoreEngine } from '../../../core/CoreEngine';

interface MasteryContextType {
    masteryTracker: MasteryTracker;
}

const MasteryContext = createContext<MasteryContextType | undefined>(undefined);

export const MasteryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const masteryTracker = CoreEngine.getInstance().getMasteryTracker();

    return (
        <MasteryContext.Provider value={{ masteryTracker }}>
            {children}
        </MasteryContext.Provider>
    );
};

export const useMastery = () => {
    const context = useContext(MasteryContext);
    if (!context) {
        throw new Error('useMastery must be used within a MasteryProvider');
    }
    return context;
};
