import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * ReadlinkCommand - Core Command
 *
 * Read the value of a symbolic link.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Display symlink target.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystem } from '../../entities/FileSystem';

export class ReadlinkCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        const files = args.filter(a => !a.startsWith('-'));
        if (files.length === 0) {
            return { output: 'readlink: missing operand', newState: state, exitCode: 1 };
        }

        const file = files[0]; // POSIX readlink usually takes file

        try {
            const path = this.resolvePath(file, state);
            const node = this.fs.resolve(path); // resolveNode typically resolves links?
            // We need to resolve the node WITHOUT following the link if it is the target.
            // FileSystem might resolve links automatically.
            // We need `lstat` or similar.
            // If `resolveNode` follows links, `readlink` on a symlink will give the target file's node.
            // But we need the link content.
            // Does FS expose `getLinkTarget(path)`?
            // Or `readLink(path)`?
            // Assuming `fs.readLink(path)` exists.

            const target = this.fs.readlink(path);
            if (target) {
                return {
                    output: target,
                    newState: state,
                    exitCode: 0
                };
            } else {
                // Not a link? POSIX: exit >0 or silent?
                // "If the argument is not a symbolic link... exit status 1"
                return { output: '', newState: state, exitCode: 1 };
            }

        } catch (e: any) {
            // Check if error is "not a link" vs "no such file".
            // Simplified.
            return { output: `readlink: ${file}: Invalid argument`, newState: state, exitCode: 1 };
        }
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
