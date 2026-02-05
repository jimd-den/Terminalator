import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { GameManager } from '../../../interface-adapters/GameManager';
import { GameCommandExecutor } from '../../../interface-adapters/GameCommandExecutor';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { NetworkMap } from '../../../domain/services/NetworkMap';
import { ConsoleTelemetryAdapter } from '../../../infrastructure/telemetry/ConsoleTelemetryAdapter';
import { DependencyContainer } from '../../../infrastructure/di/DependencyContainer';
import { TutorMessagingService } from '../../../domain/services/tutor/TutorMessagingService';
import { TutorMessage } from '../../../domain/entities/tutor/TutorMessage';

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
    activeTutorMessage: TutorMessage | null;
    sendTutorMessage: (text: string, type?: TutorMessage['type'], sender?: string) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize singletons once
    // Using lazy initialization to ensure purity and performance
    const [fs] = useState(() => new FileSystem());
    const [telemetry] = useState(() => new ConsoleTelemetryAdapter());
    const [networkMap] = useState(() => new NetworkMap()); // [NEW] Singleton
    const [tutorMessaging] = useState(() => new TutorMessagingService());
    
    // Reactive state for UI
    const [activeTutorMessage, setActiveTutorMessage] = useState<TutorMessage | null>(() => ({
        text: "Uplink established. Welcome to the Grid. (◕‿◕✿)",
        type: 'hint',
        sender: 'TUTOR',
        timestamp: Date.now()
    }));

    // Create service for adapters that need it (GameManager, Executor)
    const [fsService] = useState(() => new FileSystemService(fs));

    const [gameManager] = useState(() => DependencyContainer.createGameManager(fs, networkMap, telemetry));
    const [commandExecutor] = useState(() => new GameCommandExecutor(fsService, gameManager, networkMap, telemetry));

    const sendTutorMessage = async (text: string, type: TutorMessage['type'] = 'info', sender: string = 'TUTOR') => {
        console.log(`[TutorService] Sending message: "${text}" (${type}) from ${sender}`);
        await tutorMessaging.sendMessage(text, type, sender);
        const messages = await tutorMessaging.getAllMessages();
        const lastMsg = messages[messages.length - 1];
        setActiveTutorMessage(lastMsg);
    };

    return (
        <GameContext.Provider value={{ 
            fs, 
            gameManager, 
            commandExecutor, 
            telemetry, 
            tutorMessaging,
            activeTutorMessage,
            sendTutorMessage
        }}>
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
