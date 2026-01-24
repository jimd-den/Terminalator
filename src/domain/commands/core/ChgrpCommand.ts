/**
 * ChgrpCommand - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSIX chgrp - Change file group ownership (IEEE Std 1003.1-2024)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements ICommand, uses IdentityService and FileSystemService.
 * 2. Literate Documentation: Handles group name resolution and recursive -R.
 * 3. Dependency Minimalism: Standard domain services only.
 * 5. Performance: O(1) resolution per file.
 * 8. SOLID / KISS: Reuses logic similar to chown for consistency.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { IdentityService } from '../../services/IdentityService';

export class ChgrpCommand implements ICommand {
    constructor(
        private fs: FileSystemService,
        private identityService: IdentityService
    ) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const flags = args.filter(a => a.startsWith('-'));
        const operands = args.filter(a => !a.startsWith('-'));
        const recursive = flags.includes('-R');

        if (operands.length < 2) {
            return { output: 'chgrp: missing operand', newState: state, exitCode: 1 };
        }

        const groupName = operands[0];
        const files = operands.slice(1);

        const group = this.identityService.resolveGroup(groupName);
        if (!group) return { output: `chgrp: invalid group: '${groupName}'`, newState: state, exitCode: 1 };

        const errors: string[] = [];
        for (const file of files) {
            try {
                if (recursive) {
                    this.chgrpRecursive(file, group.gid, state.currentDirectory, context.user);
                } else {
                    this.fs.chown(file, -1, group.gid, state.currentDirectory, context.user);
                }
            } catch (e: any) {
                errors.push(`chgrp: ${file}: ${e.message}`);
            }
        }

        return {
            output: errors.join('\n'),
            newState: state,
            exitCode: errors.length > 0 ? 1 : 0
        };
    }

    private chgrpRecursive(path: string, gid: number, cwd: string, user: any): void {
        const dentry = this.fs.resolve(path, cwd, true, user);
        if (!dentry) throw new Error(`${path}: No such file or directory`);

        this.applyChgrpRecursive(dentry, gid, user);
    }

    private applyChgrpRecursive(dentry: any, gid: number, user: any): void {
        const path = this.fs.getAbsolutePath(dentry);
        this.fs.chown(path, -1, gid, '/', user);

        if (dentry.children) {
            for (const child of dentry.children.values()) {
                this.applyChgrpRecursive(child, gid, user);
            }
        }
    }
}
