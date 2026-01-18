/**
 * CompressCommand - Core Command
 *
 * Compress data.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Reduce file size (Simplified RLE for simulation).
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class CompressCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const files = args.filter(a => !a.startsWith('-'));
        if (files.length === 0) {
             return { output: 'compress: missing operand', newState: state, exitCode: 1 };
        }

        for (const file of files) {
            try {
                const path = this.resolvePath(file, state);
                const content = this.fs.readFile(path);
                const compressed = this.rleEncode(content);

                const newPath = `${path}.Z`;
                this.fs.writeFile(newPath, compressed, 'w');
                this.fs.deleteNode(path); // compress replaces original
            } catch (e) {
                return { output: `compress: ${file}: No such file or directory`, newState: state, exitCode: 1 };
            }
        }

        return {
            output: '',
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }

    private rleEncode(input: string): string {
        // Simple RLE: count + char. "AAAAA" -> "5A"
        // Only efficient for repeats.
        // Simplified: store as JSON stringified with marker?
        // Or actual RLE algorithm.
        let encoded = '';
        let i = 0;
        while (i < input.length) {
            let count = 1;
            while (i + count < input.length && input[i] === input[i + count]) {
                count++;
            }
            if (count > 1) {
                encoded += `${count}${input[i]}`;
            } else {
                encoded += `1${input[i]}`; // Naive: always prefix count
            }
            i += count;
        }
        return 'RLE:' + encoded; // Marker
    }
}
