/**
 * OdCommand - Core Command
 *
 * Dump files in octal and other formats.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Binary file inspection.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class OdCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        const files: string[] = [];
        // Ignore flags for MVP default behavior
        for (const arg of args) {
            if (!arg.startsWith('-')) files.push(arg);
        }

        let content = '';
        if (files.length > 0) {
            try {
                content = this.fs.readFile(this.resolvePath(files[0], state));
            } catch (e) {
                return { output: `od: ${files[0]}: No such file`, newState: state, exitCode: 1 };
            }
        } else if (input) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        // Default format: -t o2 (octal 2-byte units)
        // Simplified: output bytes in octal.
        // Address (octal)   Data (octal)
        // 0000000           061141 000143 ...

        let output = '';
        let offset = 0;
        const chunkSize = 16;

        for (let i = 0; i < content.length; i += chunkSize) {
            // Address
            output += offset.toString(8).padStart(7, '0') + ' ';

            // Data
            const chunk = content.slice(i, i + chunkSize);
            for (let j = 0; j < chunk.length; j += 2) { // 2-byte units
                let val = 0;
                const b1 = chunk.charCodeAt(j);
                const b2 = j + 1 < chunk.length ? chunk.charCodeAt(j + 1) : 0;
                // Little endian? POSIX depends. Usually machine dependent.
                // We'll just print byte octals for simplicity if we can't do shorts easily.
                // 2-byte octal: 6 chars?
                // Let's do bytes:
                // output += b1.toString(8).padStart(3, '0') + ' ';
                // if (j + 1 < chunk.length) output += b2.toString(8).padStart(3, '0') + ' ';

                // Let's try 2-byte combined
                val = (b2 << 8) | b1; // Little endian?
                if (j + 1 >= chunk.length) val = b1; // partial?

                output += val.toString(8).padStart(6, '0') + ' ';
            }
            output += '\n';
            offset += chunkSize;
        }
        output += offset.toString(8).padStart(7, '0'); // End address

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
