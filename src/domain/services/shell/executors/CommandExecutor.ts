import { NodeExecutor } from '../NodeExecutor';
import { ASTNode, CommandNode, NodeType, FunctionDefNode } from '../../ShellParser';
import { TerminalState } from '../../../entities/TerminalState';
import { CommandResponse } from '../../../entities/Command';
import { ShellExpansionService } from '../../ShellExpansionService';
import { CommandRegistry } from '../../../commands/CommandRegistry';
import { JobControlService } from '../../JobControlService';
import { FileSystemService } from '../../FileSystemService';
import { FileSystem } from '../../../entities/FileSystem';
import { RedirectionService } from '../../RedirectionService';
import { IBinaryRunner } from '../../../interfaces/IBinaryRunner';
import { IShellExecutor } from '../../../interfaces/IShellExecutor';
import { ProcessContext } from '../../../entities/ProcessContext';
import { createStdinStream, createOutputStream } from '../../../entities/Stream';
import { mergeState, fail } from '../../../utils/TerminalStateUtils';
import { NetworkMap } from '../../NetworkMap';
import { SimulationBus, GameEventType, CommandExecutedPayload } from '../../SimulationBus';
import { EconomyService } from '../../EconomyService';

export class CommandExecutor implements NodeExecutor {
    constructor(
        private expansionService: ShellExpansionService,
        private registry: CommandRegistry,
        private jobControl: JobControlService,
        private fsService: FileSystemService,
        private fs: FileSystem,
        private redirectionService: RedirectionService,
        private bus?: SimulationBus,
        private binaryRunner?: IBinaryRunner,
        private executorFactory?: () => IShellExecutor,
        private networkMap?: NetworkMap,
        private economy?: EconomyService,
        private localFsService?: FileSystemService
    ) { }

    async execute(
        node: ASTNode,
        state: TerminalState,
        visitor: (node: ASTNode, state: TerminalState, stdin?: string) => Promise<CommandResponse>,
        stdin?: string
    ): Promise<CommandResponse> {
        if (node.type !== NodeType.COMMAND) {
            throw new Error('CommandExecutor can only handle COMMAND nodes');
        }

        const cmdNode = node as CommandNode;

        // 1. Expansion
        const expandedArgs: string[] = [];
        for (const arg of cmdNode.args) {
            const tokens = this.expansionService.expandToken(arg, state.environment, state.currentDirectory);
            expandedArgs.push(...tokens);
        }
        cmdNode.args = expandedArgs;

        const commandName = cmdNode.command;

        // 2. Function Check
        if (state.functions && state.functions.has(commandName)) {
            const res = await this.executeFunction(commandName, expandedArgs, state, visitor, stdin, cmdNode);
            this.emitCommandExecuted(commandName, expandedArgs, res, state.currentDirectory);
            return res;
        }

        // 3. Command Registry Check
        const command = this.registry.get(commandName);
        if (command) {
            try {
                const context: ProcessContext = {
                    fs: this.fs,
                    fileSystemService: this.fsService,
                    localFileSystemService: this.localFsService,
                    env: state.environment,
                    cwd: state.currentDirectory,
                    user: state.user,
                    stdin: createStdinStream(stdin),
                    stdout: createOutputStream(),
                    stderr: createOutputStream(),
                    stdinLegacy: stdin,
                    executor: this.executorFactory ? this.executorFactory() : {
                        execute: async (i, s) => {
                            throw new Error("Recursive execution not fully accessible in Interpreter context yet");
                        },
                        getRegistry: () => this.registry
                    } as IShellExecutor,
                    jobControl: this.jobControl,
                    networkMap: this.networkMap,
                    economy: this.economy
                };

                const res = await command.execute(expandedArgs, context, state);
                const finalRes = this.redirectionService.handleRedirections(res, cmdNode.redirects, state);
                finalRes.utility = commandName; // Set utility name (Phase 10 fix)
                this.emitCommandExecuted(commandName, expandedArgs, finalRes, state.currentDirectory);
                return finalRes;
            } catch (error: any) {
                const res = fail(state, `sh: ${commandName}: ${error.message}`);
                this.emitCommandExecuted(commandName, expandedArgs, res, state.currentDirectory);
                return res;
            }
        }

        // 4. File Execution
        if (commandName.startsWith('/') || commandName.startsWith('./') || commandName.startsWith('../')) {
            const res = await this.executeFile(commandName, expandedArgs, state, stdin);
            this.emitCommandExecuted(commandName, expandedArgs, res, state.currentDirectory);
            return res;
        }

        const finalFail = fail(state, `sh: command not found: ${commandName}`, 127);
        this.emitCommandExecuted(commandName, expandedArgs, finalFail, state.currentDirectory);
        return finalFail;
    }

