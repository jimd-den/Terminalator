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
import { TerminalState } from '../../../domain/entities/TerminalState';
import { NetworkMap } from '../../../domain/services/NetworkMap';

export class ConnectCommand implements ICommand {
    name = 'ssh';
    description = 'Open SSH client to connect to a remote system';

    constructor(private networkMap: NetworkMap) { }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
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

        // 1. Resolve System
        // If we are already connected to a remote host, can we jump?
        // SSH jumping is valid. The NetworkMap handles validation.

        const system = this.networkMap.getSystem(hostname);

        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 800));

        if (!system && hostname !== 'localhost' && hostname !== 'home' && hostname !== 'MyComputer') {
            // If NetworkMap returns undefined, it might be an invalid host?
            // NetworkMap currently generates valid systems for ANY hostname.
            // But if we wanted to restrict it, we would check here.
            // For now, let's assume if getSystem returns something, it works.
            // If we want to simulate "Connection refused", we can add logic.
        }

        // Special handling for distinct hosts
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            // Return to local
            return {
                output: `Connection to ${hostname} established.`,
                exitCode: 0,
                newState: {
                    hostname: 'localhost',
                    user: state.user, // Reset user? Or keep? usually ssh localhost logs in as same user or specified.
                    currentDirectory: '/home/operator' // Reset cwd to home
                }
            };
        }

        // Check if destination exists (NetworkMap generates it if not)
        if (system) {
            // Validate user?
            // SystemGenerator creates 'guest' and 'admin' usually.
            // We can check /etc/passwd on the remote system!
            try {
                const passwd = system.readFile('/etc/passwd');
                if (!passwd.includes(`${user}:`)) {
                    return { output: `Permission denied (publickey,password).\nssh: connect to host ${hostname}: User unknown`, exitCode: 1 };
                }
            } catch (e) {
                // ignore
            }

            // Success
            return {
                output: `\nConnecting to ${hostname}...\nWelcome to ${hostname.toUpperCase()} SystemOS v4.2\nLast login: ${new Date().toUTCString()}`,
                exitCode: 0,
                newState: {
                    hostname: hostname,
                    user: user,
                    currentDirectory: `/home/${user}` // Default to home
                }
            };
        }

        return { output: `ssh: Could not resolve hostname ${hostname}: Name or service not known`, exitCode: 1 };
    }
}
