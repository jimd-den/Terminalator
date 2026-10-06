/**
 * cat - concatenate and print files (POSIX), with the common display
 * options -n -b -s -E -T -v -A. Continues past unreadable operands and
 * reports each one on stderr, exiting 1 if any failed.
 */
import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse, CommandMetadata } from '../../entities/Command';
import { FileSystemService } from '../../services/FileSystemService';
import { readInput, readInputBytes } from '../shared/InputFiles';
import { bytesToBinaryString } from '../../services/shell/io/OutputSink';
import { TheatricalVerb } from '../../services/PresentationDirector';

export class CatCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.READ];
    public readonly utility = 'cat';

    constructor(private fs?: FileSystemService) {
        super();
    }

    public getMetadata(): CommandMetadata {
        return { verb: TheatricalVerb.EXTRACT, style: 'NORMAL' };
    }

    protected executeInternal(_raw: string[], flags: Set<string>, operands: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const bad = [...flags].find(f => !'unbsETvAet'.includes(f));
        if (bad) return { output: '', stderr: `cat: invalid option -- '${bad}'\n`, exitCode: 1, newState: state };

        const show = (c: string) => flags.has(c) || (flags.has('A') && 'vET'.includes(c)) || (flags.has('e') && 'vE'.includes(c)) || (flags.has('t') && 'vT'.includes(c));
        const decorate = show('n') || show('b') || show('s') || show('E') || show('T') || show('v');

        let output = '';
        const errors: string[] = [];
        let lineNo = 0;
        let lastBlank = false;

        if (!decorate) {
            // Plain cat copies bytes exactly (binary-safe).
            for (const operand of operands.length ? operands : ['-']) {
                const input = readInputBytes(context, operand);
                if (!input.ok) { errors.push(`cat: ${input.error}`); continue; }
                output += bytesToBinaryString(input.data);
            }
            return {
                output, binary: true,
                stderr: errors.length ? errors.join('\n') + '\n' : undefined,
                exitCode: errors.length ? 1 : 0,
                newState: state,
            };
        }

        for (const operand of operands.length ? operands : ['-']) {
            const input = readInput(context, operand);
            if (!input.ok) { errors.push(`cat: ${input.error}`); continue; }

            for (const line of input.data.match(/[^\n]*\n|[^\n]+$/g) ?? []) {
                const hasNl = line.endsWith('\n');
                let body = hasNl ? line.slice(0, -1) : line;
                const blank = body === '';
                if (show('s') && blank && lastBlank) continue;
                lastBlank = blank;
                if (show('v')) body = body.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, c => (c === '\x7f' ? '^?' : '^' + String.fromCharCode(c.charCodeAt(0) + 64)));
                if (show('T')) body = body.replace(/\t/g, '^I');
                let prefix = '';
                if (show('b') ? !blank : show('n')) prefix = `${String(++lineNo).padStart(6)}\t`;
                output += prefix + body + (show('E') && hasNl ? '$' : '') + (hasNl ? '\n' : '');
            }
        }

        return {
            output,
            stderr: errors.length ? errors.join('\n') + '\n' : undefined,
            exitCode: errors.length ? 1 : 0,
            newState: state,
        };
    }
}
