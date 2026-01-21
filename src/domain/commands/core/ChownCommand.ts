/**
 * ChownCommand - Core Command
 *
 * Changes file owner and group.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to change file ownership.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class ChownCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const operands = args.filter(arg => !arg.startsWith('-'));

        if (operands.length < 2) {
            return {
                output: 'chown: missing operand',
                newState: state,
                exitCode: 1
            };
        }

        const ownerGroup = operands[0];
        const files = operands.slice(1);

        // Parse owner:group
        // Formats: "owner:group", "owner", ":group" (POSIX allows :group)
        // strict logic:
        let uid = -1;
        let gid = -1;

        if (ownerGroup.includes(':')) {
            const parts = ownerGroup.split(':');
            const uStr = parts[0];
            const gStr = parts[1];

            if (uStr.length > 0) {
                uid = this.parseId(uStr);
            }
            if (gStr.length > 0) {
                gid = this.parseId(gStr);
            }
        } else {
            // Just owner
            uid = this.parseId(ownerGroup);
        }

        if (uid === -1 && gid === -1) {
            return {
                output: `chown: invalid user: '${ownerGroup}'`,
                newState: state,
                exitCode: 1
            };
        }

        // Apply
        for (const filename of files) {
            let path = filename;
            if (!filename.startsWith('/')) {
                path = state.currentDirectory === '/'
                    ? `/${filename}`
                    : `${state.currentDirectory}/${filename}`;
            }

            try {
                // If uid or gid is -1, it means "don't change" (POSIX semantics generally)
                // But FileSystem.chown(path, uid, gid) signature expects numbers. 
                // We need to resolve current ones if -1.
                // We don't have fs.stat exposed easily to get current?
                // Actually `fs.resolve(path)` gives a Dentry. Dentry has inodeId. `fs.getInode(id)` gives Inode which has uid/gid.
                // We can fetch current.

                // We need access to internals/resolve logic. 
                // ChownCommand has 'fs'. Let's see if we can use existing public methods or rely on fs.chown logic?
                // fs.chown implementation (viewed earlier) just sets uid/gid.
                // It does NOT handle "keep existing".
                // So checking current is needed.

                // NOTE: Using fs private/internal methods might be risky if they aren't exposed.
                // But fs is passed in. 'resolveNode' returns Dentry. 
                // Inode lookup might be private?
                // Let's check FileSystem.ts again. `getInode` was private in snippet? 
                // Snippet showed `getInode(dentry.inodeId)!` inside chown.
                // It might not be public.

                // If we can't get current, we can't implement "keep existing" cleanly without extending FS.
                // However, for TDD, we can check if `resolveNode` returns something that has stats?
                // Dentry usually points to Inode.

                // Wait, if I can't read current, I can't support partial updates properly if FS doesn't support -1 sentinel.
                // Let's assume for now we just pass -1 if FS ignores it? 
                // Or maybe FS.chown allows -1? Snippet: `inode.uid = uid;`. It assigns directly. 
                // So -1 would set it to -1 (invalid).

                // Workaround: We really should have stat support. 
                // But for now, if I can't get current, I might fail partial updates.
                // POSIX tests I wrote:
                // 1. "1000:1000" -> both set.
                // 2. "1001" -> uid set. gid? 
                //    In POSIX "chown user file" leaves group unchanged.

                // I will try to use `fs['getInode']` (hack) or hope `resolveNode` exposes enough.
                // Or better: `fs` is strictly typed.

                // Let's blindly implement assuming I can't read current, 
                // OR I assume -1 is safe? 
                // No, better to try to be safe.
                // If I can't resolve, I can't implement partial update correctly without FS change.
                // But I am allowed to modify FS?
                // Yes. I can Add `stat` or `getAttributes`.

                // BUT, `ChownCommand` is "Use Case". `FileSystem` is "Entity".
                // I shouldn't pollute Entity for just this if possible.
                // Actually `fs.resolveNode` returns Dentry.
                // Does Dentry have Inode? Typically separated.

                // Let's peek at `FileSystem` definition again to be sure what `resolveNode` returns.
                // It is public.

                // For this step, I'll assume valid inputs and "1000:1000" works.
                // For "1001", I might need to skip gid update.
                // Does `fs.chown` allow separate updates?
                // Snippet: `chown(path, uid, gid)`. It sets BOTH.

                // Solution: Extend `FileSystem` to support `chown(path, uid, gid)` where -1 means ignore.
                // Let's update `FileSystem.ts` first? 
                // Or checking header... `getInode` was on line 284 in snippet inside `chmod`.
                // It seems to be a method on `FileSystem`.
                // If it is private, I can't use it.

                // Let's modify `FileSystem.ts` to make `chown` support -1 as "preserve".

                this.fs.chown(path, uid, gid);

            } catch (e: any) {
                return {
                    output: `chown: ${e.message}`,
                    newState: state,
                    exitCode: 1
                };
            }
        }

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }

    private parseId(str: string): number {
        const val = parseInt(str, 10);
        if (isNaN(val)) return -1; // Fail if not numeric for now. 
        // (In real system, lookup /etc/passwd)
        return val;
    }
}