    private emitCommandExecuted(command: string, args: string[], response: CommandResponse, cwd: string) {
        if (this.bus) {
            const payload: CommandExecutedPayload = {
                command,
                args,
                exitCode: response.exitCode || 0,
                output: response.output || '',
                cwd
            };
            this.bus.emit(GameEventType.COMMAND_EXECUTED, payload);
        }
    }

    private async executeFunction(
        name: string,
        args: string[],
        state: TerminalState,
        visitor: (node: ASTNode, state: TerminalState, stdin?: string) => Promise<CommandResponse>,
        stdin: string | undefined,
        node: CommandNode
    ): Promise<CommandResponse> {
        const funcNode = state.functions?.get(name) as FunctionDefNode;

        const newEnv = { ...state.environment };
        // Positional Params
        args.forEach((arg, i) => newEnv[(i + 1).toString()] = arg);
        newEnv['#'] = args.length.toString();
        newEnv['@'] = args.join(' ');
        newEnv['*'] = args.join(' ');

        const funcState = mergeState(state, {
            environment: newEnv,
            callStackDepth: (state.callStackDepth || 0) + 1
        });

        const res = await visitor(funcNode.body, funcState, stdin);

        // Restore Environment
        const restoredEnv = { ...res.newState?.environment || state.environment };
        for (let i = 1; i <= 9; i++) {
            const key = i.toString();
            if (state.environment[key]) restoredEnv[key] = state.environment[key];
            else delete restoredEnv[key];
        }

        const finalState = mergeState(state, {
            ...res.newState,
            environment: restoredEnv
        });

        const flow = res.controlFlow === 'RETURN' ? undefined : res.controlFlow;

        let finalRes: CommandResponse = {
            ...res,
            newState: finalState,
            controlFlow: flow
        };

        if (funcNode.redirects) finalRes = this.redirectionService.handleRedirections(finalRes, funcNode.redirects, state);
        return this.redirectionService.handleRedirections(finalRes, node.redirects, state);
    }

    private async executeFile(path: string, args: string[], state: TerminalState, stdin?: string): Promise<CommandResponse> {
        const dentry = this.fsService.resolve(path, state.currentDirectory, true, state.user);

        if (dentry && !this.fsService.isDirectory(dentry)) {
            let content: Uint8Array;
            try {
                content = this.fsService.readFileBuffer(this.fsService.getAbsolutePath(dentry));
            } catch (e) {
                return fail(state, `sh: ${path}: cannot read file`, 126);
            }

            const isWasm = (content.length >= 4 && content[0] === 0x00 && content[1] === 0x61 && content[2] === 0x73 && content[3] === 0x6d);
            const isElf = (content.length >= 4 && content[0] === 0x7f && content[1] === 0x45 && content[2] === 0x4c && content[3] === 0x46);

            if (isWasm || isElf) {
                if (this.binaryRunner) {
                    try {
                        const res = await this.binaryRunner.run(content, args, {
                            stdin: createStdinStream(stdin),
                            stdout: createOutputStream(),
                            stderr: createOutputStream(),
                            fs: this.fsService,
                            env: state.environment
                        });
                        return { ...res, newState: mergeState(state, res.newState) };
                    } catch (e: any) {
                        return fail(state, `sh: ${path}: cannot execute binary: ${e.message}`, 126);
                    }
                }
                return fail(state, `sh: ${path}: cannot execute binary file (No Runner)`, 126);
            } else {
                return fail(state, `sh: ${path}: Shell Scripts not supported in Interpreter directly yet (Needs recursive parsing)`, 126);
            }
        }
        return fail(state, `sh: ${path}: No such file or directory`, 127);
    }
}
