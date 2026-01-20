/**
 * IBinaryRunner - Domain Interface
 *
 * Defines the contract for running executable binaries.
 * Adapters can be:
 * - HostBinaryRunner (executes temp files on host)
 * - VmBinaryRunner (simulates execution within the app VM)
 */

import { CommandResponse } from '../usecases/ExecuteCommand';

export interface IBinaryRunner {
    run(binary: Uint8Array, args: string[], env: Record<string, string>): Promise<CommandResponse>;
}
