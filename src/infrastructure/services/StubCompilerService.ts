/**
 * StubCompilerService - Infrastructure Layer
 *
 * A mocked implementation of ICompilerService for React Native / Prototyping.
 * Simulates successful compilation by producing a valid ELF header (simulated).
 */

import { ICompilerService, CompilerOptions } from '../../domain/interfaces/ICompilerService';

export class StubCompilerService implements ICompilerService {
    async compile(sourceFiles: string[], options: CompilerOptions): Promise<Uint8Array> {
        // Create a dummy buffer
        // ELF Magic Number: 0x7F 'E' 'L' 'F'
        const buffer = new Uint8Array(64);
        buffer.set([0x7f, 0x45, 0x4c, 0x46]);

        // Maybe embed some metadata string
        const encoder = new TextEncoder();
        const msg = encoder.encode("StubBinary");
        buffer.set(msg, 4);

        return buffer;
    }
}
