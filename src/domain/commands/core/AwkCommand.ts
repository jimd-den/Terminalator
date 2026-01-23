/**
 * AwkCommand - Core Command
 *
 * Pattern scanning and processing language.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to process text columns.
 *
 * Note:
 * Uses `new Function` to simulate the AWK interpreter. This is acceptable within the
 * context of a client-side simulation where the "environment" is already sandboxed
 * by the browser/runtime, but would be a security risk in a server-side shell.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystemService } from '../../services/FileSystemService';

export class AwkCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = context.stdin;
        let program = '';
        const files: string[] = [];
        let fieldSeparator = ' ';

        let skipNext = false;
        for (let i = 0; i < args.length; i++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }
            const arg = args[i];
            if (arg.startsWith('-F')) {
                if (arg.length > 2) {
                    fieldSeparator = arg.substring(2);
                } else if (i + 1 < args.length) {
                    fieldSeparator = args[i + 1];
                    skipNext = true;
                }
            } else if (!program && !arg.startsWith('-')) {
                program = arg;
            } else if (arg.startsWith('-')) {
                // flags ignored for now
            } else {
                files.push(arg);
            }
        }

        if (!program) {
            return { output: 'awk: missing program', newState: state, exitCode: 1 };
        }

        // Robustness: Strip surrounding quotes if the parser left them
        if ((program.startsWith("'") && program.endsWith("'")) || (program.startsWith('"') && program.endsWith('"'))) {
            program = program.slice(1, -1);
        }

        const { beginBlock, mainBlock, endBlock, mainPattern } = this.parseProgram(program);

        let output = '';

        // Execute BEGIN
        if (beginBlock) {
            const res = this.executeAction(beginBlock, '', [], 0, 0);
            if (res !== null) output += res + '\n';
        }

        // Process Input
        if (mainBlock || mainPattern || (!beginBlock && !endBlock)) {
            let content = '';
            let hasInput = false;

            if (files.length > 0) {
                hasInput = true;
                for (const file of files) {
                    try {
                        const path = file.startsWith('/') ? file : (state.currentDirectory === '/' ? `/${file}` : `${state.currentDirectory}/${file}`);
                        content += this.fs.readFile(path) + '\n';
                    } catch (e: any) {
                        return { output: `awk: ${file}: ${e.message}`, newState: state, exitCode: 1 };
                    }
                }
                if (content.endsWith('\n')) content = content.slice(0, -1);
            } else if (input !== undefined) {
                hasInput = true;
                content = input;
            }

            if (!hasInput && !beginBlock && !endBlock) {
                return { output: 'awk: no input', newState: state, exitCode: 1 };
            }

            if (hasInput && content) {
                const lines = content.split('\n');
                let NR = 0;
                for (const line of lines) {
                    // if (line === '') continue; // Empty lines should be processed in awk? Yes, usually.
                    NR++;

                    let matches = true;
                    if (mainPattern) {
                        try {
                            const regex = new RegExp(mainPattern);
                            if (!regex.test(line)) matches = false;
                        } catch {
                            matches = false;
                        }
                    }

                    if (matches) {
                        let fields: string[];
                        if (fieldSeparator === ' ') {
                            fields = line.trim().split(/\s+/);
                            if (fields.length === 1 && fields[0] === '') fields = []; // Handle empty line split
                        } else {
                            fields = line.split(fieldSeparator);
                        }
                        const NF = fields.length;

                        // Default action is print $0
                        const action = mainBlock || 'print $0';
                        const res = this.executeAction(action, line, fields, NR, NF);
                        if (res !== null) output += res + '\n';
                    }
                }
            }
        }

        // Execute END
        if (endBlock) {
            const res = this.executeAction(endBlock, '', [], 0, 0);
            if (res !== null) output += res + '\n';
        }

        return {
            output: output.trimEnd(),
            newState: state,
            exitCode: 0
        };
    }

    private parseProgram(prog: string) {
        let beginBlock = '';
        let endBlock = '';
        let mainBlock = '';
        let mainPattern = '';

        let remaining = prog.trim();

        // Helper to extract block starting at index
        const extractBlock = (str: string, startIndex: number): { block: string, length: number } | null => {
            let depth = 0;
            for (let i = startIndex; i < str.length; i++) {
                if (str[i] === '{') depth++;
                else if (str[i] === '}') {
                    depth--;
                    if (depth === 0) {
                        return { block: str.substring(startIndex + 1, i), length: i - startIndex + 1 };
                    }
                }
            }
            return null;
        };

        // Check BEGIN
        const beginMatch = remaining.match(/^BEGIN\s*\{/);
        if (beginMatch) {
            const extracted = extractBlock(remaining, remaining.indexOf('{'));
            if (extracted) {
                beginBlock = extracted.block;
                remaining = remaining.substring(extracted.length + beginMatch[0].length - 1).trim();
            }
        }

        // Check END
        const endMatch = remaining.match(/^END\s*\{/);
        if (endMatch) {
            const extracted = extractBlock(remaining, remaining.indexOf('{'));
            if (extracted) {
                endBlock = extracted.block;
                remaining = remaining.substring(extracted.length + endMatch[0].length - 1).trim();
            }
        }

        // Remaining is main
        const patternMatch = remaining.match(/^\/(.+)\/\s*\{/);
        if (patternMatch) {
            mainPattern = patternMatch[1];
            const startIdx = remaining.indexOf('{');
            const extracted = extractBlock(remaining, startIdx);
            if (extracted) {
                mainBlock = extracted.block;
            }
        } else if (remaining.startsWith('{')) {
            const extracted = extractBlock(remaining, 0);
            if (extracted) mainBlock = extracted.block;
        } else if (remaining.length > 0) {
            // Implicit print if pattern given without block, or simple block guess
            // For now, treat as pattern with default action
            mainPattern = remaining;
            mainBlock = 'print $0';
        }

        return { beginBlock, endBlock, mainBlock, mainPattern };
    }

    private executeAction(actionCode: string, line: string, fields: string[], NR: number, NF: number): string | null {
        const code = actionCode.trim();
        if (code.startsWith('print')) {
            let expr = code.substring(5).trim();
            if (expr === '') expr = '$0';

            // Variable substitution
            // We substitute larger indices first to avoid partial matches on $1 vs $10
            for (let i = fields.length + 10; i >= 0; i--) { // Check higher indices comfortably
                const val = i === 0 ? line : (fields[i - 1] || '');
                // Replace $i with value string
                // Using split/join is safe against regex special chars
                // We wrap the value in quotes for JS eval
                const safeVal = JSON.stringify(val);
                expr = expr.split(`$${i}`).join(safeVal);
            }

            // Replace globals
            expr = expr.split('NF').join(NF.toString());
            expr = expr.split('NR').join(NR.toString());

            try {
                // Dangerous eval, but scoped
                // If the expr ends up as "val1" "val2", implicit concatenation in awk?
                // JS doesn't support space concat.
                // We might need to ensure comma separation in print becomes space?
                // 'print $1, $2' -> 'print "a", "b"'.
                // If we simply eval "a", "b", it returns "b" (comma operator).
                // Awk print joins with OFS (space).
                // We should handle commas in expr.
                // Replace ',' with '+" "+'. 
                // But only outside quotes! Too complex for simple parsing.
                // Simplified: Assuming simple expressions for now.

                const result = new Function(`return ${expr}`)();
                return String(result);
            } catch (e) {
                // Fallback: return raw expr with quotes stripped?
                return expr.replace(/"/g, '');
            }
        }
        return null;
    }
}
