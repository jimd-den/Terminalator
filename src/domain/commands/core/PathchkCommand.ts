import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * PathchkCommand - Core Command
 *
 * Check pathnames.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Validation of portability.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class PathchkCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        const files: string[] = [];
        let portability = false;

        for (const arg of args) {
            if (arg === '-p') portability = true;
            else if (!arg.startsWith('-')) files.push(arg);
        }

        if (files.length === 0) {
             return { output: 'pathchk: missing operand', newState: state, exitCode: 1 };
        }

        for (const file of files) {
            if (file === '') {
                return { output: `pathchk: empty pathname`, newState: state, exitCode: 1 };
            }
            // Check length?
            if (file.length > 4096) { // PATH_MAX
                return { output: `pathchk: limit ${file.length} exceeded`, newState: state, exitCode: 1 };
            }
            // Check chars?
            if (portability) {
                if (!/^[a-zA-Z0-9._/-]+$/.test(file)) {
                    return { output: `pathchk: non-portable character in '${file}'`, newState: state, exitCode: 1 };
                }
            }
        }

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
