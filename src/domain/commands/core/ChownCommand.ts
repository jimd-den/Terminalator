/**
 * ChownCommand - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSIX chown - Change file ownership (IEEE Std 1003.1-2024)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The chown utility shall change the user ID and/or group ID of the specified files.
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements IStructuredCommand.
 * 2. Literate Documentation: Handles owner:group resolution and POSIX semantics.
 * 3. Dependency Minimalism: Standard domain services only.
 * 4. Telemetry: Ownership changes logged.
 * 5. Performance: O(1) resolution per file.
 * 7. Pragmatic Patterns: Command pattern.
 * 8. SOLID / KISS: Decoupled identity resolution from filesystem application.
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

export class ChownCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'chown';

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
            return { output: 'chown: missing operand', newState: state, exitCode: 1 };
        }

        const ownerGroupSpec = operands[0];
        const files = operands.slice(1);

        let uid = -1;
        let gid = -1;

        const separator = ownerGroupSpec.includes(':') ? ':' : (ownerGroupSpec.includes('.') ? '.' : null);

        if (separator) {
            const parts = ownerGroupSpec.split(separator);
            const ownerPart = parts[0];
            const groupPart = parts[1];

            if (ownerPart) {
                const user = this.identityService.resolveUser(ownerPart);
                if (!user) return { output: `chown: invalid user: '${ownerPart}'`, newState: state, exitCode: 1 };
                uid = user.uid;
            }

            if (groupPart) {
                const group = this.identityService.resolveGroup(groupPart);
                if (!group) return { output: `chown: invalid group: '${groupPart}'`, newState: state, exitCode: 1 };
                gid = group.gid;
            }
        } else {
            const user = this.identityService.resolveUser(ownerGroupSpec);
            if (!user) return { output: `chown: invalid user: '${ownerGroupSpec}'`, newState: state, exitCode: 1 };
            uid = user.uid;
        }

        const errors: string[] = [];
        for (const file of files) {
            try {
                if (recursive) {
                    this.chownRecursive(file, uid, gid, state.currentDirectory, context.user);
                } else {
                    this.fs.chown(file, uid, gid, state.currentDirectory, context.user);
                }
            } catch (e: any) {
                errors.push(`chown: ${file}: ${e.message}`);
            }
        }

        return {
            output: errors.join('\n'),
            newState: state,
            exitCode: errors.length > 0 ? 1 : 0
        };
    }

    private chownRecursive(path: string, uid: number, gid: number, cwd: string, user: any): void {
        const dentry = this.fs.resolve(path, cwd, true, user);
        if (!dentry) throw new Error(`${path}: No such file or directory`);

        this.applyChownRecursive(dentry, uid, gid, user);
    }

    private applyChownRecursive(dentry: any, uid: number, gid: number, user: any): void {
        const path = this.fs.getAbsolutePath(dentry);
        this.fs.chown(path, uid, gid, '/', user);

        if (dentry.children) {
            for (const child of dentry.children.values()) {
                this.applyChownRecursive(child, uid, gid, user);
            }
        }
    }
}