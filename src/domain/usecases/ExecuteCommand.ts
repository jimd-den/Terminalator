
import { FileSystem } from '../entities/FileSystem';
import { FileSystemService } from '../services/FileSystemService';
import { TerminalState } from '../entities/TerminalState';
import { TelemetryPort } from '../ports/TelemetryPort';
import { CommandRegistry } from '../commands/CommandRegistry';
import { ShellParser, ASTNode, NodeType, CommandNode, ListNode, PipelineNode, SubshellNode, FunctionDefNode, RedirectNode, IfNode, ForNode, WhileNode } from '../services/ShellParser';
import { IBinaryRunner } from '../interfaces/IBinaryRunner';
import { ProcessContext } from '../entities/ProcessContext';
import { createStdinStream, createOutputStream } from '../entities/Stream';
import { JobControlService } from '../services/JobControlService';
import { IdentityService } from '../services/IdentityService';

export interface CommandResponse {
    output: string;
    newState: TerminalState;
    exitCode: number;
    uiAction?: 'CLEAR';
    navigationAction?: {
        type: 'NAVIGATE';
        target: string;
        params?: any;
    };
    controlFlow?: 'RETURN' | 'BREAK' | 'CONTINUE' | 'EXIT';
}

import { IShellExecutor } from '../interfaces/IShellExecutor';

import { ShellExpansionService } from '../services/ShellExpansionService';

export class ExecuteCommand implements IShellExecutor {
    private registry: CommandRegistry;
    private parser: ShellParser;
    protected service: FileSystemService;
    private expansionService: ShellExpansionService;
    protected fs: FileSystem;
    private jobControl: JobControlService;
    private identityService: IdentityService;

    constructor(
        fsOrService: FileSystem | FileSystemService,
        protected telemetry?: TelemetryPort,
        registry?: CommandRegistry,
        protected binaryRunner?: IBinaryRunner
    ) {
        if (fsOrService instanceof FileSystemService) {
            this.service = fsOrService;
            // But CoreUtilsModule needs FS.
            this.fs = (fsOrService as any).fs as FileSystem;
        } else {
            this.fs = fsOrService;
            this.service = new FileSystemService(this.fs);
        }

        this.parser = new ShellParser();
        this.expansionService = new ShellExpansionService(this.service);
        this.jobControl = new JobControlService();
        this.identityService = new IdentityService();

        if (registry) {
            this.registry = registry;
        } else {
            this.registry = new CommandRegistry();
        }
    }

    getRegistry(): CommandRegistry {
        return this.registry;
    }

    async execute(input: string, state: TerminalState): Promise<CommandResponse> {
        // state.fs was removed. FS access is via ProcessContext.

        const executeLogic = async (): Promise<CommandResponse> => {
            if (!input.trim()) return { output: '', newState: state, exitCode: 0 };

            try {
                const ast = this.parser.parse(input);
                if (!ast) return { output: '', newState: state, exitCode: 0 };

                let res = await this.visit(ast, state);

                // Handle EXIT Trap
                if (res.controlFlow === 'EXIT') {
                    const trapCmd = res.newState.traps ? res.newState.traps.get('EXIT') : undefined;
                    if (trapCmd) {
                        try {
                            const trapAst = this.parser.parse(trapCmd);
                            if (trapAst) {
                                const trapRes = await this.visit(trapAst, res.newState);
                                res.output += (res.output ? '\n' : '') + trapRes.output;
                                res.newState = trapRes.newState;
                            }
                        } catch (e: any) {
                            res.output += `\nError running EXIT trap: ${e.message}`;
                        }
                    }
                }
                return res;
            } catch (e: any) {
                return {
                    output: `sh: syntax error: ${e.message}`,
                    newState: state,
                    exitCode: 2
                };
            }
        };

        if (this.telemetry) {
            return this.telemetry.trace('ExecuteCommand.execute', executeLogic, input, state.currentDirectory);
        }
        return executeLogic();
    }

    // --- AST Traversal (Visitor) ---

