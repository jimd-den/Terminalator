/**
 * LnCommand - Core Command
 *
 * Creates links (hard or soft).
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to create links between files.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class LnCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        let symbolic = false;
        let force = false; // Not implementing -f yet, but good to know
        const operands: string[] = [];

        for (const arg of args) {
            if (arg === '-s') symbolic = true;
            else if (arg === '-f') force = true;
            else operands.push(arg);
        }

        if (operands.length < 2) {
            return {
                output: 'ln: missing file operand',
                newState: state,
                exitCode: 1
            };
        }

        const target = operands[0]; // Source
        const linkName = operands[1]; // Destination

        // If linkName is a directory, append target name
        // (Behavior check: `ln target dir/` -> links `dir/target`)
        // Current FS primitive `link` expects full path?
        // Let's resolve linkName and check if directory?
        // But FileSystem commands usually handle path resolution internally if they take `cwd`.
        // Our FS primitives take absolute paths mostly? Or relative to `cwd`.

        // Let's normalize linkName logic here or let FS handle it?
        // FS `link` and `symlink` expect exact path?
        // My implementation of `link` did: "Correct parent resolution...".
        // It didn't handle "linkName is existing directory".

        let finalLinkPath = linkName;

        // Check if linkName exists and is a directory
        // Resolve it first?
        let linkNode = this.fs.resolve(linkName.startsWith('/') ? linkName : (state.currentDirectory === '/' ? `/${linkName}` : `${state.currentDirectory}/${linkName}`));

        if (linkNode && this.fs.isDirectory(linkNode)) {
            // Append target basename
            const targetBase = target.substring(target.lastIndexOf('/') + 1);
            finalLinkPath = linkName.endsWith('/') ? `${linkName}${targetBase}` : `${linkName}/${targetBase}`;
            // Re-resolve to check conflicts handled by FS method
        }

        // Determine absolute paths for FS call
        let absLinkPath = finalLinkPath;
        if (!finalLinkPath.startsWith('/')) {
            absLinkPath = state.currentDirectory === '/'
                ? `/${finalLinkPath}`
                : `${state.currentDirectory}/${finalLinkPath}`;
        }

        // Target resolving:
        // For Hard Link: Target MUST be resolved to check existence.
        // For Symlink: Target String is stored literally.

        // For Hard Link, we need absolute path to existing file if resolving via `cwd`?
        // `link` takes `oldPath`, `newPath`, `cwd`.
        // My `link` implementation resolves `oldPath` using `cwd`.

        try {
            if (symbolic) {
                this.fs.symlink(target, absLinkPath, 1000, 1000, '/'); // using root cwd since absLinkPath is absolute
                // target string provided as is (relative or absolute).
            } else {
                let absTarget = target;
                if (!target.startsWith('/')) {
                    absTarget = state.currentDirectory === '/'
                        ? `/${target}`
                        : `${state.currentDirectory}/${target}`;
                }
                this.fs.link(absTarget, absLinkPath, '/');
            }
        } catch (e: any) {
            return {
                output: `ln: ${e.message}`,
                newState: state,
                exitCode: 1
            };
        }

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }
}
