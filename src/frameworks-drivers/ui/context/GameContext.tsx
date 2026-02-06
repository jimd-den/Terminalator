import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { GameManager } from '../../../interface-adapters/GameManager';
import { GameCommandExecutor } from '../../../interface-adapters/GameCommandExecutor';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { NetworkMap } from '../../../domain/services/NetworkMap';
import { ConsoleTelemetryAdapter } from '../../../infrastructure/telemetry/ConsoleTelemetryAdapter';
import { DependencyContainer } from '../../../infrastructure/di/DependencyContainer';
import { TutorMessagingService } from '../../../domain/services/tutor/TutorMessagingService';
import { TutorMessage } from '../../../domain/entities/tutor/TutorMessage';
import { CreditService } from '../../../domain/services/gamification/CreditService';
import { TutorBrain } from '../../../domain/entities/tutor/TutorBrain';
import { MasteryTracker } from '../../../domain/services/tutor/MasteryTracker';
import { PersonaLoader } from '../../../domain/services/tutor/PersonaLoader';

/**
 * GameContext - Presentation Layer
 *
 * Provides global access to the core game systems (FileSystem, GameManager, etc.).
 * Upgraded to wire up the Mission & Tutor Scaling engines to the UI.
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
    creditService: CreditService;
    credits: number;
    refreshCredits: () => Promise<void>;
    isInputLocked: boolean;
    setInputLocked: (locked: boolean) => void;
    isTutorTyping: boolean;
    tutorBrain: TutorBrain;
    masteryTracker: MasteryTracker;
    switchPersona: (id: 'standard' | 'rogue') => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [fs] = useState(() => new FileSystem());
    const [telemetry] = useState(() => new ConsoleTelemetryAdapter());
    const [networkMap] = useState(() => new NetworkMap());
    const [tutorMessaging] = useState(() => new TutorMessagingService());
    const [creditService] = useState(() => DependencyContainer.createCreditService(fs));
    const [masteryTracker] = useState(() => DependencyContainer.createMasteryTracker(fs));
    
    // Scale Engine Wiring: Use DI container to create properly injected Brain
    const [tutorBrain] = useState(() => {
        const brain = DependencyContainer.createTutorBrain(fs);
        // Initialize with modern Combinatorial Persona
        brain.setPersona(DependencyContainer.createPersona('standard', 'TUTOR'));
        return brain;
    });
    
    const [activeTutorMessage, setActiveTutorMessage] = useState<TutorMessage | null>(() => ({
        text: "Uplink established. Welcome to the Grid. (◕‿◕✿)",
        type: 'hint',
        sender: 'TUTOR',
        timestamp: Date.now()
    }));
    const [credits, setCredits] = useState(0);
    const [isInputLocked, setInputLocked] = useState(false);
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
                const delay = Math.min(2000, 500 + msg.text.length * 20);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                if (!isMounted) break;
                setIsTutorTyping(false);
                setActiveTutorMessage(msg);

                const next = await tutorMessaging.getAllMessages();
                if (next.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
                msg = await tutorMessaging.getNextMessage();
            }
            isProcessing = false;
        };

        const unsubscribe = tutorMessaging.subscribe(() => {
            processQueue();
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [tutorMessaging]);

    const [fsService] = useState(() => new FileSystemService(fs));
    const [gameManager] = useState(() => DependencyContainer.createGameManager(fs, networkMap, telemetry));
    const [commandExecutor] = useState(() => new GameCommandExecutor(fsService, gameManager, networkMap, telemetry));

    const sendTutorMessage = useCallback(async (text: string, type: TutorMessage['type'] = 'info', sender: string = 'TUTOR') => {
        await tutorMessaging.sendMessage(text, type, sender);
    }, [tutorMessaging]);

    const refreshCredits = useCallback(async () => {
        setCredits(await creditService.getBalance());
    }, [creditService]);

    const switchPersona = useCallback((id: 'standard' | 'rogue') => {
        // Updated to use combinatorial persona creation
        const name = id === 'rogue' ? 'GLITCH' : 'TUTOR';
        tutorBrain.setPersona(DependencyContainer.createPersona(id, name));
        
        // Use generic message instead of legacy process('GREETING') if not in library
        sendTutorMessage(`PERSONAL PROTOCOL ${name} INITIALIZED.`, 'info', name);
    }, [tutorBrain, sendTutorMessage]);

    useEffect(() => { refreshCredits(); }, []);

    return (
        <GameContext.Provider value={{ 
            fs, 
            gameManager, 
            commandExecutor, 
            telemetry, 
            tutorMessaging,
            activeTutorMessage,
            sendTutorMessage,
            creditService,
            credits,
            refreshCredits,
            isInputLocked,
            setInputLocked,
            isTutorTyping,
            tutorBrain,
            masteryTracker,
            switchPersona
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