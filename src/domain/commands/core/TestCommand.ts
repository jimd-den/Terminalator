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
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class TestCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        const res = this.evaluate(args, state);
        return {
            output: '',
            newState: state,
            exitCode: res ? 0 : 1
        };
    }

    private evaluate(args: string[], state: TerminalState): boolean {
        // console.log("DEBUG: TestCommand evaluate args:", args);
        if (args.length === 0) return false;

        // Strip trailing ] if present (invoked as [ ... ])
        let evalArgs = args;
        if (evalArgs.length > 0 && evalArgs[evalArgs.length - 1] === ']') {
            evalArgs = evalArgs.slice(0, -1);
        }

        // Unary

        // Unary
        if (evalArgs.length === 2 && evalArgs[0].startsWith('-')) {
            const op = evalArgs[0];
            const file = evalArgs[1];
            try {
                // Resolve path
                const path = state.currentDirectory === '/' ? `/${file}` : `${state.currentDirectory}/${file}`; // Naive resolve
                // TODO: use proper resolvePath helper if available or duplicate logic?
                // I'll duplicate simplified logic for now.
                const node = this.fs.resolve(path);

                switch (op) {
                    case '-e': return !!node;
                    case '-d':
                        if (!node) return false;
                        const inode = this.fs.getInode(node.inodeId);
                        return !!(inode!.mode & 0o040000);
                    case '-f':
                        if (!node) return false;
                        const inodeF = this.fs.getInode(node.inodeId);
                        return !(inodeF!.mode & 0o040000); // Rough check for file
                    case '-z': return file.length === 0; // -z string? No, -z checks string length.
                    case '-n': return file.length > 0;
                }
            } catch (e) {
                return false;
            }
        }

        // Binary
        if (evalArgs.length === 3) {
            const a = evalArgs[0];
            const op = evalArgs[1];
            const b = evalArgs[2];

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
        if (evalArgs.length === 1) {
            return evalArgs[0].length > 0;
        }

        return false;
    }
}
