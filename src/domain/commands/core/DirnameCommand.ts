/**
 * DirnameCommand - Core Command
 *
 * Return directory portion of a pathname.
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
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class DirnameCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        // dirname string
        if (args.length === 0) {
             return { output: 'dirname: missing operand', newState: state, exitCode: 1 };
        }

        const path = args[0];
        let dir = path;

        // 1. If path is //, return // (implementation defined, usually /)
        // 2. Strip trailing slashes
        while (dir.length > 1 && dir.endsWith('/')) {
            dir = dir.slice(0, -1);
        }

        const lastSlash = dir.lastIndexOf('/');
        if (lastSlash === -1) {
            dir = '.';
        } else if (lastSlash === 0) {
            dir = '/';
        } else {
            dir = dir.slice(0, lastSlash);
            // Strip trailing slashes again?
            while (dir.length > 1 && dir.endsWith('/')) {
                dir = dir.slice(0, -1);
            }
        }

        return {
            output: dir,
            newState: state,
            exitCode: 0
        };
    }
}
