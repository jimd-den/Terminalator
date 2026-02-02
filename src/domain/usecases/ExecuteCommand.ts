
import { FileSystem } from '../entities/FileSystem';
import { FileSystemService } from '../services/FileSystemService';
import { TerminalState } from '../entities/TerminalState';
import { TelemetryPort } from '../ports/TelemetryPort';
import { CommandRegistry } from '../commands/CommandRegistry';
import { ShellParser, ASTNode } from '../services/ShellParser';
import { IBinaryRunner } from '../interfaces/IBinaryRunner';
import { JobControlService } from '../services/JobControlService';
import { IdentityService } from '../services/IdentityService';
import { CommandResponse } from '../entities/Command';
import { IShellExecutor } from '../interfaces/IShellExecutor';
import { ShellExpansionService } from '../services/ShellExpansionService';
import { ShellInterpreter } from '../services/ShellInterpreter';
import { RedirectionService } from '../services/RedirectionService';
import { mergeState, fail } from '../utils/TerminalStateUtils';
import { NetworkMap } from '../services/NetworkMap';

/**
 * ExecuteCommand (Refactored Facade)
 * 
 * Adheres to:
 * - Clean Architecture: Orchestrates services (Interpreter, Parser).
 * - SRP: Delegation only. No parsing or execution logic.
 * - KISS: Simple implementation.
 */
export class ExecuteCommand implements IShellExecutor {
    private registry: CommandRegistry;
    private parser: ShellParser;
    protected service: FileSystemService;
    private expansionService: ShellExpansionService;
    protected fs: FileSystem;
    private jobControl: JobControlService;
    private identityService: IdentityService;
    private interpreter: ShellInterpreter;
    private redirectionService: RedirectionService;
    protected networkMap: NetworkMap;

    constructor(
        fsOrService: FileSystem | FileSystemService,
        protected telemetry?: TelemetryPort,
        registry?: CommandRegistry,
        protected binaryRunner?: IBinaryRunner,
        networkMap?: NetworkMap
    ) {
        if (fsOrService instanceof FileSystemService) {
            this.service = fsOrService;
            this.fs = (fsOrService as any).fs as FileSystem;
        } else {
            this.fs = fsOrService;
            this.service = new FileSystemService(this.fs);
        }

        this.networkMap = networkMap || new NetworkMap();
        this.parser = new ShellParser();
        this.expansionService = new ShellExpansionService(this.service);
        this.jobControl = new JobControlService();
        this.identityService = new IdentityService();
        this.redirectionService = new RedirectionService(this.service);

        if (registry) {
            this.registry = registry;
        } else {
            this.registry = new CommandRegistry();
        }

        // Default interpreter (will be overridden in execute if needed)
        this.interpreter = new ShellInterpreter(
            this.service,
            this.fs,
            this.registry,
            this.expansionService,
            this.jobControl,
            this.redirectionService,
            this.binaryRunner,
            () => this,
            this.networkMap
        );
    }

    getRegistry(): CommandRegistry {
        return this.registry;
    }


    private createInterpreter(fsService: FileSystemService): ShellInterpreter {
        return new ShellInterpreter(
            fsService,
            fsService.fileSystem, // Use the public getter
            this.registry,
            new ShellExpansionService(fsService),
            this.jobControl,
            new RedirectionService(fsService),
            this.binaryRunner,
            () => this,
            this.networkMap
        );
    }

    protected resolveInterpreter(state: TerminalState): ShellInterpreter {
        // 1. Local Context
        if (!state.fsContext || state.fsContext === 'localhost' || state.fsContext === 'terminalator') {
            return this.interpreter;
        }

        // 2. Remote Context (SSH)
        if (this.networkMap) {
            const remoteFs = this.networkMap.getSystem(state.fsContext);
            if (remoteFs) {
                if (this.telemetry) {
                    this.telemetry.info(`[ExecuteCommand] Switching to remote interpreter for host: ${state.fsContext}`);
                }
                const remoteService = new FileSystemService(remoteFs);
                return this.createInterpreter(remoteService);
            }
        }

        return this.interpreter;
    }

    async execute(input: string, state: TerminalState): Promise<CommandResponse> {
        const executeLogic = async (): Promise<CommandResponse> => {
            if (!input.trim()) return { output: '', exitCode: 0, newState: state, command: input };

            try {
                const ast = this.parser.parse(input);
                if (!ast) return { output: '', exitCode: 0, newState: state, command: input };

                const activeInterpreter = this.resolveInterpreter(state);
                let res = await activeInterpreter.visit(ast, state);

                res.command = input;

                // Handle EXIT Trap (Top Level)
                if (res.controlFlow === 'EXIT') {
                    // [FIX] SSH Logout Logic
                    if (state.fsContext) {
                        return {
                            ...res,
                            output: res.output + '\nConnection to ' + state.fsContext + ' closed.',
                            newState: {
                                ...(res.newState || state),
                                fsContext: undefined,
                                currentDirectory: '/home/operator', // Reset to local home
                                environment: {
                                    ...(res.newState?.environment || state.environment),
                                    USER: 'operator',
                                    HOSTNAME: 'terminalator'
                                }
                            },
                            controlFlow: undefined // Swallow the EXIT signal
                        };
                    }

                    const effectiveState = mergeState(state, res.newState);
                    const trapCmd = effectiveState.traps?.get('EXIT');

                    if (trapCmd) {
                        try {
                            const trapAst = this.parser.parse(trapCmd);
                            if (trapAst) {
                                const trapRes = await this.interpreter.visit(trapAst, effectiveState);
                                res.output += (res.output ? '\n' : '') + trapRes.output;
                                res.newState = mergeState(effectiveState, trapRes.newState);
                            }
                        } catch (e: any) {
                            res.output += `\nError running EXIT trap: ${e.message}`;
                        }
                    }
                }
                return { ...res, command: input };
            } catch (e: any) {
                return { ...fail(state, `sh: syntax error: ${e.message}`, 2), command: input };
            }
        };

        if (this.telemetry) {
            return this.telemetry.trace('ExecuteCommand.execute', executeLogic);
        }
        return executeLogic();
    }
}

