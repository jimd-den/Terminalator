import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * BasenameCommand - Core Command
 *
 * Return non-directory portion of a pathname.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Path manipulation.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystem } from '../../entities/FileSystem';

export class BasenameCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        // basename string [suffix]
        if (args.length === 0) {
            return { output: 'basename: missing operand', newState: state, exitCode: 1 };
        }

        const path = args[0];
        const suffix = args[1];

        // 1. If path is empty, return . ? No, POSIX says if string is empty, output is empty?
        // Actually: if string is empty, it's implementation defined?
        // Usually usage is `basename /usr/bin/sort`.

        let base = path;
        // Strip trailing slashes
        while (base.length > 1 && base.endsWith('/')) {
            base = base.slice(0, -1);
        }

        const lastSlash = base.lastIndexOf('/');
        if (lastSlash !== -1) {
            base = base.slice(lastSlash + 1);
        }

        if (suffix && base.endsWith(suffix)) {
            base = base.slice(0, -base.length + base.lastIndexOf(suffix)); // tricky?
            // "If suffix is specified ... delete ... suffix"
            base = base.slice(0, base.length - suffix.length);
        }

        return {
            output: base,
            newState: state,
            exitCode: 0
        };
    }
}
