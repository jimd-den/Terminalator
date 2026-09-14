/**
 * DependencyContainer - Infrastructure Layer
 * 
 * Central Composition Root for the application.
 * Upgraded to wire up the Mission & Tutor Scaling Mega Track.
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: Dependency Inversion (SOLID)
 */

import { FileSystem } from '../../domain/entities/FileSystem';
import { NetworkMap } from '../../domain/services/NetworkMap';
import { TelemetryPort } from '../../domain/ports/TelemetryPort';
import { FileSystemService } from '../../domain/services/FileSystemService';
import { MissionRepository } from '../../domain/services/MissionRepository';
import { JsonMissionDataProvider } from '../data/JsonMissionDataProvider';
import { LessonRegistry } from '../../domain/services/LessonRegistry';
import { StrategyRegistry } from '../../domain/services/mission-strategies/StrategyRegistry';
import { TutorService } from '../../domain/services/TutorService';
import { WorldManager } from '../../interface-adapters/WorldManager';
import { MissionPopulator } from '../../domain/services/MissionPopulator';
import { MissionService } from '../../domain/services/MissionService';
import { NPCService } from '../../domain/services/NPCService';
import { WorldPatchService } from '../../domain/services/world/WorldPatchService';
import { PresentationDirector } from '../../domain/services/PresentationDirector';
import { MailSystem } from '../../domain/usecases/MailSystem';
import { SimulationBus } from '../../domain/services/SimulationBus';
import { TutorEngine } from '../../domain/entities/TutorEngine';
import { LessonService } from '../../domain/services/LessonService';
import { LessonCoordinator } from '../../interface-adapters/LessonCoordinator';
import { GameManager } from '../../interface-adapters/GameManager';

import { EconomyService } from '../../domain/services/EconomyService';
import { MasteryTracker } from '../../domain/services/tutor/MasteryTracker';
import { DiskMasteryRepository } from '../../interface-adapters/DiskMasteryRepository';
import { IdentityService } from '../../domain/services/IdentityService';
import { RhythmConductor } from '../../domain/services/RhythmConductor';
import { ILedgerRepository } from '../../domain/interfaces/ILedgerRepository';
import { SqliteLedgerRepository } from '../persistence/SqliteLedgerRepository';
import { LocalStorageLedgerRepository } from '../persistence/LocalStorageLedgerRepository';

// Scaling Engine Imports
import { ConstraintMissionFactory } from '../../domain/usecases/mission/ConstraintMissionFactory';
import { TutorLedProgression } from '../../domain/usecases/tutor/TutorLedProgression';
import { UnixKnowledgeBase } from '../../domain/services/knowledge/UnixKnowledgeBase';
import { IntensityCalculator } from '../../domain/services/tutor/IntensityCalculator';
import { MissionIntentInterpreter } from '../../domain/interpreters/MissionIntentInterpreter';
import { PersonaLoader } from '../../domain/services/tutor/PersonaLoader';
import * as dialogueLibrary from '../../domain/data/tutor/DialogueLibrary.json';
import { TutorBrain } from '../../domain/entities/tutor/TutorBrain';
import { TutorShadow } from '../../domain/services/tutor/TutorShadow';
import { TutorObserver } from '../../domain/services/tutor/TutorObserver';
import { PsychAdapter } from '../../domain/services/tutor/PsychAdapter';
import { IStructuredCommand } from '../../domain/commands/IStructuredCommand';

