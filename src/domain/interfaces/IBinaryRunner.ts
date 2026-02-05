/**
 * IBinaryRunner - Domain Interface
 *
 * Defines the contract for running executable binaries.
 * Adapters can be:
 * - HostBinaryRunner (executes temp files on host)
 * - VmBinaryRunner (simulates execution within the app VM)
 */

import { CommandResponse } from '../entities/Command';
import { IStream } from '../entities/Stream';
import { FileSystemService } from '../services/FileSystemService';

export interface ExecutionContext {
    stdin: IStream;
    stdout: IStream;
    stderr: IStream;
    fs: FileSystemService;
    env: Record<string, string>;
}

export interface IBinaryRunner {
    run(binary: Uint8Array, args: string[], context: ExecutionContext): Promise<CommandResponse>;
}
