/**
 * ChgrpCommand - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSIX chgrp - Change file group ownership (IEEE Std 1003.1-2024)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements IStructuredCommand.
 * 2. Literate Documentation: Handles group name resolution and recursive -R.
 * 3. Dependency Minimalism: Standard domain services only.
 * 5. Performance: O(1) resolution per file.
 * 8. SOLID / KISS: Reuses logic similar to chown for consistency.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CommandResponse } from '../ICommand';
import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { IdentityService } from '../../services/IdentityService';

export class ChgrpCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'chgrp';

    constructor(
        private fs: FileSystemService,
        private identityService: IdentityService
    ) { 
        super();
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const recursive = flags.has('R');

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