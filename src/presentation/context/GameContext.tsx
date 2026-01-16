import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FileSystem } from '../../domain/entities/FileSystem';
import { GameManager } from '../../interface-adapters/GameManager';
import { GameCommandExecutor } from '../../interface-adapters/GameCommandExecutor';
import { ConsoleTelemetryAdapter } from '../../infrastructure/telemetry/ConsoleTelemetryAdapter';

interface GameContextType {
    fs: FileSystem;
    gameManager: GameManager;
    commandExecutor: GameCommandExecutor;
    telemetry: ConsoleTelemetryAdapter;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize singletons once
    const [fs] = useState(new FileSystem());
    const [telemetry] = useState(new ConsoleTelemetryAdapter());
    const [gameManager] = useState(new GameManager(fs, telemetry));
    const [commandExecutor] = useState(new GameCommandExecutor(fs, gameManager, telemetry));

    return (
        <GameContext.Provider value={{ fs, gameManager, commandExecutor, telemetry }}>
            {children}
        </GameContext.Provider>
    );
};

export const useGame = () => {
    const context = useContext(GameContext);
    if (!context) {
        throw new Error('useGame must be used within a GameProvider');
    }
    return context;
};
