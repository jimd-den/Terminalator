/**
 * LognameCommand - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSIX logname - Return the user's login name (IEEE Std 1003.1-2024)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The logname utility shall write the user's login name to standard output.
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements ICommand.
 * 2. Literate Documentation: Conforms to POSIX specifications.
 * 3. Dependency Minimalism: Uses IdentityService for resolution.
 * 5. Performance: O(1) lookup.
 * 8. SOLID / KISS: Simple reporting of primary identity.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { IdentityService } from '../../services/IdentityService';

export class LognameCommand implements ICommand {
    constructor(private identityService: IdentityService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        if (args.length > 0) {
            return {
                output: 'logname: extra operand',
                newState: state,
                exitCode: 1
            };
        }
        const user = this.identityService.getUserByUid(context.user.uid);
        const username = user ? user.username : 'operator';

        return {
            output: username + '\n',
            newState: state,
            exitCode: 0
        };
    }
}
