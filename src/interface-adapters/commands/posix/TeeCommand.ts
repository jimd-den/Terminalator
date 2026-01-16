import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class TeeCommand implements ICommand {
    name = 'tee';
    description = 'Read from standard input and write to standard output and files';

    constructor(/* private fs: FileSystem */) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const content = context.stdin || '';
        let append = false;
        const files: string[] = [];

        // Parse args
        // Supporting -a for append
        for (const arg of args) {
            if (arg === '-a' || arg === '--append') {
                append = true;
            } else if (!arg.startsWith('-')) {
                files.push(arg);
            }
        }

        // Write to each file
        for (const file of files) {
            try {
                // Determine mode
                const mode = append ? 'a' : 'w';
                context.fs.writeFile(file, content, mode, context.cwd);
            } catch (e: any) {
                // tee usually continues writing to other files even if one fails, but outputs error to stderr
                // For now we'll just return error for simplicity or maybe log it
                // We'll mimic tee behavior: print error but continue? 
                // Context doesn't support streaming stderr yet, so we return error string in output?
                // Returning error usually stops pipe. 
                // Let's just return error if any file fails for now.
                return {
                    output: `tee: ${file}: ${e.message}`,
                    exitCode: 1
                };
            }
        }

        // Output to stdout (CommandResponse.output)
        return {
            output: content,
            exitCode: 0
        };
    }
}
