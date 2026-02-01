/**
 * ConnectCommand - Game Command
 * 
 * Implements the `ssh` / `connect` capability to switch terminal context to a remote system.
 * Simulates a secure shell connection by updating the TerminalState's hostname and user.
 * 
 * Usage: ssh [user@]hostname
 */

import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../../domain/entities/TerminalState';
import { NetworkMap } from '../../../domain/services/NetworkMap';

export class ConnectCommand implements ICommand {
    name = 'ssh';
    description = 'Open SSH client to connect to a remote system';

    constructor(private networkMap: NetworkMap) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = context.stdin;
        if (args.length === 0) {
            return { output: 'usage: ssh [user@]hostname', exitCode: 1 };
        }

        const target = args[0];
        let user = 'guest'; // Default remote user
        let hostname = target;

        if (target.includes('@')) {
            const parts = target.split('@');
            user = parts[0];
            hostname = parts[1];
        }

        const system = this.networkMap.getSystem(hostname);

        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Special handling for distinct hosts
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return {
                output: `Connection to ${hostname} established.`,
                exitCode: 0,
                newState: {
                    user: state.user,
                    currentDirectory: '/home/operator',
                    fsContext: undefined,
                    environment: { ...state.environment, HOSTNAME: 'localhost', USER: 'operator', HOME: '/home/operator' }
                }
            };
        }

        if (system) {
            const service = new FileSystemService(system);
            let targetUid = 1000;
            let targetGid = 1000;

            try {
                // Check /etc/passwd for user
                const passwd = service.readFile('/etc/passwd');
                const userLine = passwd.split('\n').find(line => line.startsWith(`${user}:`));

                if (!userLine) {
                    return { output: `Permission denied (publickey,password).\nssh: connect to host ${hostname}: User unknown`, exitCode: 1 };
                }

                const parts = userLine.split(':');
                targetUid = parseInt(parts[2]);
                targetGid = parseInt(parts[3]);

            } catch (e) {
                // If read fails, fail connection
                return { output: `ssh: Connection failed: Unable to verify user context.`, exitCode: 1 };
            }

            // Success
            return {
                output: `\nConnecting to ${hostname}...\nWelcome to ${hostname.toUpperCase()} SystemOS v4.2\nLast login: ${new Date().toUTCString()}`,
                exitCode: 0,
                newState: {
                    user: { uid: targetUid, gid: targetGid, groups: [targetGid] },
                    currentDirectory: `/home/${user}`,
                    fsContext: hostname,
                    environment: { ...state.environment, HOSTNAME: hostname, USER: user, HOME: `/home/${user}` }
                }
            };
        }

        return { output: `ssh: Could not resolve hostname ${hostname}: Name or service not known`, exitCode: 1 };
    }
}
