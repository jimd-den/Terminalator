import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * DfCommand - Core Command
 *
 * Reports file system disk space usage.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to see usage stats.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class DfCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        // Mock Total Size: 1 GB (approx 2 million 512-blocks)
        const TOTAL_BLOCKS = 2097152; // 1024 * 1024 * 2 = 2G sectors? 1GB is 1024*1024*1024. 512 blocks -> 2097152

        const usedBytes = this.fs.getUsage();
        const usedBlocks = Math.ceil(usedBytes / 512);

        const availableBlocks = TOTAL_BLOCKS - usedBlocks;
        const capacity = Math.round((usedBlocks / TOTAL_BLOCKS) * 100);

        // Header
        let output = 'Filesystem     512-blocks      Used Available Capacity Mounted on\n';

        // Root line
        // rootfs          2097152      123   2097029       1% /
        output += `rootfs         ${TOTAL_BLOCKS.toString().padStart(10)} ${usedBlocks.toString().padStart(9)} ${availableBlocks.toString().padStart(9)} ${capacity.toString().padStart(7)}% /`;

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }
}
