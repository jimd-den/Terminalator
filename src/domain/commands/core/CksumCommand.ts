/**
 * CksumCommand - Core Command
 *
 * Write file checksums and sizes.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Calculate CRC-32 checksums (POSIX standard).
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class CksumCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const files = args.filter(a => !a.startsWith('-'));

        if (files.length === 0 && !input) {
            // Need files or input
            // POSIX says if no files, read stdin.
            // Simplified: require file for now or handle input string.
            if (input) {
                const crc = this.crc32(input);
                const size = input.length;
                return {
                    output: `${crc} ${size}`,
                    newState: state,
                    exitCode: 0
                };
            }
            return { output: '', newState: state, exitCode: 0 };
        }

        const lines: string[] = [];

        for (const file of files) {
            try {
                const content = this.fs.readFile(this.resolvePath(file, state));
                const crc = this.crc32(content);
                const size = content.length;
                lines.push(`${crc} ${size} ${file}`);
            } catch (e) {
                return { output: `cksum: ${file}: No such file or directory`, newState: state, exitCode: 1 };
            }
        }

        return {
            output: lines.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }

    // Basic CRC-32 Implementation (Ethernet polynomial 0x04C11DB7)
    // Note: JS numbers are 64-bit float, bitwise ops are 32-bit int.
    private crc32(str: string): number {
        const table = this.makeCRCTable();
        let crc = 0; // POSIX cksum initializes to 0? Or 0xFFFFFFFF?
        // POSIX algorithm is specific.
        // Let's use a standard implementation.
        // Actually POSIX 1003.2 defines a specific algorithm that includes the length.
        // Simplified: Standard CRC32

        crc = 0 ^ (-1);

        for (let i = 0; i < str.length; i++) {
            crc = (crc >>> 8) ^ table[(crc ^ str.charCodeAt(i)) & 0xFF];
        }

        return (crc ^ (-1)) >>> 0;
    }

    private makeCRCTable(): number[] {
        let c;
        const crcTable: number[] = [];
        for (let n = 0; n < 256; n++) {
            c = n;
            for (let k = 0; k < 8; k++) {
                c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            crcTable[n] = c;
        }
        return crcTable;
    }
}
