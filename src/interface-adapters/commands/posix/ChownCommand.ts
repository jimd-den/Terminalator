import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { FileSystem } from '../../../domain/entities/FileSystem';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class ChownCommand implements ICommand {
    name = 'chown';
    description = 'Change file owner and group';

    constructor(/* private fs: FileSystemService */) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        if (args.length < 2) {
            return { output: 'chown: missing operand', exitCode: 1 };
        }

        const owner = args[0];
        const target = args[1];

        try {
            // Support "uid:gid" or just "uid"
            // For now, strict numeric IDs because we don't have a user database service connected here yet.
            const parts = owner.split(':');
            const uidStr = parts[0];
            const gidStr = parts[1];

            const uid = parseInt(uidStr, 10);
            let gid = -1; // -1 means no change typically? fs.chown expects numbers.
            // usage: chown user file. means chown user:currentgroup file? 
            // or chown uid:gid file.

            if (isNaN(uid)) {
                // If not numeric, hardcode "root" -> 0.
                if (uidStr === 'root') {
                    // uid = 0; // cant assign to const
                } else {
                    return { output: `chown: invalid user: '${owner}'`, exitCode: 1 };
                }
            }

            // Re-logic for clean var usage
            let finalUid = isNaN(uid) ? (uidStr === 'root' ? 0 : 1000) : uid;
            let finalGid = finalUid;

            if (gidStr) {
                const g = parseInt(gidStr, 10);
                if (!isNaN(g)) finalGid = g;
            }

            context.fs.chown(target, finalUid, finalGid, context.cwd);
            return { output: '', exitCode: 0 };
        } catch (e: any) {
            return { output: `chown: ${e.message}`, exitCode: 1 };
        }
    }
}
