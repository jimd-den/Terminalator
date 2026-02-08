/**
 * SystemStateProvider - Presentation Layer
 * 
 * Manages global UI-level system flags (e.g., input locking).
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture)
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SystemStateContextType {
    isInputLocked: boolean;
    setInputLocked: (locked: boolean) => void;
}

const SystemStateContext = createContext<SystemStateContextType | undefined>(undefined);

export const SystemStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isInputLocked, setInputLocked] = useState(false);

    return (
        <SystemStateContext.Provider value={{ isInputLocked, setInputLocked }}>
            {children}
        </SystemStateContext.Provider>
    );
};

export const useSystemState = () => {
    const context = useContext(SystemStateContext);
    if (!context) {
        throw new Error('useSystemState must be used within a SystemStateProvider');
    }
    return context;
};
