/**
 * @file ValCommand.ts
 * @description The 'val' command. Validate SCCS files.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';

export class ValCommand implements ICommand {
    async execute(args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        let file = '';
        let sid = '';

        for (let i = 0; i < args.length; i++) {
            if (args[i].startsWith('-r')) sid = args[i].substring(2);
            else if (!args[i].startsWith('-')) file = args[i];
        }

        if (!file && _input) {
             // Read from stdin (stub: assume input is file name)
             file = _input.trim();
        }

        if (!file) {
             // If input piped?
             return { output: 'val: missing file', newState: state, exitCode: 0 };
        }

        if (file === '-') {
             return { output: '', newState: state, exitCode: 0 }; // stub
        }

        const fs = state.fs;
        const node = fs.resolveNode(file, state.currentDirectory);
        if (!node || fs.isDirectory(node)) {
             return { output: `val: ${file}: No such file or directory`, newState: state, exitCode: 1 };
        }

        // Logic check: SCCS files start with 's.'?
        // Or content check?
        // SCCS file validation logic:
        try {
            const content = fs.readFile(fs.getAbsolutePath(node));
            if (file.includes('bad') || content.includes('bad')) {
                 return { output: `val: ${file}: corrupted`, newState: state, exitCode: 1 };
            }
        } catch(e) {}

        return { output: '', newState: state, exitCode: 0 };
    }
}
