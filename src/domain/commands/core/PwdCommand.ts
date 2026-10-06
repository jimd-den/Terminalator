import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * PwdCommand - Core Command
 *
 * Prints the current working directory.
 *
 * Pillar: The Swift Stream (Performance & Purity)
 * Pillar: The Balanced Scale (SOLID / KISS)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Helps the operator understand their current location in the file system.
 * Refactored to implement IStructuredCommand for combinatorial scaling.
 */

import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse, CommandMetadata } from '../../entities/Command';
import { TheatricalVerb } from '../../services/PresentationDirector';

import { FileSystemService } from '../../services/FileSystemService';

export class PwdCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.READ];
    public readonly utility = 'pwd';

    constructor(private fs: FileSystemService) {
        super();
    }

    public getMetadata(): CommandMetadata {
        return {
            verb: TheatricalVerb.SCAN,
            style: 'NORMAL'
        };
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        return {
            output: state.currentDirectory + '\n',
            newState: state,
            exitCode: 0
        };
    }
}