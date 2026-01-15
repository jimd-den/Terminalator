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
import { VimSimulator } from './VimSimulator';
import { CodeCompiler } from '../domain/usecases/CodeCompiler';

import { GameManager } from './GameManager';

export class GameCommandExecutor extends ExecuteCommand {
    private mailSystem: MailSystem;
    private compiler: CodeCompiler;
    private gameManager: GameManager;
    private vimInstance: VimSimulator | null = null;

    constructor(fs: FileSystem, gameManager: GameManager) {
        super(fs);
        this.mailSystem = new MailSystem(fs);
        this.compiler = new CodeCompiler(fs);
        this.gameManager = gameManager;
    }

    execute(commandString: string, state: TerminalState): CommandResponse {
        const parts = commandString.trim().split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1);

        // If vim is active, input goes to vim
        if (this.vimInstance) {
            const result = this.vimInstance.handleInput(commandString);
            if (result.output.includes('Vim closed')) {
                this.vimInstance = null;
                return {
                    output: 'Vim session terminated.',
                    newState: { ...state, isLocked: false },
                    exitCode: 0,
                };
            }
            return {
                output: result.output.join('\n'),
                newState: state,
                exitCode: 0,
            };
        }

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
            const path = state.currentDirectory === '/' ? `/${filename}` : `${state.currentDirectory}/${filename}`;
            const node = this.fs.getNode(path);
            const content = node?.content || '';

            this.vimInstance = new VimSimulator(filename, content);
            return {
                output: `VIM v8.2 simulation active.\nEditing ${filename}...\n[Type 'i' for insert, ':' for commands]`,
                newState: { ...state, isLocked: true },
                exitCode: 0,
            };
        }

        return super.execute(commandString, state);
    }
}

