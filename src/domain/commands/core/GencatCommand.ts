/**
 * @file GencatCommand.ts
 * @description The 'gencat' command. Generate a formatted message catalog.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystem } from '../../entities/FileSystem';

export class GencatCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    async execute(args: string[], state: TerminalState, input?: string): Promise<CommandResponse> {
        if (args.length < 1) {
            return { output: 'gencat: missing output file', newState: state, exitCode: 1 };
        }

        const catFile = args[0];
        const inputFiles = args.slice(1);

        let catalogContent = '';

        if (inputFiles.length === 0) {
            // Read from stdin
            if (input) catalogContent = input;
        } else {
            for (const file of inputFiles) {
                if (file === '-') {
                    if (input) catalogContent += input + '\n';
                    continue;
                }
                const dentry = this.fs.resolve(file, state.currentDirectory);
                if (!dentry) return { output: `gencat: ${file}: No such file or directory`, newState: state, exitCode: 1 };

                const inode = this.fs.getInode(dentry.inodeId);
                if (!inode) return { output: 'gencat: read error', newState: state, exitCode: 1 };

                if (inode.content instanceof Uint8Array) {
                    catalogContent += new TextDecoder().decode(inode.content) + '\n';
                } else {
                    catalogContent += (inode.content as string || '') + '\n';
                }
            }
        }

        // Basic syntax validation
        const lines = catalogContent.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length === 0) continue;
            if (trimmed.startsWith('$')) continue; // Directive e.g. $set
            if (/^\d/.test(trimmed)) continue; // Message number

            // If line is just text without structure, fail (e.g. for GENCAT_07)
            // But we must allow quotes strings if they follow rules.
            // Simplified: Fail if not starting with $ or Digit.
            return { output: 'gencat: invalid format', newState: state, exitCode: 1 };
        }

        // Write output
        this.fs.writeFile(catFile, catalogContent, 'w', state.currentDirectory);

        return { output: '', newState: state, exitCode: 0 };
    }
}
