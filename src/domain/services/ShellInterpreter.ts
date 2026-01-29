
import { ASTNode, NodeType, ListNode, PipelineNode, CommandNode, SubshellNode, FunctionDefNode, IfNode, ForNode, WhileNode } from './ShellParser';
import { TerminalState } from '../entities/TerminalState';
import { CommandResponse } from '../entities/Command';
import { FileSystemService } from './FileSystemService';
import { ShellExpansionService } from './ShellExpansionService';
import { CommandRegistry } from '../commands/CommandRegistry';
import { JobControlService } from './JobControlService';
import { IBinaryRunner } from '../interfaces/IBinaryRunner';
import { RedirectionService } from './RedirectionService';
import { ProcessContext } from '../entities/ProcessContext';
import { createStdinStream, createOutputStream } from '../entities/Stream';
import { mergeState, updateExitCode, success, fail } from '../utils/TerminalStateUtils';
import { FileSystem } from '../entities/FileSystem';
import { IShellExecutor } from '../interfaces/IShellExecutor';

type NodeHandler = (node: ASTNode, state: TerminalState, stdin?: string) => Promise<CommandResponse>;

/**
 * ShellInterpreter - Core AST Traversal Engine
 * 
 * Uses a Registry of Handlers (Metaprogramming) instead of large switch/case blocks.
 * Adheres to OCP: New node types can be added by registering a new handler.
 */
export class ShellInterpreter {
    private handlers: Map<NodeType, NodeHandler> = new Map();

    constructor(
        private fsService: FileSystemService,
        private fs: FileSystem,
        private registry: CommandRegistry,
        private expansionService: ShellExpansionService,
        private jobControl: JobControlService,
        private redirectionService: RedirectionService,
        private binaryRunner?: IBinaryRunner,
        private executorFactory?: () => IShellExecutor // Circular dependency resolution
    ) {
        this.registerHandlers();
    }

    /**
     * Entry point for AST traversal.
     */
    public async visit(node: ASTNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        const handler = this.handlers.get(node.type);
        if (!handler) {
            throw new Error(`Unknown AST Node Type: ${node.type}`);
        }
        return handler(node, state, stdin);
    }

    private registerHandlers() {
        this.handlers.set(NodeType.LIST, this.visitList.bind(this));
        this.handlers.set(NodeType.PIPELINE, this.visitPipeline.bind(this));
        this.handlers.set(NodeType.COMMAND, this.visitCommand.bind(this));
        this.handlers.set(NodeType.SUBSHELL, this.visitSubshell.bind(this));
        this.handlers.set(NodeType.FUNCTION_DEF, this.visitFunctionDef.bind(this));
        this.handlers.set(NodeType.BLOCK, this.visitBlock.bind(this));
        this.handlers.set(NodeType.IF, this.visitIf.bind(this));
        this.handlers.set(NodeType.FOR, this.visitFor.bind(this));
        this.handlers.set(NodeType.WHILE, this.visitWhile.bind(this));
    }

    private async visitBlock(node: ASTNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        // Block is just a wrapper around a body
        return this.visit((node as any).body, state, stdin);
    }

    private async visitList(node: ASTNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        const listNode = node as ListNode;
        const leftRes = await this.visit(listNode.left, state, stdin);

        // Control flow check (Break/Continue/Return)
        if (leftRes.controlFlow) return leftRes;

        let runRight = false;
        if (listNode.operator === ';') runRight = true;
        else if (listNode.operator === '&&') runRight = (leftRes.exitCode === 0);
        else if (listNode.operator === '||') runRight = (leftRes.exitCode !== 0);

        if (runRight) {
            const effectiveLeftState = mergeState(state, leftRes.newState);
            // Persist exit code
            if (leftRes.newState) effectiveLeftState.lastExitCode = leftRes.exitCode;

            const rightRes = await this.visit(listNode.right, effectiveLeftState, stdin);

            return {
                output: [leftRes.output, rightRes.output].filter(s => s).join(''),
                newState: mergeState(effectiveLeftState, rightRes.newState), // Check merge
                exitCode: rightRes.exitCode,
                uiAction: rightRes.uiAction || leftRes.uiAction,
                navigationAction: rightRes.navigationAction || leftRes.navigationAction,
                controlFlow: rightRes.controlFlow
            };
        }

        return leftRes;
    }

