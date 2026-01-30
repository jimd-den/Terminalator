/**
 * GameCommandExecutor - Interface Adapter Layer
 * 
 * Orchestrates terminal commands including game-specific logic.
 * Registers game commands ('mail', 'check-comms', 'compile', 'vim')
 * alongside core commands via the Registry.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Master’s Tool (Pragmatic Design Patterns) - Command Pattern
 */

import { ExecuteCommand } from '../domain/usecases/ExecuteCommand';
import { MailSystem } from '../domain/usecases/MailSystem';
import { FileSystem } from '../domain/entities/FileSystem';
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

export class GameCommandExecutor extends ExecuteCommand {
    private mailSystem: MailSystem;
    private compiler: CodeCompiler;
    private gameManager: GameManager;

    constructor(
        fs: FileSystemService,
        gameManager: GameManager,
        networkMap: NetworkMap, // [NEW] Injected
        telemetry?: TelemetryPort
    ) {
        // Initialize Core Registry
        const registry = new CommandRegistry();
        const identityService = new IdentityService();

        // Register Core Modules
        new CoreUtilsModule(fs.fileSystem, identityService).register(registry);
        new SystemUtilsModule(fs).register(registry);

        // Pass dependencies to super
        super(fs, telemetry, registry, undefined, networkMap);

        this.networkMap = networkMap;
        this.mailSystem = new MailSystem(fs, telemetry);
        this.compiler = new CodeCompiler(this.fs, telemetry);
        this.gameManager = gameManager; // Note: GameManager instance passed in might need NetworkMap too!
        // ISSUE: GameManager is passed IN. Who constructs GameManager?
        // Usually TerminalViewModel.
        // If Logic demands GameManager has NetworkMap, TerminalViewModel must pass it.
        // OR GameCommandExecutor initializes GameManager?
        // Let's assume for now we must refactor how GameManager is created or updated.
        // But types says 'gameManager: GameManager'.

        this.registerGameCommands();
    }

    private registerGameCommands() {
        const registry = this.getRegistry();

        registry.register('mail', new MailCommand(this.mailSystem));
        registry.register('check-comms', new CheckCommsCommand(this.gameManager));
        registry.register('compile', new CompileCommand(this.compiler));
        registry.register('vim', new VimCommand());
        registry.register('scheme', new SchemeCommand(this.service));
        registry.register('asm', new AsmCommand(this.service));
        registry.register('options', new SettingsCommand());
        registry.register('settings', new SettingsCommand());

        // SSH
        registry.register('ssh', new ConnectCommand(this.networkMap));
        registry.register('connect', new ConnectCommand(this.networkMap));

        // Register Tutor
        registry.register('tutor', new TutorCommand(this.gameManager));
        registry.register('train', new TutorCommand(this.gameManager));
    }

    // Override execute to trigger Tutor and handle connection setup
    async execute(input: string, state: TerminalState): Promise<CommandResponse> {
        const response = await super.execute(input, state);

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