// Structured Commands
import { GrepCommand } from '../../domain/commands/core/GrepCommand';
import { SedCommand } from '../../domain/commands/core/SedCommand';
import { AwkCommand } from '../../domain/commands/core/AwkCommand';
import { CdCommand } from '../../domain/commands/core/CdCommand';
import { LsCommand } from '../../domain/commands/core/LsCommand';
import { MkdirCommand } from '../../domain/commands/core/MkdirCommand';
import { CatCommand } from '../../domain/commands/core/CatCommand';
import { TouchCommand } from '../../domain/commands/core/TouchCommand';
import { RmCommand } from '../../domain/commands/core/RmCommand';
import { CpCommand } from '../../domain/commands/core/CpCommand';
import { MvCommand } from '../../domain/commands/core/MvCommand';
import { PwdCommand } from '../../domain/commands/core/PwdCommand';
import { HeadCommand } from '../../domain/commands/core/HeadCommand';
import { TailCommand } from '../../domain/commands/core/TailCommand';
import { WcCommand } from '../../domain/commands/core/WcCommand';
import { ChmodCommand } from '../../domain/commands/core/ChmodCommand';
import { ChgrpCommand } from '../../domain/commands/core/ChgrpCommand';
import { ChownCommand } from '../../domain/commands/core/ChownCommand';
import { LnCommand } from '../../domain/commands/core/LnCommand';
import { RmdirCommand } from '../../domain/commands/core/RmdirCommand';
import { TransferCommand } from '../../domain/commands/core/TransferCommand';
import { NetScanCommand } from '../../domain/commands/core/NetScanCommand';
import { NetLinkCommand } from '../../domain/commands/core/NetLinkCommand';
import { BypassCommand } from '../../domain/commands/core/BypassCommand';
import { NetConfCommand } from '../../domain/commands/core/NetConfCommand';
import { GenCommand } from '../../domain/commands/core/GenCommand';
import { IrcCommand } from '../../domain/commands/core/IrcCommand';
import { ArchiveCommand } from '../../domain/commands/core/ArchiveCommand';

export class DependencyContainer {
    private static economyService: EconomyService | null = null;
    private static masteryTracker: MasteryTracker | null = null;
    private static tutorBrain: TutorBrain | null = null;

    public static createRhythmConductor(bus: SimulationBus): RhythmConductor {
        return new RhythmConductor(bus);
    }

