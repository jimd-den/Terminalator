import { FileSystem } from '../domain/entities/FileSystem';
import { GameManager } from '../interface-adapters/GameManager';
import { GameCommandExecutor } from '../interface-adapters/GameCommandExecutor';
import { FileSystemService } from '../domain/services/FileSystemService';
import { NetworkMap } from '../domain/services/NetworkMap';
import { ConsoleTelemetryAdapter } from '../infrastructure/telemetry/ConsoleTelemetryAdapter';
import { DependencyContainer } from '../infrastructure/di/DependencyContainer';
import { TutorMessagingService } from '../domain/services/tutor/TutorMessagingService';
import { EconomyService } from '../domain/services/EconomyService';
import { TutorShadow } from '../domain/services/tutor/TutorShadow';
import { TutorBrain } from '../domain/entities/tutor/TutorBrain';
import { MasteryTracker } from '../domain/services/tutor/MasteryTracker';
import { SimulationBus } from '../domain/services/SimulationBus';
import { RhythmConductor } from '../domain/services/RhythmConductor';
import { CommandCoordinator } from '../interface-adapters/controllers/CommandCoordinator';
import { SimulationMediator } from './presentation/SimulationMediator';

/**
 * CoreEngine - Domain/Service Layer
 * 
 * Central Service Locator and Bootstrap for framework-agnostic core logic.
 * Decouples game services from the React lifecycle.
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: Dependency Injection (DI)
 */
export class CoreEngine {
    private static instance: CoreEngine;
    
    private initialized: boolean = false;
    private initPromise: Promise<void> | null = null;
    
    private fs!: FileSystem;
    private telemetry!: ConsoleTelemetryAdapter;
    private networkMap!: NetworkMap;
    private bus!: SimulationBus;
    private conductor!: RhythmConductor;
    private tutorMessaging!: TutorMessagingService;
    private economyService!: EconomyService;
    private masteryTracker!: MasteryTracker;
    private tutorBrain!: TutorBrain;
    private gameManager!: GameManager;
    private commandExecutor!: GameCommandExecutor;
    private tutorShadow!: TutorShadow;
    private commandCoordinator!: CommandCoordinator;
    private simulationMediator!: SimulationMediator;

    private constructor() {}

    public static getInstance(): CoreEngine {
        const globalRef = (global as any);
        if (!globalRef.__CORE_ENGINE_INSTANCE__) {
            globalRef.__CORE_ENGINE_INSTANCE__ = new CoreEngine();
        }
        return globalRef.__CORE_ENGINE_INSTANCE__;
    }

    public async initialize(): Promise<void> {
        if (this.initialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            console.log("CoreEngine: Starting initialization...");

            // 1. Base Infrastructure (Persistent across re-init if needed)
            if (!this.fs) this.fs = new FileSystem();
            if (!this.telemetry) this.telemetry = new ConsoleTelemetryAdapter();
            if (!this.networkMap) this.networkMap = new NetworkMap();
            if (!this.bus) this.bus = new SimulationBus(this.telemetry);
            if (!this.conductor) this.conductor = new RhythmConductor(this.bus);
            if (!this.tutorMessaging) this.tutorMessaging = new TutorMessagingService();
            console.log("CoreEngine: Infrastructure ready.");

            // 2. Dependent Services (using DependencyContainer)
            const fsService = DependencyContainer.createFileSystemService(this.fs);
            
            if (!this.economyService) {
                this.economyService = DependencyContainer.createEconomyService(this.bus, this.conductor);
            }
            if (!this.masteryTracker) {
                this.masteryTracker = DependencyContainer.createMasteryTracker(this.fs);
            }
            if (!this.tutorBrain) {
                this.tutorBrain = DependencyContainer.createTutorBrain(this.fs, this.bus);
                // Default Persona
                this.tutorBrain.setPersona(DependencyContainer.createPersona('standard', 'TUTOR'));
            }
            
            console.log("CoreEngine: Service instances ready.");

            // GameManager might need to be fresh if it tracks transient UI state, 
            // but usually it should also be singleton-like in CoreEngine.
            if (!this.gameManager) {
                this.gameManager = DependencyContainer.createGameManager(
                    this.fs, 
                    this.networkMap, 
                    this.telemetry, 
                    this.bus, 
                    this.conductor,
                    this.economyService,
                    this.masteryTracker
                );
            }
            console.log("CoreEngine: GameManager ready.");

            if (!this.commandExecutor) {
                this.commandExecutor = new GameCommandExecutor(fsService, this.gameManager, this.networkMap, this.economyService, this.telemetry);
            }
            if (!this.tutorShadow) {
                this.tutorShadow = DependencyContainer.createTutorShadow(
                    this.gameManager.tutorEngine, 
                    this.economyService, 
                    this.bus, 
                    this.gameManager.getPresentationDirector(),
                    this.conductor
                );
            }

            // 3. Controllers & Mediators
            if (!this.simulationMediator) {
                this.simulationMediator = new SimulationMediator(
                    this.bus,
                    this.gameManager.getPresentationDirector(),
                    this.commandExecutor
                );
            }
            
            if (!this.commandCoordinator) {
                this.commandCoordinator = new CommandCoordinator(this.commandExecutor, this.gameManager.getPresentationDirector());
            }
            console.log("CoreEngine: Controllers ready.");

            console.log("CoreEngine: Initialization complete.");

            this.initialized = true;
            this.initPromise = null;
        })();

        return this.initPromise;
    }

    public isInitialized(): boolean {
        return this.initialized;
    }

    public getFileSystem(): FileSystem { return this.fs; }
    public getTelemetry(): ConsoleTelemetryAdapter { return this.telemetry; }
    public getNetworkMap(): NetworkMap { return this.networkMap; }
    public getSimulationBus(): SimulationBus { return this.bus; }
    public getTutorMessaging(): TutorMessagingService { return this.tutorMessaging; }
    public getEconomyService(): EconomyService { return this.economyService; }
    public getMasteryTracker(): MasteryTracker { return this.masteryTracker; }
    public getTutorBrain(): TutorBrain { return this.tutorBrain; }
    public getGameManager(): GameManager { return this.gameManager; }
    public getCommandExecutor(): GameCommandExecutor { return this.commandExecutor; }
    public getTutorShadow(): TutorShadow { return this.tutorShadow; }
    public getCommandCoordinator(): CommandCoordinator { return this.commandCoordinator; }
    public getSimulationMediator(): SimulationMediator { return this.simulationMediator; }
    public getConductor(): RhythmConductor { return this.conductor; }

    public shutdown() {
        if (this.tutorBrain) {
            this.tutorBrain.dispose();
        }
        this.initialized = false;
    }
}