    private async visit(node: ASTNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        switch (node.type) {
            case NodeType.LIST:
                return this.visitList(node as ListNode, state, stdin);
            case NodeType.PIPELINE:
                return this.visitPipeline(node as PipelineNode, state, stdin);
            case NodeType.COMMAND:
                return this.visitCommand(node as CommandNode, state, stdin);
            case NodeType.SUBSHELL:
                return this.visitSubshell(node as SubshellNode, state, stdin);
            case NodeType.FUNCTION_DEF:
                return this.visitFunctionDef(node as FunctionDefNode, state);
            case NodeType.BLOCK:
                // Block is just a list executed in current context
                return this.visit((node as any).body, state, stdin);
            case NodeType.IF:
                return this.visitIf(node as IfNode, state, stdin);
            case NodeType.FOR:
                return this.visitFor(node as ForNode, state, stdin);
            case NodeType.WHILE:
                return this.visitWhile(node as WhileNode, state, stdin);
            default:
                throw new Error(`Unknown AST Node Type: ${node.type}`);
        }
    }

    private async visitList(node: ListNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        // Execute left
        const leftRes = await this.visit(node.left, state, stdin);

        // Persist exit code to state so subsequent commands can read it (e.g. return)
        leftRes.newState.lastExitCode = leftRes.exitCode;

        // Check for control flow interrupt (return, break, continue)
        if (leftRes.controlFlow) {
            return leftRes;
        }

        // Logic check
        let runRight = false;
        if (node.operator === ';') {
            runRight = true;
        } else if (node.operator === '&&') {
            runRight = (leftRes.exitCode === 0);
        } else if (node.operator === '||') {
            runRight = (leftRes.exitCode !== 0);
        }

        if (runRight) {
            // Pass accumulated output? Usually standard shell separates output streams.
            // But checking verify_return_compliance, we might want to capture output?
            // "sh" behavior: output is printed as it happens. 
            // Here we concatenate strings for the response.
            const rightRes = await this.visit(node.right, leftRes.newState, stdin); // stdin usually not passed across ;

            // Persist right exit code too
            rightRes.newState.lastExitCode = rightRes.exitCode;

            return {
                output: [leftRes.output, rightRes.output].filter(s => s).join(''),
                newState: rightRes.newState,
                exitCode: rightRes.exitCode,
                uiAction: rightRes.uiAction || leftRes.uiAction,
                navigationAction: rightRes.navigationAction || leftRes.navigationAction,
                controlFlow: rightRes.controlFlow
            };
        }

        return leftRes;
    }

    private async visitPipeline(node: PipelineNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        let currentState = state;
        let currentInput = stdin;
        let lastExitCode = 0;
        let finalUiAction;
        let finalNavAction;
        let finalOutput = '';

        // Process pipeline stages sequentially (serial emulation)
        // Each stage's stdout becomes next stage's stdin via string passing
        for (let i = 0; i < node.parts.length; i++) {
            const isLast = i === node.parts.length - 1;
            const part = node.parts[i];

            const res = await this.visit(part, currentState, currentInput);

            // Pass output to next stage as stdin
            currentInput = res.output;
            currentState = res.newState;
            lastExitCode = res.exitCode;
            currentState.lastExitCode = res.exitCode;

            // Only last command's output goes to final result
            if (isLast) {
                finalOutput = res.output;
            }

            if (res.uiAction) finalUiAction = res.uiAction;
            if (res.navigationAction) finalNavAction = res.navigationAction;

            if (res.controlFlow === 'RETURN') {
                return res;
            }
        }

        currentState.lastExitCode = lastExitCode;

        return {
            output: finalOutput,
            newState: currentState,
            exitCode: lastExitCode,
            uiAction: finalUiAction,
            navigationAction: finalNavAction
        };
    }

    private async visitSubshell(node: SubshellNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        // Subshells should ideally clone the state environment so changes don't persist
        // But FS changes DO persist.
        const subState = {
            ...state,
            environment: { ...state.environment }
        };

        const res = await this.visit(node.root, subState, stdin);

        // Return original state (so env changes are lost), but keep FS changes (implied by service usage)
        return {
            ...res,
            newState: state
        };
    }

    private async visitFunctionDef(node: FunctionDefNode, state: TerminalState): Promise<CommandResponse> {
        // Definition: Store in state.functions
        const newFunctions = new Map(state.functions);
        newFunctions.set(node.name, node);

        state.functions = newFunctions;

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }

