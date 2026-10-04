import { CommandResponse } from '../../entities/Command';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { IStructuredCommand, CommandCapability } from '../IStructuredCommand';
import { defaultBuildArgs } from '../CommandBase';

/**
 * Utility - base for utilities that follow the conventions in this folder:
 * diagnostics collected as "name: message" lines on stderr, output on stdout.
 */
export abstract class Utility implements IStructuredCommand {
    abstract readonly utility: string;
    readonly capabilities: CommandCapability[] = [];

    abstract execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse | Promise<CommandResponse>;

    buildArgs(requirements: Record<string, any>): string[] {
        return defaultBuildArgs(requirements);
    }

    protected respond(state: TerminalState, output: string, errors: string[] = [], status?: number, binary = false): CommandResponse {
        return {
            output,
            binary: binary || undefined,
            stderr: errors.length ? errors.map(e => `${this.utility}: ${e}`).join('\n') + '\n' : undefined,
            exitCode: status ?? (errors.length ? 1 : 0),
            newState: state,
        };
    }

    protected usage(state: TerminalState, message: string, status = 1): CommandResponse {
        return this.respond(state, '', [message], status);
    }
}

/** Parses a non-negative decimal integer option value, or returns null. */
export function parseCount(value: string | true | undefined): number | null {
    if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) return null;
    return parseInt(value, 10);
}
