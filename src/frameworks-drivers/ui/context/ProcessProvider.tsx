/**
 * ProcessProvider - Presentation Layer
 * 
 * Provides access to the game execution logic, process management, 
 * and the central simulation bus.
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture)
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { GameManager } from '../../../interface-adapters/GameManager';
import { GameCommandExecutor } from '../../../interface-adapters/GameCommandExecutor';
import { SimulationBus } from '../../../domain/services/SimulationBus';
import { ConsoleTelemetryAdapter } from '../../../infrastructure/telemetry/ConsoleTelemetryAdapter';
import { CoreEngine } from '../../../core/CoreEngine';

interface ProcessContextType {
    gameManager: GameManager;
    commandExecutor: GameCommandExecutor;
    bus: SimulationBus;
    telemetry: ConsoleTelemetryAdapter;
}

const ProcessContext = createContext<ProcessContextType | undefined>(undefined);

export const ProcessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const engine = CoreEngine.getInstance();
    
    const gameManager = engine.getGameManager();
    const commandExecutor = engine.getCommandExecutor();
    const bus = engine.getSimulationBus();
    const telemetry = engine.getTelemetry();

    return (
        <ProcessContext.Provider value={{ gameManager, commandExecutor, bus, telemetry }}>
            {children}
        </ProcessContext.Provider>
    );
};

export const useProcess = () => {
    const context = useContext(ProcessContext);
    if (!context) {
        throw new Error('useProcess must be used within a ProcessProvider');
    }
    return context;
};