    private async visitIf(node: IfNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        // Run condition
        // Condition is a List, so it runs commands. Exit code of last command determines truth.
        // 0 = true, non-0 = false
        // 0 = true, non-0 = false
        // 0 = true, non-0 = false
        // console.log("[DEBUG] visitIf Condition: ", JSON.stringify(node.condition));
        const condRes = await this.visit(node.condition, state, stdin);
        // console.log("[DEBUG] visitIf Condition Result: " + condRes.exitCode);

        let finalRes: CommandResponse;

        if (condRes.exitCode === 0) {
            // Run THEN
            finalRes = await this.visit(node.thenBody, condRes.newState, stdin);
        } else if (node.elseBody) {
            // Run ELSE
            finalRes = await this.visit(node.elseBody, condRes.newState, stdin);
        } else {
            // No else, condition false -> exit code 0
            finalRes = {
                output: '',
                newState: condRes.newState,
                exitCode: 0
            };
        }

        // Propagate output from condition?
        // Usually 'if' output includes condition output? Yes.
        // "The exit status is the exit status of the last command executed, or zero if no condition tested true."
        return {
            ...finalRes,
            output: condRes.output + finalRes.output
        };
    }

    private async visitFor(node: ForNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        // Expand items. Items are words.
        // We need to expand them? Yes.
        // "The words are expanded, and then the list of words..."
        // Simplified expansion here (State doesn't have robust expansion service yet, reusing simplified logic or assumption)
        // For now, assume items are already tokens or raw strings needing variable expansion.

        const expandedItems: string[] = [];
        for (const item of node.items) {
            // Basic variable expansion
            const exp = item.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*|[0-9]+|[#@*?])/g, (match, varName) => {
                return state.environment[varName] || '';
            });
            // Split by space (simplified word splitting)
            // POSIX requires IFS splitting. We assume space.
            const parts = exp.split(/\s+/).filter(s => s.length > 0);
            expandedItems.push(...parts);
        }

        // If items empty? "If 'in word' is omitted, positional params are used."
        // Our parser handles 'in'. If empty list, loop doesn't run.

        let currentState = state;
        let cumulativeOutput = '';
        let lastExitCode = 0;

        for (const val of expandedItems) {
            // Set variable
            const newEnv = { ...currentState.environment, [node.variable]: val };
            currentState = { ...currentState, environment: newEnv };

            const res = await this.visit(node.body, currentState, stdin);
            currentState = res.newState;
            cumulativeOutput += res.output;
            lastExitCode = res.exitCode;

            // Handle Break/Continue (if implemented in CommandResponse controlFlow)
            if (res.controlFlow === 'BREAK') {
                currentState = { ...currentState, lastExitCode: 0 };
                break;
            }
            if (res.controlFlow === 'CONTINUE') {
                continue; // Next iteration
            }
            if (res.controlFlow === 'RETURN') {
                return { ...res, output: cumulativeOutput }; // Bubble up return
            }
        }

