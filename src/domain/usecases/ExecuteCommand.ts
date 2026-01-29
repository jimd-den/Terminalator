
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

    constructor(
        fsOrService: FileSystem | FileSystemService,
        protected telemetry?: TelemetryPort,
        registry?: CommandRegistry,
        protected binaryRunner?: IBinaryRunner
    ) {
        if (fsOrService instanceof FileSystemService) {
            this.service = fsOrService;
            this.fs = (fsOrService as any).fs as FileSystem;
        } else {
            this.fs = fsOrService;
            this.service = new FileSystemService(this.fs);
        }

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

        this.interpreter = new ShellInterpreter(
            this.service,
            this.fs,
            this.registry,
            this.expansionService,
            this.jobControl,
            this.redirectionService,
            this.binaryRunner,
            () => this // Inject self as factory
        );
    }

    getRegistry(): CommandRegistry {
        return this.registry;
    }

    async execute(input: string, state: TerminalState): Promise<CommandResponse> {
        const executeLogic = async (): Promise<CommandResponse> => {
            if (!input.trim()) return { output: '', newState: state, exitCode: 0 };

            try {
                const ast = this.parser.parse(input);
                if (!ast) return { output: '', newState: state, exitCode: 0 };

                let res = await this.interpreter.visit(ast, state);

                // Handle EXIT Trap (Top Level)
                if (res.controlFlow === 'EXIT') {
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
                return res;
            } catch (e: any) {
                return fail(state, `sh: syntax error: ${e.message}`, 2);
            }
        };

        if (this.telemetry) {
            return this.telemetry.trace('ExecuteCommand.execute', executeLogic, input, state.currentDirectory);
        }
        return executeLogic();
    }
}

