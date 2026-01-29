import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * ExprCommand - Core Command
 *
 * Evaluate arguments as an expression.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 *
 * Intent:
 * Arithmetic and string operations.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystem } from '../../entities/FileSystem';

export class ExprCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        if (args.length === 0) {
            return { output: 'expr: missing operand', newState: state, exitCode: 2 };
        }

        // Simplified expression parser
        // Supports: integer arithmetic (+ - * / %), logical | &, comparison < <= = != >= >
        // We will just eval a sanitized string? No, "eval" is dangerous and violates pillars generally.
        // We must parse.
        // Simplified: left-associative processing.
        // "1 + 2" -> 3

        try {
            const res = this.evaluate(args);
            return {
                output: res.toString(),
                newState: state,
                exitCode: res === 0 || res === '0' || res === '' ? 1 : 0
            };
        } catch (e: any) {
            return { output: `expr: syntax error: ${e.message}`, newState: state, exitCode: 2 };
        }
    }

    private evaluate(args: string[]): number | string {
        // Very simple parser handling 3 args: A op B
        // POSIX expr is complex.
        // Let's handle simple cases first.

        if (args.length === 1) {
            return args[0];
        }

        if (args.length === 3) {
            const a = args[0];
            const op = args[1];
            const b = args[2];

            const numA = parseInt(a);
            const numB = parseInt(b);
            const isNum = !isNaN(numA) && !isNaN(numB);

            switch (op) {
                case '+': return numA + numB;
                case '-': return numA - numB;
                case '*': return numA * numB;
                case '/': return Math.floor(numA / numB);
                case '%': return numA % numB;
                case '=': return (a === b) ? 1 : 0; // POSIX strings unless ints? POSIX: if both numeric, compare numeric.
                case '!=': return (a !== b) ? 1 : 0;
                // For comparisons, prefer numeric if possible
                case '>': return (isNum ? numA > numB : a > b) ? 1 : 0;
                case '>=': return (isNum ? numA >= numB : a >= b) ? 1 : 0;
                case '<': return (isNum ? numA < numB : a < b) ? 1 : 0;
                case '<=': return (isNum ? numA <= numB : a <= b) ? 1 : 0;
            }
        }

        return args.join(' '); // Fallback
    }
}