        return {
            output: cumulativeOutput,
            newState: currentState,
            exitCode: lastExitCode
        };
    }

    private async visitWhile(node: WhileNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        let currentState = state;
        let cumulativeOutput = '';
        let lastExitCode = 0;

        // Loop limit to prevent infinite loops in valid test harness?
        let iterations = 0;
        const MAX_LOOPS = 1000;

        while (iterations < MAX_LOOPS) {
            const condRes = await this.visit(node.condition, currentState, stdin);
            cumulativeOutput += condRes.output;
            currentState = condRes.newState;

            if (condRes.exitCode !== 0) {
                // False, broken loop
                break;
            }

            // True, run body
            const bodyRes = await this.visit(node.body, currentState, stdin);
            currentState = bodyRes.newState;
            cumulativeOutput += bodyRes.output;
            lastExitCode = bodyRes.exitCode;

            // Handle Break/Continue
            if (bodyRes.controlFlow === 'BREAK') break;
            if (bodyRes.controlFlow === 'RETURN') return { ...bodyRes, output: cumulativeOutput };

            iterations++;
        }

        return {
            output: cumulativeOutput,
            newState: currentState,
            exitCode: lastExitCode
        };
    }

    private async handleRedirections(result: CommandResponse, redirects: RedirectNode[], state: TerminalState): Promise<CommandResponse> {
        if (!redirects || redirects.length === 0) return result;

        for (const redir of redirects) {
            if (redir.op === '>' || redir.op === '>>') {
                if (result.output !== undefined) {
                    const content = result.output;
                    const mode = redir.op === '>>' ? 'a' : 'w';
                    this.service.writeFile(redir.file, content, mode, state.user.uid, state.user.gid, state.currentDirectory, state.user);
                }
                result.output = '';
            }
        }
        return result;
    }

    private async visitCommand(node: CommandNode, state: TerminalState, stdin?: string): Promise<CommandResponse> {
        // Expansion using Service
        const expandedArgs: string[] = [];

        for (const arg of node.args) {
            const tokens = this.expansionService.expandToken(arg, state.environment, state.currentDirectory);
            expandedArgs.push(...tokens);
        }

        // Update args for execution
        node.args = expandedArgs;

        const commandName = node.command;

        // 0. Check for Function
        if (state.functions && state.functions.has(commandName)) {
            const funcNode = state.functions.get(commandName) as FunctionDefNode;
            // Execute function body
            // We need to map args to $1, $2...
            // And potentially save old args to restore?
            // "When a function is executed, the arguments to the function become the positional parameters..."
            // We don't have a sophisticated Positional Parameter stack in TerminalState yet.
            // But we can patch ProcessContext or Environment?
            // POSIX says: Special parameters #, *, @, and positional params 1, 2... are temporarily replaced.
            // 0 is NOT unchanged (it's the shell name or script name), but for function it might return the function name? No, usually $0 is unchanged.

            // NOTE: Since our Environment is a simple map, strict positional params $1..$N are not yet first-class in State.
            // However, `ProcessContext` has `executor` and `state`.
            // We need to implement Argument expansion in `visitCommand` (already done above matching $var).
            // But how does `visitCommand` know $1? It reads from `state.environment`.

            // So we must temporarily override $1, $2... in the environment passed to the function body.

            const funcArgs = expandedArgs;
            const previousEnv = { ...state.environment };
            const newEnv = { ...state.environment };

            // Set $1..$N
            funcArgs.forEach((arg, index) => {
                newEnv[(index + 1).toString()] = arg;
            });
            newEnv['#'] = funcArgs.length.toString();
            newEnv['@'] = funcArgs.join(' ');
            newEnv['*'] = funcArgs.join(' ');

            // Clear remaining if previous existed? e.g. if we had $5 but now only 2 args.
            // Simple loop to clear reasonable amount or assume implementation detail.
            // For now, let's just set what we have. (Wait, if outer had $1, inner must overwrite it).
            // We should clear keys that are numeric?
            // It's cleaner to handle this by "Stacking" the environment?
            // But `TerminalState` has a single environment map.
            // We will create a scoped state for execution.

            const funcState = {
                ...state,
                environment: newEnv,
                callStackDepth: (state.callStackDepth || 0) + 1
            };

            const res = await this.visit(funcNode.body, funcState, stdin);

            // Function execution usually runs in current shell context (side effects persist).
            // EXCEPT for positional params.
            // So we return the `newState` from result, BUT we must restore the positional params of the caller.

            // However, side-effects to OTHER variables ($VAR) must remain.
            // So we take `res.newState.environment`, and RESTORE the positional params from `previousEnv`.

            const restoredEnv = { ...res.newState.environment };
            // Restore special params
            ['#', '@', '*'].forEach(k => {
                if (previousEnv[k] !== undefined) restoredEnv[k] = previousEnv[k];
                else delete restoredEnv[k];
            });
            // Restore numeric params. Heuristic: Check up to 100 or check keys?
            // For safety, let's just iterate logical keys if we could. 
            // Better: Identify keys changed/added for args.
            // Simplified: Restore 1-9 for now.
            for (let i = 1; i <= 9; i++) {
                const k = i.toString();
                if (previousEnv[k] !== undefined) restoredEnv[k] = previousEnv[k];
                else delete restoredEnv[k];
            }

            // Handle `return n` control flow
            // If function executed `return n`, `res.controlFlow` will be 'RETURN'.
            // We should consume it (stop generic control flow) and set exitCode.

            let exitCode = res.exitCode;
            // If implicit return (no return command), exitCode is last command's.

            // Consumed control flow
            const finalState = { ...res.newState, environment: restoredEnv, callStackDepth: state.callStackDepth };

            // Suppress RETURN, but propagate BREAK/CONTINUE
            const flow = res.controlFlow === 'RETURN' ? undefined : res.controlFlow;

            let finalRes: CommandResponse = {
                output: res.output,
                newState: finalState,
                exitCode: exitCode,
                uiAction: res.uiAction,
                navigationAction: res.navigationAction,
                controlFlow: flow
            };

            // Apply Function Definition Redirections
            if (funcNode.redirects && funcNode.redirects.length > 0) {
                finalRes = await this.handleRedirections(finalRes, funcNode.redirects, state);
            }

            return this.handleRedirections(finalRes, node.redirects, state);
        }

        const command = this.registry.get(commandName);

        // 1. Builtin/Command found
        if (command) {
            try {
                // Create stream-based ProcessContext
                const stdinStream = createStdinStream(stdin);
                const stdoutStream = createOutputStream();
                const stderrStream = createOutputStream();

                const context: ProcessContext = {
                    fs: this.fs,
                    fileSystemService: this.service,
                    env: state.environment,
                    cwd: state.currentDirectory,
                    user: state.user,
                    stdin: stdinStream,
                    stdout: stdoutStream,
                    stderr: stderrStream,
                    stdinLegacy: stdin,  // Backward compatibility
                    executor: this,
                    jobControl: this.jobControl
                };
                const res = await command.execute(expandedArgs, context, state);
                return this.handleRedirections(res, node.redirects, state);
            } catch (error: any) {
                return { output: `sh: ${commandName}: ${error.message}`, newState: state, exitCode: 1 };
            }
        }

        // 2. File Execution
        if (commandName.startsWith('/') || commandName.startsWith('./') || commandName.startsWith('../')) {
            const dentry = this.service.resolve(commandName, state.currentDirectory, true, state.user);
            if (dentry && !this.service.isDirectory(dentry)) {
                // 1. Check Permissions
                // In a real implementation: this.service.access(commandName, X_OK)
                const inode = this.service.getInode(dentry.inodeId);
                // Simplified Check: assume 755 or owner exec
                // (inode.mode & 0o100)

                // 2. Read Content (as Buffer for detection)
                let content: Uint8Array;
                try {
                    content = this.service.readFileBuffer(this.service.getAbsolutePath(dentry));
                } catch (e) {
                    return { output: `sh: ${commandName}: cannot read file`, newState: state, exitCode: 126 };
                }

                // 3. Detect Format
                // Check Magic Header (WASM or ELF)
                const isWasm = (content.length >= 4 && content[0] === 0x00 && content[1] === 0x61 && content[2] === 0x73 && content[3] === 0x6d);
                const isElf = (content.length >= 4 && content[0] === 0x7f && content[1] === 0x45 && content[2] === 0x4c && content[3] === 0x46);

                if (isWasm || isElf) {
                    // Binary Execution
                    if (this.binaryRunner) {
                        try {
                            const res = await this.binaryRunner.run(content, expandedArgs, {
                                stdin: createStdinStream(stdin),
                                stdout: createOutputStream(),
                                stderr: createOutputStream(),
                                fs: this.service,
                                env: state.environment
                            });

                            // Merge response
                            return {
                                ...res,
                                newState: {
                                    ...state,
                                    ...res.newState
                                }
                            };
                        } catch (e: any) {
                            return { output: `sh: ${commandName}: cannot execute binary: ${e.message}`, newState: state, exitCode: 126 };
                        }
                    }
                    return { output: `sh: ${commandName}: cannot execute binary file`, newState: state, exitCode: 126 };
                } else {
                    // Script Execution (assume text)
                    const textContent = new TextDecoder().decode(content);

                    // TODO: Shebang Parsing? For now, assume sh compatible
                    if (textContent.startsWith('#!')) {
                        // Extract interpreter... ignored for now, assume sh
                    }
                    try {
                        const scriptAst = this.parser.parse(textContent);
                        if (scriptAst) {
                            return this.visitSubshell({ type: NodeType.SUBSHELL, root: scriptAst } as SubshellNode, state, stdin);
                        }
                    } catch (e: any) {
                        return { output: `sh: ${commandName}: syntax error: ${e.message}`, newState: state, exitCode: 2 };
                    }
                }
            }
            return { output: `sh: ${commandName}: No such file or directory`, newState: state, exitCode: 127 };
        }

        return { output: `sh: command not found: ${commandName}`, newState: state, exitCode: 127 };
    }
}
