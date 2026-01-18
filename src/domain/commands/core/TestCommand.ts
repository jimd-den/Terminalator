/**
 * TestCommand - Core Command
 *
 * Evaluate condition.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Conditional checks.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class TestCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        const res = this.evaluate(args, state);
        return {
            output: '',
            newState: state,
            exitCode: res ? 0 : 1
        };
    }

    private evaluate(args: string[], state: TerminalState): boolean {
        if (args.length === 0) return false;

        // [ expr ] format is handled by shell removing [ and ].
        // We assume args are the expression.

        // Unary
        if (args.length === 2 && args[0].startsWith('-')) {
            const op = args[0];
            const file = args[1];
            try {
                // Resolve path
                const path = state.currentDirectory === '/' ? `/${file}` : `${state.currentDirectory}/${file}`; // Naive resolve
                // TODO: use proper resolvePath helper if available or duplicate logic?
                // I'll duplicate simplified logic for now.
                const node = this.fs.resolveNode(path);

                switch (op) {
                    case '-e': return !!node;
                    case '-d':
                        if (!node) return false;
                        const inode = this.fs.getInode(node.inodeId);
                        return !!(inode.mode & 0o040000);
                    case '-f':
                        if (!node) return false;
                        const inodeF = this.fs.getInode(node.inodeId);
                        return !(inodeF.mode & 0o040000); // Rough check for file
                    case '-z': return file.length === 0; // -z string? No, -z checks string length.
                    case '-n': return file.length > 0;
                }
            } catch (e) {
                return false;
            }
        }

        // Binary
        if (args.length === 3) {
            const a = args[0];
            const op = args[1];
            const b = args[2];

            switch (op) {
                case '=': return a === b;
                case '!=': return a !== b;
                case '-eq': return parseInt(a) === parseInt(b);
                case '-ne': return parseInt(a) !== parseInt(b);
                case '-gt': return parseInt(a) > parseInt(b);
                case '-lt': return parseInt(a) < parseInt(b);
            }
        }

        // Single argument (string)
        if (args.length === 1) {
            return args[0].length > 0;
        }

        return false;
    }
}
