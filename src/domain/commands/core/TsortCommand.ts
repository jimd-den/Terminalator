/**
 * tsort - topological sort (POSIX). Input is pairs of items; a pair of
 * identical items only declares the item. Output order matches GNU tsort
 * (items with no predecessors in lexical order, successors most-recent
 * first). Cycles are reported on stderr and broken; exit status 1.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';
import { readInput } from '../shared/InputFiles';

interface Item { name: string; count: number; succ: Item[]; done: boolean; }

export class TsortCommand extends Utility {
    readonly utility = 'tsort';

    constructor(private fs?: FileSystemService) { super(); }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const operands = args[0] === '--' ? args.slice(1) : args;
        if (operands.length > 1) return this.usage(state, `extra operand '${operands[1]}'`);
        const name = operands[0] ?? '-';
        const input = readInput(context, name);
        if (!input.ok) return this.respond(state, '', [input.error]);

        const tokens = input.data.split(/\s+/).filter(Boolean);
        if (tokens.length % 2) return this.respond(state, '', [`${name}: input contains an odd number of tokens`]);

        const items = new Map<string, Item>();
        const get = (n: string) => {
            let it = items.get(n);
            if (!it) { it = { name: n, count: 0, succ: [], done: false }; items.set(n, it); }
            return it;
        };
        for (let i = 0; i < tokens.length; i += 2) {
            const a = get(tokens[i]);
            const b = get(tokens[i + 1]);
            if (a !== b) { a.succ.unshift(b); b.count++; }
        }

        const sorted = Array.from(items.values()).sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
        const out: string[] = [];
        const errors: string[] = [];
        let remaining = sorted.length;

        while (remaining > 0) {
            const queue = sorted.filter(it => !it.done && it.count === 0);
            if (queue.length === 0) {
                // A loop: report it and break the first edge into its first member.
                const start = sorted.find(it => !it.done)!;
                const loop = this.findLoop(start);
                errors.push(`${name}: input contains a loop:`);
                for (const it of loop) errors.push(it.name);
                const head = loop[0];
                const pred = loop[loop.length - 1];
                pred.succ = pred.succ.filter(s => s !== head);
                head.count--;
                continue;
            }
            for (let qi = 0; qi < queue.length; qi++) {
                const it = queue[qi];
                if (it.done) continue;
                it.done = true;
                remaining--;
                out.push(it.name);
                for (const s of it.succ) {
                    if (--s.count === 0 && !s.done) queue.push(s);
                }
            }
        }
        return this.respond(state, out.length ? out.join('\n') + '\n' : '', errors, errors.length ? 1 : 0);
    }

    /** Follows unfinished successors from `start` until an item repeats. */
    private findLoop(start: Item): Item[] {
        const path: Item[] = [];
        const seen = new Map<Item, number>();
        let cur: Item | undefined = start;
        while (cur && !seen.has(cur)) {
            seen.set(cur, path.length);
            path.push(cur);
            cur = cur.succ.find(s => !s.done);
        }
        return cur ? path.slice(seen.get(cur)) : [start];
    }
}
