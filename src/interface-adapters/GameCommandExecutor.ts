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
import { CodeCompiler } from '../domain/usecases/CodeCompiler';
import { TelemetryPort } from '../domain/ports/TelemetryPort';

import { GameManager } from './GameManager';

import { MailCommand } from './commands/MailCommand';
import { CheckCommsCommand } from './commands/CheckCommsCommand';
import { CompileCommand } from './commands/CompileCommand';
import { VimCommand } from './commands/VimCommand';

export class GameCommandExecutor extends ExecuteCommand {
    private mailSystem: MailSystem;
    private compiler: CodeCompiler;
    private gameManager: GameManager;

    constructor(fs: FileSystem, gameManager: GameManager, telemetry?: TelemetryPort) {
        super(fs, telemetry);
        this.mailSystem = new MailSystem(fs, telemetry);
        this.compiler = new CodeCompiler(fs, telemetry);
        this.gameManager = gameManager;

        this.registerGameCommands();
    }

    /**
     * Registers game-specific commands into the registry.
     * This decouples the execution logic from the specific command implementations.
     */
    private registerGameCommands() {
        const registry = this.getRegistry();

        registry.register('mail', new MailCommand(this.mailSystem));
        registry.register('check-comms', new CheckCommsCommand(this.gameManager));
        registry.register('compile', new CompileCommand(this.compiler));
        registry.register('vim', new VimCommand());
    }

    // No need to override execute() anymore as the superclass uses the registry!
}
