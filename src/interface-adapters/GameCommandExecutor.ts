/**
 * GameCommandDecorator - Application Logic / Interface Adapter
 * 
 * Extends the basic terminal commands with game-specific logic
 * like 'mail', 'vim', and 'compile'.
 */

import { ExecuteCommand, CommandResponse } from '../domain/usecases/ExecuteCommand';
import { MailSystem } from '../domain/usecases/MailSystem';
import { TerminalState } from '../domain/entities/TerminalState';
import { FileSystem } from '../domain/entities/FileSystem';
import { CodeCompiler } from '../domain/usecases/CodeCompiler';
import { TelemetryPort } from '../domain/ports/TelemetryPort';

import { GameManager } from './GameManager';

export class GameCommandExecutor extends ExecuteCommand {
    private mailSystem: MailSystem;
    private compiler: CodeCompiler;
    private gameManager: GameManager;
    // private vimInstance: VimSimulator | null = null; // Removed in favor of EditorScreen

    constructor(fs: FileSystem, gameManager: GameManager, telemetry?: TelemetryPort) {
        super(fs, telemetry);
        this.mailSystem = new MailSystem(fs, telemetry);
        this.compiler = new CodeCompiler(fs, telemetry);
        this.gameManager = gameManager;
    }

    execute(commandString: string, state: TerminalState): CommandResponse {
        const parts = commandString.trim().split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1);

        // Vim handling moved to EditorScreen, this check is no longer needed in the main loop
        // as the terminal screen won't be active or handling input for vim.
        /*
        if (this.vimInstance) {
            ...
        }
        */

        if (command === 'mail') {
            return {
                output: this.mailSystem.listMail(),
                newState: state,
                exitCode: 0,
            };
        }

        if (command === 'check-comms') {
            const mail = this.gameManager.spawnNPCEvent();
            return {
                output: `[ SECURE CHANNEL ESTABLISHED ]\nIncoming transmission from ${mail.from}...\nMessage saved to /home/operator/mail/${mail.id}`,
                newState: state,
                exitCode: 0,
            };
        }

        if (command === 'compile') {
            const res = this.compiler.compile(args[0] || '');
            return {
                output: res.output,
                newState: state,
                exitCode: res.success ? 0 : 1,
            };
        }

        if (command === 'vim') {
            const filename = args[0] || 'scratchpad.24xx';
            // We do not lock the terminal here; the navigation will take the user away.
            // When they return, they return to the terminal state.
            return {
                output: `Opening ${filename} in editor...`,
                newState: state,
                exitCode: 0,
                navigationAction: {
                    type: 'NAVIGATE',
                    target: 'Editor',
                    params: { filename }
                }
            };
        }

        return super.execute(commandString, state);
    }
}
