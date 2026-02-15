import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * TouchCommand - Core Command
 *
 * Updates file timestamps or creates empty files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to create files or signal updates.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse, CommandMetadata } from '../../entities/Command';
import { TheatricalVerb } from '../../services/PresentationDirector';

import { FileSystemService } from '../../services/FileSystemService';

export class TouchCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'touch';

    constructor(private fs: FileSystemService) {
        super();
    }

    public getMetadata(): CommandMetadata {
        return {
            verb: TheatricalVerb.SYNTHESIZE,
            style: 'NORMAL'
        };
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const fsService = context.fileSystemService || this.fs;
        const noCreate = flags.has('c');

        if (operands.length === 0) {
            return {
                output: 'touch: missing operand',
                newState: state,
                exitCode: 1
            };
        }

        let exitCode = 0;
        let output = '';

        for (const target of operands) {
            if (target === '/') {
                output += `touch: setting times of '/': Permission denied\n`;
                exitCode = 1;
                continue;
            }

            let path = target;
            if (!target.startsWith('/')) {
                path = state.currentDirectory === '/'
                    ? `/${target}`
                    : `${state.currentDirectory}/${target}`;
            }

            if (path.length > 1 && path.endsWith('/')) {
                path = path.slice(0, -1);
            }

            const existing = fsService.resolve(path);

            if (existing) {
                const inode = fsService.getInode(existing.inodeId);
                if (inode) {
                    const now = Date.now();
                    inode.mtime = now;
                    inode.atime = now;
                    inode.ctime = now;
                }
            } else {
                if (noCreate) {
                    continue;
                }

                const lastSlashIndex = path.lastIndexOf('/');
                const parentPath = lastSlashIndex === 0 ? '/' : path.substring(0, lastSlashIndex);

                const parent = fsService.resolve(parentPath);

                if (!parent || !fsService.isDirectory(parent)) {
                    output += `touch: cannot touch '${target}': No such file or directory\n`;
                    exitCode = 1;
                    continue;
                }

                try {
                    fsService.writeFile(path, '', 'w');
                } catch (e: any) {
                    output += `touch: cannot touch '${target}': ${e.message}\n`;
                    exitCode = 1;
                }
            }
        }

        return {
            output: output.trim(),
            newState: state,
            exitCode: exitCode
        };
    }
}