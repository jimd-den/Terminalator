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
import { ProceduralMissionFactory } from '../../domain/factories/ProceduralMissionFactory';
import { KnuthianMissionFactory } from '../../domain/factories/KnuthianMissionFactory';
import { ComplexityEstimator } from '../../domain/services/constraints/ComplexityEstimator';
import { ConstraintValidator } from '../../domain/services/constraints/ConstraintValidator';
import { MissionPopulator } from '../../domain/services/MissionPopulator';
import { MissionService } from '../../domain/services/MissionService';
import { NPCService } from '../../domain/services/NPCService';
import { SystemPreparationService } from '../../domain/services/SystemPreparationService';
import { MailSystem } from '../../domain/usecases/MailSystem';
import { TutorEngine } from '../../domain/entities/TutorEngine';
import { LessonService } from '../../domain/services/LessonService';
import { LessonCoordinator } from '../../interface-adapters/LessonCoordinator';
import { GameManager } from '../../interface-adapters/GameManager';

/**
 * DependencyContainer - Infrastructure Layer
 * 
 * Central Composition Root for the application.
 * Responsible for wiring up the dependency graph.
 * 
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: Dependency Inversion (SOLID)
 */
export class DependencyContainer {
    
    public static createGameManager(
        fs: FileSystem, 
        networkMap: NetworkMap, 
        telemetry: TelemetryPort
    ): GameManager {
        const fsService = new FileSystemService(fs);
        const missionRepository = new MissionRepository(new JsonMissionDataProvider());
        const lessonRegistry = new LessonRegistry();
        const strategyRegistry = new StrategyRegistry();
        const tutorService = new TutorService(missionRepository, lessonRegistry, strategyRegistry);
        
        // World Manager (Adapter)
        const worldManager = new WorldManager();
        worldManager.registerHost('terminalator', fsService);

        // Procedural & Constraint Services
        const proceduralFactory = new ProceduralMissionFactory();
        const knuthianFactory = new KnuthianMissionFactory();
        const complexityEstimator = new ComplexityEstimator();
        const constraintValidator = new ConstraintValidator(complexityEstimator);
        const missionPopulator = new MissionPopulator(worldManager);

        // Domain Services
        const missionService = new MissionService(
            missionRepository, 
            tutorService, 
            worldManager, 
            proceduralFactory, 
            constraintValidator,
            knuthianFactory,
            missionPopulator
        );
        const npcService = new NPCService();
        const systemPreparationService = new SystemPreparationService(worldManager);

        // Core Use Cases / Engines
        const mailSystem = new MailSystem(fsService, telemetry);
        const tutorEngine = new TutorEngine();
        const lessonService = new LessonService();

        // Coordinators
        const lessonCoordinator = new LessonCoordinator(tutorEngine, mailSystem, missionService);

        // Initial setup
        systemPreparationService.initializeRootFileSystem(fs);

        return new GameManager(
            fs,
            networkMap,
            missionService,
            npcService,
            systemPreparationService,
            lessonCoordinator,
            mailSystem,
            lessonService,
            worldManager,
            tutorEngine,
            telemetry
        );
    }
}