    public static createLedgerRepository(): ILedgerRepository {
        // Platform check: Use LocalStorage for Web to avoid SQLite Worker issues
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
            return new LocalStorageLedgerRepository();
        }
        return new SqliteLedgerRepository();
    }

    public static createEconomyService(bus?: SimulationBus, conductor?: RhythmConductor): EconomyService {
        if (!this.economyService) {
            this.economyService = new EconomyService(bus, conductor);
        }
        return this.economyService;
    }

    public static createMasteryTracker(fs: FileSystem): MasteryTracker {
        if (!this.masteryTracker) {
            const fsService = this.createFileSystemService(fs);
            const repository = new DiskMasteryRepository(fsService);
            this.masteryTracker = new MasteryTracker(repository);
        }
        return this.masteryTracker;
    }
    
    public static createPersona(id: string, name: string): PersonaLoader {
        return new PersonaLoader({
            id,
            name,
            lines: (dialogueLibrary as any).structures
        }, (dialogueLibrary as any).fragments);
    }

    public static createTutorBrain(fs: FileSystem, bus: SimulationBus): TutorBrain {
        if (!this.tutorBrain) {
            const masteryTracker = this.createMasteryTracker(fs);
            const intensityCalculator = new IntensityCalculator(masteryTracker);
            const intentInterpreter = new MissionIntentInterpreter();
            this.tutorBrain = new TutorBrain(intensityCalculator, intentInterpreter, bus);
        }
        return this.tutorBrain;
    }

    public static createTutorObserver(bus: SimulationBus, tutorService: TutorService, fsService: FileSystemService): TutorObserver {
        const psychAdapter = new PsychAdapter();
        return new TutorObserver(bus, psychAdapter, tutorService, fsService);
    }

    public static createTutorShadow(
        engine: TutorEngine, 
        economy: EconomyService, 
        bus: SimulationBus,
        director: PresentationDirector,
        conductor: RhythmConductor
    ): TutorShadow {
        return new TutorShadow(engine, economy, bus, director, conductor);
    }

    private static fsServiceMap: Map<FileSystem, FileSystemService> = new Map();

    public static createFileSystemService(fs: FileSystem): FileSystemService {
        let service = this.fsServiceMap.get(fs);
        if (!service) {
            service = new FileSystemService(fs);
            this.fsServiceMap.set(fs, service);
        }
        return service;
    }

    public static createGameManager(
        fs: FileSystem, 
        networkMap: NetworkMap, 
        telemetry: TelemetryPort,
        bus: SimulationBus,
        conductor: RhythmConductor,
        economyService?: EconomyService,
        masteryTracker?: MasteryTracker
    ): GameManager {
        const fsService = this.createFileSystemService(fs);
        const identityService = new IdentityService();
        const missionRepository = new MissionRepository(new JsonMissionDataProvider());
        const lessonRegistry = new LessonRegistry();
        const strategyRegistry = new StrategyRegistry();
        const tutorService = new TutorService(missionRepository, lessonRegistry, strategyRegistry);
        
        const activeMasteryTracker = masteryTracker || this.createMasteryTracker(fs);
        const activeEconomyService = economyService || this.createEconomyService(bus, conductor);
        
        const worldManager = new WorldManager(
            networkMap, 
            (f) => DependencyContainer.createFileSystemService(f)
        );
        worldManager.registerHost('terminalator', fsService);

        // --- Scaling Engine Wiring ---
        const structuredCommands: IStructuredCommand[] = [
            new GrepCommand(fsService),
            new SedCommand(fsService),
            new AwkCommand(fsService),
            new CdCommand(fsService),
            new LsCommand(fsService),
            new MkdirCommand(fsService),
            new CatCommand(fsService),
            new TouchCommand(fsService),
            new RmCommand(fsService),
            new CpCommand(fsService),
            new MvCommand(fsService),
            new PwdCommand(fsService),
            new HeadCommand(fsService),
            new TailCommand(fsService),
            new WcCommand(fsService),
            new ChmodCommand(fsService),
            new ChgrpCommand(fsService, identityService),
            new ChownCommand(fsService, identityService),
            new LnCommand(fsService),
            new RmdirCommand(fsService),
            new TransferCommand(), // Note: Transfer uses context.fileSystemService
            new NetScanCommand(),
            new NetLinkCommand(),
            new BypassCommand(),
            new NetConfCommand(),
            new GenCommand(),
            new IrcCommand(),
            new ArchiveCommand()
        ];

        const missionPopulator = new MissionPopulator(worldManager);

        const npcService = new NPCService();
        const worldPatchService = new WorldPatchService(worldManager);

        const combinatorialFactory = new ConstraintMissionFactory(new UnixKnowledgeBase(), worldPatchService);
        const tutorProgression = new TutorLedProgression(combinatorialFactory as any, activeMasteryTracker);

        const missionService = new MissionService(
            tutorService, 
            bus,
            worldManager, 
            missionPopulator,
            tutorProgression
        );

        const mailSystem = new MailSystem(fsService, telemetry);
        const presentationDirector = new PresentationDirector(bus);
        const tutorEngine = new TutorEngine(bus);
        const lessonService = new LessonService();

        const lessonCoordinator = new LessonCoordinator(tutorEngine, mailSystem, missionService, activeEconomyService);

        const tutorObserver = this.createTutorObserver(bus, tutorService, fsService);

        worldPatchService.initializeRootFileSystem(fs);
        // Refresh Tutor's FS view after population
        tutorObserver.setFileSystemService(fsService);

        return new GameManager(
            fs,
            networkMap,
            missionService,
            npcService,
            worldPatchService,
            lessonCoordinator,
            mailSystem,
            lessonService,
            worldManager,
            tutorEngine,
            presentationDirector,
            bus,
            tutorObserver,
            telemetry
        );
    }
}