    private async visitPipeline(node: ASTNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        const pipeNode = node as PipelineNode;
        let currentState = state;
        let currentInput = stdin;
        let lastExitCode = 0;
        let finalUiAction;
        let finalNavAction;
        let finalOutput = '';

        for (let i = 0; i < pipeNode.parts.length; i++) {
            const part = pipeNode.parts[i];
            const isLast = i === pipeNode.parts.length - 1;

            const res = await this.visit(part, currentState, currentInput);

            currentInput = res.output;
            currentState = mergeState(currentState, res.newState);
            lastExitCode = res.exitCode;
            currentState.lastExitCode = res.exitCode;

            if (isLast) finalOutput = res.output;
            if (res.uiAction) finalUiAction = res.uiAction;
            if (res.navigationAction) finalNavAction = res.navigationAction;
            if (res.controlFlow === 'RETURN') return res;
        }

        return {
            output: finalOutput,
            newState: currentState,
            exitCode: lastExitCode,
            uiAction: finalUiAction,
            navigationAction: finalNavAction
        };
    }

    private async visitCommand(node: ASTNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        const cmdNode = node as CommandNode;

        // 1. Expansion
        const expandedArgs: string[] = [];
        for (const arg of cmdNode.args) {
            const tokens = this.expansionService.expandToken(arg, state.environment, state.currentDirectory);
            expandedArgs.push(...tokens);
        }
        cmdNode.args = expandedArgs; // Update node args for consistency? Or mostly for execution.

        const commandName = cmdNode.command;

        // 2. Function Check
        if (state.functions && state.functions.has(commandName)) {
            return this.executeFunction(commandName, expandedArgs, state, stdin, cmdNode);
        }

        // 3. Command Registry Check
        const command = this.registry.get(commandName);
        if (command) {
            try {
                const context: ProcessContext = {
                    fs: this.fs,
                    fileSystemService: this.fsService,
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
                    // Note: 'executor' in ProcessContext is typed as IShellExecutor which demands execute(). 
                    // This is a circular dependency issue. Ideally ProcessContext shouldn't need full executor, or we pass a thunk.
                    // For now, we will leave the recursive execute unimplemented here or fix later.
                    // Actually, ExecuteCommand wraps this interpreter. We might need to pass the facade in.
                    jobControl: this.jobControl
                };

                // Fix executor reference later.
                const res = await command.execute(expandedArgs, context, state);
                return this.redirectionService.handleRedirections(res, cmdNode.redirects, state);
            } catch (error: any) {
                return fail(state, `sh: ${commandName}: ${error.message}`);
            }
        }

        // 4. File Execution
        if (commandName.startsWith('/') || commandName.startsWith('./') || commandName.startsWith('../')) {
            return this.executeFile(commandName, expandedArgs, state, stdin);
        }

        return fail(state, `sh: command not found: ${commandName}`, 127);
    }

