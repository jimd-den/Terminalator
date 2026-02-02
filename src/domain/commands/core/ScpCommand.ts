import { ICommand, CommandResponse } from '../../entities/Command';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';

/**
 * ScpCommand - Core Utility
 * 
 * Secure Copy (Mocked for Terminalator).
 * Supports copying between local and remote systems via NetworkMap.
 * 
 * Syntax: 
 *   scp <source> <destination>
 *   scp host:/path/to/file /local/path
 *   scp /local/path host:/path/to/file
 * 
 * Pillar: The Master's Tool (Technical Excellence)
 * Pillar: The Balanced Scale (SOLID / KISS)
 */
export class ScpCommand implements ICommand {
    public readonly name = 'scp';
    public readonly description = 'Copy files between hosts on the network.';

    public async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length < 2) {
            return {
                output: "usage: scp [[user@]host1:]file1 ... [[user@]host2:]file2",
                exitCode: 1
            };
        }

        const sourceArg = args[0];
        const destArg = args[1];

        try {
            const { host: sourceHost, path: sourcePath } = this.parsePath(sourceArg);
            const { host: destHost, path: destPath } = this.parsePath(destArg);

            const sourceFs = this.getFileSystem(context, sourceHost);
            const destFs = this.getFileSystem(context, destHost);

            if (!sourceFs) return { output: `scp: host ${sourceHost} not found`, exitCode: 1 };
            if (!destFs) return { output: `scp: host ${destHost} not found`, exitCode: 1 };

            const sourceService = new FileSystemService(sourceFs);
            const destService = new FileSystemService(destFs);

            // Resolve absolute paths
            const resolvedSource = sourceService.resolveAbsolutePath(sourcePath, sourceHost ? '/' : state.currentDirectory);
            const resolvedDest = destService.resolveAbsolutePath(destPath, destHost ? '/' : state.currentDirectory);

            // Read from source
            const content = sourceService.readFile(resolvedSource);

            // Write to destination
            // If dest is a directory, append filename
            let finalDest = resolvedDest;
            const destNode = destService.resolve(resolvedDest);
            if (destNode && destService.isDirectory(destNode)) {
                const fileName = resolvedSource.split('/').pop() || 'file';
                finalDest = resolvedDest.endsWith('/') ? resolvedDest + fileName : resolvedDest + '/' + fileName;
            }

            destService.writeFile(finalDest, content, 'w');

            return {
                output: `${sourceArg} -> ${destArg} (100%)`,
                exitCode: 0
            };

        } catch (error: any) {
            return {
                output: `scp: ${error.message}`,
                exitCode: 1
            };
        }
    }

    private parsePath(arg: string): { host: string | null, path: string } {
        if (arg.includes(':')) {
            const parts = arg.split(':');
            let host = parts[0];
            const path = parts[1];

            // Strip user@ if present
            if (host.includes('@')) {
                host = host.split('@')[1];
            }

            return { host, path };
        }
        return { host: null, path: arg };
    }

    private getFileSystem(context: ProcessContext, host: string | null) {
        if (!host || host === 'localhost' || host === 'terminalator') {
            return context.fileSystemService.fileSystem;
        }
        return context.networkMap?.getSystem(host);
    }
}
