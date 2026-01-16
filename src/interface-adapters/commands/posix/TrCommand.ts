import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class TrCommand implements ICommand {
    name = 'tr';
    description = 'Translate or delete characters';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        let set1 = '';
        let set2 = '';
        const deleteMode = args.includes('-d');
        const squeezeMode = args.includes('-s'); // TODO: implement squeeze

        const cleanArgs = args.filter(a => !a.startsWith('-'));

        if (cleanArgs.length < 1) {
            return { output: 'tr: missing operand', exitCode: 1 };
        }

        set1 = cleanArgs[0];
        if (cleanArgs.length > 1) {
            set2 = cleanArgs[1];
        }

        const input = context.stdin || '';

        let output = input;

        if (deleteMode) {
            // Delete chars in set1
            const charsToDelete = this.expandSet(set1);
            // Create regex
            const regex = new RegExp(`[${escapeRegExp(charsToDelete)}]`, 'g');
            output = output.replace(regex, '');
        } else {
            // Translate
            if (!set2) {
                return { output: 'tr: missing set2', exitCode: 1 };
            }
            const s1 = this.expandSet(set1);
            const s2 = this.expandSet(set2);

            output = output.split('').map(c => {
                const index = s1.indexOf(c);
                if (index !== -1) {
                    // map to s2
                    // if s2 shorter, repeat last char (standard behavior usually)
                    const replaceChar = index < s2.length ? s2[index] : s2[s2.length - 1];
                    return replaceChar;
                }
                return c;
            }).join('');
        }

        return {
            output: output,
            exitCode: 0
        };
    }

    private expandSet(set: string): string {
        // Handle a-z ranges
        // Simple expansion: a-z -> abc...z
        // Not full implementation
        let res = '';
        for (let i = 0; i < set.length; i++) {
            if (i + 2 < set.length && set[i + 1] === '-') {
                const start = set.charCodeAt(i);
                const end = set.charCodeAt(i + 2);
                for (let c = start; c <= end; c++) {
                    res += String.fromCharCode(c);
                }
                i += 2;
            } else {
                res += set[i];
            }
        }
        return res;
    }
}

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
