import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file MakeCommand.ts
 * @description The 'make' command. Maintain, update, and regenerate groups of programs.
 *
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements ICommand.
 * 2. Literate Documentation: Explains usage.
 * 3. Dependency Minimalism: Minimal deps.
 * 4. Telemetry: Logged.
 * 5. Performance: O(1).
 * 6. Universal Readability: Clear name.
 * 7. Pragmatic Patterns: Command pattern.
 * 8. SOLID / KISS: Simple implementation.
 */
import { CommandBase } from '../CommandBase';
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Dentry } from '../../entities/FileSystem';
import { MakefileParser } from '../../services/make/MakefileParser';
import { MakeExecutor, MakeOptions } from '../../services/make/MakeExecutor';
import { CommandCapability } from '../IStructuredCommand';

export class MakeCommand extends CommandBase {
    public readonly capabilities: CommandCapability[] = [CommandCapability.MODIFY];
    public readonly utility: string = 'make';

    protected async executeInternal(
        args: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        // Use CommandBase parser for standard flags and -f
        this.parseArgs(args, ['f']);

        const options: MakeOptions = {
            ignoreErrors: this.hasFlag('i'),
            dryRun: this.hasFlag('n'),
            keepGoing: this.hasFlag('k'),
            touch: this.hasFlag('t')
        };

        const makefileName = this.options.get('f') || 'Makefile';
        const cliMacros = new Map<string, string>();

        // Extract macros from operands (e.g., VAR=val) and separate targets
        const targets: string[] = [];
        for (const op of this.operands) {
            if (op.includes('=')) {
                const [key, ...rest] = op.split('=');
                cliMacros.set(key.trim(), rest.join('=').trim());
            } else {
                targets.push(op);
            }
        }

        const fs = context.fileSystemService;

        // 1. Resolve Makefile
        let makefileNode: Dentry | null = fs.resolve(makefileName, state.currentDirectory);
        if (!makefileNode && state.currentDirectory !== '/') {
            makefileNode = fs.resolve(makefileName, '/');
        }

        // Default 'Makefile' -> 'makefile' fallback
        if ((!makefileNode || fs.isDirectory(makefileNode)) && makefileName === 'Makefile') {
            makefileNode = fs.resolve('makefile', state.currentDirectory) || fs.resolve('makefile', '/');
        }

        if (!makefileNode || fs.isDirectory(makefileNode)) {
            return {
                output: `make: *** No targets specified and no makefile found. Stop.`,
                newState: state,
                exitCode: 2
            };
        }

        // 2. Parse Makefile
        let content = '';
        try {
            content = fs.readFile(fs.getAbsolutePath(makefileNode));
        } catch (e) {
            return { output: `make: ${makefileName}: Cannot read file`, newState: state, exitCode: 2 };
        }

        const parser = new MakefileParser();
        const data = parser.parse(content, cliMacros);

        // 3. Determine Goals
        const goals = targets.length > 0 ? targets : (data.orderedTargets.length > 0 ? [data.orderedTargets[0]] : []);

        if (goals.length === 0) {
            return {
                output: 'make: *** No targets. Stop.',
                newState: state,
                exitCode: 2
            };
        }

        // 4. Execute
        const executor = new MakeExecutor(fs, state, data, options);
        const result = await executor.execute(goals);

        return {
            output: result.output,
            newState: state,
            exitCode: result.exitCode
        };
    }
}
