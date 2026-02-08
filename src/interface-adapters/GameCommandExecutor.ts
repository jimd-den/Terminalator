/**
 * GameCommandExecutor - Interface Adapter Layer
 * 
 * Orchestrates terminal commands including game-specific logic.
 * Composition over Inheritance: Composes a pure domain ExecuteCommand service.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Master’s Tool (Pragmatic Design Patterns) - Composition
 */

import { ExecuteCommand } from '../domain/usecases/ExecuteCommand';
import { MailSystem } from '../domain/usecases/MailSystem';
import { FileSystemService } from '../domain/services/FileSystemService';
import { CodeCompiler } from '../domain/usecases/CodeCompiler';
import { TelemetryPort } from '../domain/ports/TelemetryPort';
import { IdentityService } from '../domain/services/IdentityService';
import { GameManager } from './GameManager';
import { MailCommand } from './commands/MailCommand';
import { CheckCommsCommand } from './commands/game/CheckCommsCommand';
import { CompileCommand } from './commands/CompileCommand';
import { VimCommand } from './commands/VimCommand';
import { SchemeCommand } from './commands/game/SchemeCommand';
import { AsmCommand } from './commands/game/AsmCommand';
import { SettingsCommand } from './commands/game/SettingsCommand';
import { TutorCommand } from './commands/game/TutorCommand';
import { CommandRegistry } from '../domain/commands/CommandRegistry';
import { CoreUtilsModule } from '../domain/modules/CoreUtilsModule';
import { SystemUtilsModule } from '../domain/modules/SystemUtilsModule';
import { ConnectCommand } from './commands/game/ConnectCommand';
import { NetworkMap } from '../domain/services/NetworkMap';
import { TerminalState } from '../domain/entities/TerminalState';
import { CommandResponse } from '../domain/entities/Command';
import { IShellExecutor } from '../domain/interfaces/IShellExecutor';

export class GameCommandExecutor implements IShellExecutor {
    private mailSystem: MailSystem;
    private compiler: CodeCompiler;
    private gameManager: GameManager;
    private engine: ExecuteCommand;
    private registry: CommandRegistry;

    constructor(
        fsService: FileSystemService,
        gameManager: GameManager,
        private networkMap: NetworkMap,
        private telemetry?: TelemetryPort
    ) {
        this.gameManager = gameManager;
        this.registry = new CommandRegistry();
        const identityService = new IdentityService();

        // 1. Register Core Modules
        new CoreUtilsModule(fsService.fileSystem, identityService).register(this.registry);
        new SystemUtilsModule(fsService).register(this.registry);

        // 2. Compose Domain Engine
        this.engine = new ExecuteCommand(
            fsService,
            telemetry,
            this.registry,
            undefined,
            networkMap,
            gameManager.getWorldManager()
        );

        this.mailSystem = new MailSystem(fsService, telemetry);
        this.compiler = new CodeCompiler(fsService.fileSystem, telemetry);

        // 3. Register Game Commands
        this.registerGameCommands(fsService);
    }

    private registerGameCommands(fsService: FileSystemService) {
        this.registry.register('mail', new MailCommand(this.mailSystem));
        this.registry.register('check-comms', new CheckCommsCommand(this.gameManager));
        this.registry.register('compile', new CompileCommand(this.compiler));
        this.registry.register('vim', new VimCommand());
        this.registry.register('scheme', new SchemeCommand(fsService));
        this.registry.register('asm', new AsmCommand(fsService));
        this.registry.register('options', new SettingsCommand());
        this.registry.register('settings', new SettingsCommand());

        // SSH
        this.registry.register('ssh', new ConnectCommand(this.networkMap));
        this.registry.register('connect', new ConnectCommand(this.networkMap));

        // Register Tutor
        this.registry.register('tutor', new TutorCommand(this.gameManager));
        this.registry.register('train', new TutorCommand(this.gameManager));
    }

    public getRegistry(): CommandRegistry {
        return this.registry;
    }

    /**
     * Executes a command by delegating to the composed domain engine and
     * triggering game-specific events.
     */
    async execute(input: string, state: TerminalState): Promise<CommandResponse> {
        const response = await this.engine.execute(input, state);

        // 1. Connection established trigger: Ensure remote system is prepared with mission files
        if (response.newState?.fsContext && response.newState.fsContext !== state.fsContext) {
            this.gameManager.ensureSystemPrepared(response.newState.fsContext);
        }

        // 2. Pass the UPDATED state to GameManager for progression analysis
        const mergedState = { ...state, ...response.newState };
        this.gameManager.onCommandExecuted(mergedState, response);

        return response;
    }
}