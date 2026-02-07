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
import { EconomyService } from '../../../domain/services/EconomyService';
import { TutorShadow } from '../../../domain/services/tutor/TutorShadow';
import { TutorBrain } from '../../../domain/entities/tutor/TutorBrain';
import { MasteryTracker } from '../../../domain/services/tutor/MasteryTracker';
import { PersonaLoader } from '../../../domain/services/tutor/PersonaLoader';
import { SimulationBus, GameEventType } from '../../../domain/services/SimulationBus';

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
    bus: SimulationBus;
    tutorMessaging: TutorMessagingService;
    activeTutorMessage: TutorMessage | null;
    sendTutorMessage: (text: string, type?: TutorMessage['type'], sender?: string) => Promise<void>;
    economyService: EconomyService;
    zincBalance: number;
    syncWallet: () => Promise<void>;
    isInputLocked: boolean;
    setInputLocked: (locked: boolean) => void;
    isTutorTyping: boolean;
    tutorBrain: TutorBrain;
    tutorShadow: TutorShadow;
    masteryTracker: MasteryTracker;
    switchPersona: (id: 'standard' | 'rogue') => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 1. Base Infrastructure (Independent)
    const [fs] = useState(() => new FileSystem());
    const [telemetry] = useState(() => new ConsoleTelemetryAdapter());
    const [networkMap] = useState(() => new NetworkMap());
    const [bus] = useState(() => new SimulationBus(telemetry));
    const [tutorMessaging] = useState(() => new TutorMessagingService());

    // 2. State-driven UI state
    const [activeTutorMessage, setActiveTutorMessage] = useState<TutorMessage | null>(null);
    const [zincBalance, setZincBalance] = useState(0);
    const [isInputLocked, setInputLocked] = useState(false);
    const [isTutorTyping, setIsTutorTyping] = useState(false);

    // 3. Consolidated System Initialization (Dependent Services)
    // Ensures singletons and correct injection order.
    const [core] = useState(() => {
        const fsService = new FileSystemService(fs);
        const economyService = DependencyContainer.createEconomyService(fs, bus);
        const masteryTracker = DependencyContainer.createMasteryTracker(fs);
        const tutorBrain = DependencyContainer.createTutorBrain(fs, bus);
        
        // Initialize with modern Combinatorial Persona
        tutorBrain.setPersona(DependencyContainer.createPersona('standard', 'TUTOR'));

        const gameManager = DependencyContainer.createGameManager(fs, networkMap, telemetry, bus);
        const commandExecutor = new GameCommandExecutor(fsService, gameManager, networkMap, telemetry);
        const tutorShadow = DependencyContainer.createTutorShadow(gameManager.tutorEngine, economyService, bus, gameManager.getPresentationDirector());
        
        return { fsService, economyService, masteryTracker, tutorBrain, gameManager, commandExecutor, tutorShadow };
    });

    const { 
        economyService, 
        masteryTracker, 
        tutorBrain, 
        gameManager, 
        commandExecutor, 
        tutorShadow 
    } = core;

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

    useEffect(() => {
        const unsubscribe = bus.subscribe(GameEventType.ECONOMY_UPDATE, (event) => {
            setZincBalance(event.payload.balance);
        });
        return unsubscribe;
    }, [bus]);

    // Trigger initial generative welcome
    useEffect(() => {
        bus.emit('TUTOR_EVENT' as any, { type: 'SYSTEM_BOOT', payload: {} });
    }, [bus]);

    const sendTutorMessage = useCallback(async (text: string, type: TutorMessage['type'] = 'info', sender: string = 'TUTOR') => {
        await tutorMessaging.sendMessage(text, type, sender);
    }, [tutorMessaging]);

    const syncWallet = useCallback(async () => {
        economyService.syncWallet();
        setZincBalance(economyService.getBalance());
    }, [economyService]);

    const switchPersona = useCallback((id: 'standard' | 'rogue') => {
        const name = id === 'rogue' ? 'GLITCH' : 'TUTOR';
        tutorBrain.setPersona(DependencyContainer.createPersona(id, name));
        sendTutorMessage(`PERSONAL PROTOCOL ${name} INITIALIZED.`, 'info', name);
    }, [tutorBrain, sendTutorMessage]);

    useEffect(() => { syncWallet(); }, [syncWallet]);

    return (
        <GameContext.Provider value={{ 
            fs, 
            gameManager, 
            commandExecutor, 
            telemetry, 
            bus,
            tutorMessaging,
            activeTutorMessage,
            sendTutorMessage,
            economyService,
            zincBalance,
            syncWallet,
            isInputLocked,
            setInputLocked,
            isTutorTyping,
            tutorBrain,
            tutorShadow,
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
