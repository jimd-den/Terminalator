/**
 * IdCommand - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSIX id - Return user identity (IEEE Std 1003.1-2024)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The id utility shall write a message to standard output that lists 
 * the user and group IDs and the corresponding user and group names 
 * of the invoking process.
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements ICommand, uses IdentityService.
 * 2. Literate Documentation: Conforms to POSIX -u, -g, -G, -n options.
 * 3. Dependency Minimalism: Uses domain services for identity lookup.
 * 4. Telemetry: Identity requests logged via service.
 * 5. Performance: O(1) for current user, O(n) for groups.
 * 6. Universal Readability: Clear output formatting.
 * 7. Pragmatic Patterns: Command pattern.
 * 8. SOLID / KISS: Single responsibility - reporting identity.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { IdentityService } from '../../services/IdentityService';

export class IdCommand implements ICommand {
    constructor(private identityService: IdentityService) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const flags = args.filter(a => a.startsWith('-'));
        const operands = args.filter(a => !a.startsWith('-'));

        const showUidOnly = flags.includes('-u');
        const showGidOnly = flags.includes('-g');
        const showGroupsOnly = flags.includes('-G');
        const showNames = flags.includes('-n');

        let targetUser = context.user;
        let username = 'operator';

        if (operands.length > 0) {
            const user = this.identityService.resolveUser(operands[0]);
            if (!user) {
                return { output: `id: '${operands[0]}': no such user`, newState: state, exitCode: 1 };
            }
            targetUser = { uid: user.uid, gid: user.gid, groups: user.groups };
            username = user.username;
        } else {
            const user = this.identityService.getUserByUid(context.user.uid);
            if (user) username = user.username;
        }

        let output = '';

        if (showUidOnly) {
            output = showNames ? username : targetUser.uid.toString();
        } else if (showGidOnly) {
            const group = this.identityService.getGroupByGid(targetUser.gid);
            output = (showNames && group) ? group.groupname : targetUser.gid.toString();
        } else if (showGroupsOnly) {
            const groupParts: string[] = [];
            for (const gid of targetUser.groups) {
                const g = this.identityService.getGroupByGid(gid);
                groupParts.push((showNames && g) ? g.groupname : gid.toString());
            }
            output = groupParts.join(' ');
        } else {
            // Default POSIX format:
            // uid=1000(operator) gid=1000(operator) groups=1000(operator),1001(staff)...
            const group = this.identityService.getGroupByGid(targetUser.gid);
            const groupname = group ? group.groupname : targetUser.gid.toString();

            output = `uid=${targetUser.uid}(${username}) gid=${targetUser.gid}(${groupname}) groups=`;

            const groupList: string[] = [];
            for (const gid of targetUser.groups) {
                const g = this.identityService.getGroupByGid(gid);
                const gn = g ? g.groupname : gid.toString();
                groupList.push(`${gid}(${gn})`);
            }
            output += groupList.join(',');
        }

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }
}
