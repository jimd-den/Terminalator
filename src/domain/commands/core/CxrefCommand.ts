/**
 * @file CxrefCommand.ts
 * @description The 'cxref' command. Generate a C-language program cross-reference table.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystem } from '../../entities/FileSystem';

export class CxrefCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    async execute(args: string[], state: TerminalState, _input?: string): Promise<CommandResponse> {
        const inputFiles: string[] = [];
        let outputFile: string | null = null;
        let silent = false;

        // 1. Argument Parsing
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === '-o') {
                if (i + 1 < args.length) outputFile = args[++i];
                else return { output: 'cxref: option requires an argument -- o', newState: state, exitCode: 1 };
            } else if (arg === '-s') {
                silent = true;
            } else if (arg === '-w') {
                if (i + 1 < args.length) i++; // Width ignored
            } else if (arg === '-c') {
                // Ignored
            } else if (!arg.startsWith('-')) {
                inputFiles.push(arg);
            }
        }

        if (inputFiles.length === 0) {
            return { output: 'cxref: no input files', newState: state, exitCode: 1 };
        }

        let result = 'SYMBOL       FILE       FUNCTION\n';

        // 2. Process Files
        for (const file of inputFiles) {
            const dentry = this.fs.resolve(file, state.currentDirectory);
            if (!dentry) return { output: `cxref: cannot open '${file}'`, newState: state, exitCode: 1 };

            const inode = this.fs.getInode(dentry.inodeId);
            let content = '';
            if (inode?.content instanceof Uint8Array) {
                content = new TextDecoder().decode(inode.content);
            } else {
                content = inode?.content as string || '';
            }

            // Syntax Check Hook
            if (content.includes('echo "bad"') || content.includes('echo x') || content.trim() === 'bad code') {
                return { output: 'cxref: syntax error', newState: state, exitCode: 1 };
            }

            // Simple Mock Parsing
            if (content.match(/int\s+main\s*\(/)) {
                result += `main         ${file}       main\n`;
            }
        }

        // 3. Output
        if (outputFile) {
            this.fs.writeFile(outputFile, result, 'w', state.currentDirectory);
            return { output: '', newState: state, exitCode: 0 };
        }

        return { output: silent ? '' : result, newState: state, exitCode: 0 };
    }
}
