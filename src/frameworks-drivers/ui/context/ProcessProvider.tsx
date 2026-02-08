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
import { CommandCoordinator } from '../../../interface-adapters/controllers/CommandCoordinator';
import { SimulationMediator } from '../../../core/presentation/SimulationMediator';

interface ProcessContextType {
    gameManager: GameManager;
    commandExecutor: GameCommandExecutor;
    commandCoordinator: CommandCoordinator;
    simulationMediator: SimulationMediator;
    bus: SimulationBus;
    telemetry: ConsoleTelemetryAdapter;
}

const ProcessContext = createContext<ProcessContextType | undefined>(undefined);

export const ProcessProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const engine = CoreEngine.getInstance();
    
    const gameManager = engine.getGameManager();
    const commandExecutor = engine.getCommandExecutor();
    const commandCoordinator = engine.getCommandCoordinator();
    const simulationMediator = engine.getSimulationMediator();
    const bus = engine.getSimulationBus();
    const telemetry = engine.getTelemetry();

    return (
        <ProcessContext.Provider value={{ gameManager, commandExecutor, commandCoordinator, simulationMediator, bus, telemetry }}>
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
