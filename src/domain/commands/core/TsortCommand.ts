import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * TsortCommand - Core Command
 *
 * Topological sort.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Sort nodes based on partial ordering.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystem } from '../../entities/FileSystem';

export class TsortCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        const file = args.find(a => !a.startsWith('-'));

        let content = '';
        if (file) {
            try {
                content = this.fs.readFile(this.resolvePath(file, state));
            } catch (e) {
                return { output: `tsort: ${file}: No such file`, newState: state, exitCode: 1 };
            }
        } else if (input) {
            content = input;
        } else {
            return { output: '', newState: state, exitCode: 0 };
        }

        const items = content.trim().split(/\s+/).filter(x => x);

        if (items.length % 2 !== 0) {
            return { output: 'tsort: odd input', newState: state, exitCode: 1 };
        }

        const adj = new Map<string, string[]>();
        const inDegree = new Map<string, number>();
        const nodes = new Set<string>();

        // Build Graph
        for (let i = 0; i < items.length; i += 2) {
            const u = items[i];
            const v = items[i + 1];
            nodes.add(u);
            nodes.add(v);

            if (!adj.has(u)) adj.set(u, []);
            adj.get(u)!.push(v);

            if (!inDegree.has(v)) inDegree.set(v, 0);
            if (!inDegree.has(u)) inDegree.set(u, 0);

            inDegree.set(v, (inDegree.get(v) || 0) + 1);
        }

        // Kahn's Algorithm
        const queue: string[] = [];
        const result: string[] = [];

        // Init queue with in-degree 0
        for (const node of nodes) {
            if ((inDegree.get(node) || 0) === 0) {
                queue.push(node);
            }
        }

        // Simple stable sort for determinism?
        queue.sort();

        while (queue.length > 0) {
            const u = queue.shift()!;
            result.push(u);

            const neighbors = adj.get(u) || [];
            for (const v of neighbors) {
                inDegree.set(v, (inDegree.get(v) || 0) - 1);
                if (inDegree.get(v) === 0) {
                    queue.push(v);
                }
            }
            queue.sort(); // Maintain order for determinism within levels if needed
        }

        // Check for cycles (remaining nodes)
        if (result.length !== nodes.size) {
            // Cycle detected. Output remaining nodes?
            // POSIX says: write message to stderr, and write cycle.
            // Simplified: Output what we have, then the rest.
            for (const node of nodes) {
                if (!result.includes(node)) {
                    result.push(node);
                }
            }
        }

        return {
            output: result.join('\n'),
            newState: state,
            exitCode: 0
        };
    }

    private resolvePath(path: string, state: TerminalState): string {
        if (path.startsWith('/')) return path;
        return state.currentDirectory === '/' ? `/${path}` : `${state.currentDirectory}/${path}`;
    }
}
