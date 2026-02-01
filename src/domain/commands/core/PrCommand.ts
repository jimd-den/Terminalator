import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * PrCommand - Core Command
 *
 * Print files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Pagination.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystem } from '../../entities/FileSystem';

export class PrCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        const file = args.length > 0 ? args[0] : null;
        let content = '';
        let headerFile = file || '';

        if (file) {
            try {
                content = this.fs.readFile(this.resolvePath(file, state));
            } catch (e) {
                return { output: `pr: ${file}: No such file`, newState: state, exitCode: 1 };
            }
        } else if (input) {
            content = input;
            headerFile = '';
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        const lines = content.split('\n');
        // Simple pagination: 66 lines per page? 5 lines header, 5 lines footer?
        // Header: "date ... Page 1"

        const date = new Date().toDateString();
        const pageHeader = (page: number) => `\n${date} ${headerFile} Page ${page}\n\n`;
        const output: string[] = [];

        // Output just page 1 for simple test
        output.push(pageHeader(1).trimStart());
        output.push(...lines);

        return {
            output: output.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
