import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FileSystem } from '../../domain/entities/FileSystem';
import { GameManager } from '../../interface-adapters/GameManager';
import { GameCommandExecutor } from '../../interface-adapters/GameCommandExecutor';

interface GameContextType {
    fs: FileSystem;
    gameManager: GameManager;
    commandExecutor: GameCommandExecutor;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [gameContext] = useState(() => {
        const fs = new FileSystem();
        const gameManager = new GameManager(fs);
        const commandExecutor = new GameCommandExecutor(fs, gameManager);
        return { fs, gameManager, commandExecutor };
    });

    return (
        <GameContext.Provider value={gameContext}>
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
