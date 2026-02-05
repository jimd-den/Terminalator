import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { GameManager } from '../../../interface-adapters/GameManager';
import { GameCommandExecutor } from '../../../interface-adapters/GameCommandExecutor';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { NetworkMap } from '../../../domain/services/NetworkMap';
import { ConsoleTelemetryAdapter } from '../../../infrastructure/telemetry/ConsoleTelemetryAdapter';
import { DependencyContainer } from '../../../infrastructure/di/DependencyContainer';
import { TutorMessagingService } from '../../../domain/services/tutor/TutorMessagingService';

/**
 * GameContext - Presentation Layer
 *
 * Provides global access to the core game systems (FileSystem, GameManager, etc.).
 * Adheres to "Dependency Minimalism" by exposing singletons.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Balanced Scale (KISS)
 */

interface GameContextType {
    fs: FileSystem;
    gameManager: GameManager;
    commandExecutor: GameCommandExecutor;
    telemetry: ConsoleTelemetryAdapter;
    tutorMessaging: TutorMessagingService;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize singletons once
    // Using lazy initialization to ensure purity and performance
    const [fs] = useState(() => new FileSystem());
    const [telemetry] = useState(() => new ConsoleTelemetryAdapter());
    const [networkMap] = useState(() => new NetworkMap()); // [NEW] Singleton
    const [tutorMessaging] = useState(() => new TutorMessagingService());

    // Create service for adapters that need it (GameManager, Executor)
    const [fsService] = useState(() => new FileSystemService(fs));

    const [gameManager] = useState(() => DependencyContainer.createGameManager(fs, networkMap, telemetry));
    const [commandExecutor] = useState(() => new GameCommandExecutor(fsService, gameManager, networkMap, telemetry));

    return (
        <GameContext.Provider value={{ fs, gameManager, commandExecutor, telemetry, tutorMessaging }}>
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