    private async executeFunction(name: string, args: string[], state: TerminalState, stdin: string | undefined, node: CommandNode): Promise<CommandResponse> {
        const funcNode = state.functions.get(name) as FunctionDefNode;

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

        const res = await this.visit(funcNode.body, funcState, stdin);

        // Restore Environment (remove locals/positionals), preserve globals
        // BUT keep side effects.
        // Simplified logic: restore positional params of CALLER.
        const restoredEnv = { ...res.newState?.environment || state.environment };
        // (Complex logic omitted for brevity matching ExecuteCommand... ideally we scope env properly)
        // For now, we return result as-is but caller should handle env restoration if we were strict.
        // Let's implement basic restoration of $1 etc from original state.
        for (let i = 1; i <= 9; i++) {
            const key = i.toString();
            if (state.environment[key]) restoredEnv[key] = state.environment[key];
            else delete restoredEnv[key];
        }

        const finalState = mergeState(state, {
            ...res.newState,
            environment: restoredEnv
        });

        // Consume RETURN
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
            // Permission check omitted for brevity (assume 755)
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
                // Script Execution
                const text = new TextDecoder().decode(content);
                // Simple recursion parsing
                // To avoid circular dependency on Parser, we accept that Interpreter interprets AST.
                // But we need to Parse text -> AST.
                // ShellInterpreter doesn't have a Parser.
                // The Facade (ExecuteCommand) has the Parser.
                // SOLUTION: ShellInterpreter should accept an external "ScriptRunner" or callback?
                // Or inject Parser?
                // For now, let's fail gracefully or rely on the Facade to handle script parsing if we structure differently.
                // Ideally: Interpreter only executes AST. Loader (Facade) handles Text -> AST.
                return fail(state, `sh: ${path}: Shell Scripts not supported in Interpreter directly yet (Needs recursive parsing)`, 126);
            }
        }
        return fail(state, `sh: ${path}: No such file or directory`, 127);
    }

    private async visitSubshell(node: ASTNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        const subNode = node as SubshellNode;
        // Subshell = clone state (env changes lost) but FS changes persist
        const subState = mergeState(state, { environment: { ...state.environment } });
        const res = await this.visit(subNode.root, subState, stdin);

        return { ...res, newState: state }; // Discard env changes
    }

    private async visitFunctionDef(node: ASTNode, state: TerminalState): Promise<CommandResponse> {
        const funcNode = node as FunctionDefNode;
        const newFunctions = new Map(state.functions);
        newFunctions.set(funcNode.name, funcNode);
        return success(mergeState(state, { functions: newFunctions }));
    }

    private async visitIf(node: ASTNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        const ifNode = node as IfNode;
        const condRes = await this.visit(ifNode.condition, state, stdin);

        if (condRes.exitCode === 0) {
            const thenState = mergeState(state, condRes.newState);
            const res = await this.visit(ifNode.thenBody, thenState, stdin);
            return { ...res, output: condRes.output + res.output };
        } else if (ifNode.elseBody) {
            const elseState = mergeState(state, condRes.newState);
            const res = await this.visit(ifNode.elseBody, elseState, stdin);
            return { ...res, output: condRes.output + res.output };
        }

        return { output: condRes.output, newState: mergeState(state, condRes.newState), exitCode: 0 };
    }

    private async visitFor(node: ASTNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        const forNode = node as ForNode;
        // Expansion: Use Service (DRY Fix)
        const expandedItems: string[] = [];
        for (const item of forNode.items) {
            const tokens = this.expansionService.expandToken(item, state.environment, state.currentDirectory);
            expandedItems.push(...tokens);
        }

        let currentState = state;
        let output = '';
        let lastExitCode = 0;

        for (const val of expandedItems) {
            const newEnv = { ...currentState.environment, [forNode.variable]: val };
            currentState = mergeState(currentState, { environment: newEnv });

            const res = await this.visit(forNode.body, currentState, stdin);
            currentState = mergeState(currentState, res.newState);
            output += res.output;
            lastExitCode = res.exitCode;

            if (res.controlFlow === 'BREAK') { currentState.lastExitCode = 0; break; }
            if (res.controlFlow === 'CONTINUE') continue;
            if (res.controlFlow === 'RETURN') return { ...res, newState: currentState, output };
        }

        return { output, newState: currentState, exitCode: lastExitCode };
    }

    private async visitWhile(node: ASTNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        const whileNode = node as WhileNode;
        let currentState = state;
        let output = '';
        let lastExitCode = 0;
        let iterations = 0;
        const MAX = 1000;

        while (iterations < MAX) {
            const condRes = await this.visit(whileNode.condition, currentState, stdin);
            output += condRes.output;
            currentState = mergeState(currentState, condRes.newState);

            if (condRes.exitCode !== 0) break;

            const bodyRes = await this.visit(whileNode.body, currentState, stdin);
            currentState = mergeState(currentState, bodyRes.newState);
            output += bodyRes.output;
            lastExitCode = bodyRes.exitCode;

            if (bodyRes.controlFlow === 'BREAK') break;
            if (bodyRes.controlFlow === 'RETURN') return { ...bodyRes, newState: currentState, output };
            iterations++;
        }
        return { output, newState: currentState, exitCode: lastExitCode };
    }
}
