/**
 * TailCommand - Core Command
 *
 * Output the last part of files.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to view the end of files.
 */

import { ICommand } from '../ICommand';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../usecases/ExecuteCommand';
import { FileSystem } from '../../entities/FileSystem';

export class TailCommand implements ICommand {
    constructor(private fs: FileSystem) { }

    execute(args: string[], state: TerminalState, input?: string): CommandResponse {
        let linesToPrint = 10;

        // Similar strict parsing to HeadCommand
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-n') {
                if (i + 1 < args.length) {
                    linesToPrint = parseInt(args[i + 1]);
                }
            }
        }

        // Improved parsing to avoid filtering out numeric filenames
        const targets: string[] = [];
        let skipNext = false;

        for (let i = 0; i < args.length; i++) {
            if (skipNext) {
                skipNext = false;
                continue;
            }

            if (args[i] === '-n') {
                if (i + 1 < args.length) {
                    linesToPrint = parseInt(args[i + 1]);
                    skipNext = true;
                } else {
                    return {
                        output: 'tail: option requires an argument -- n',
                        newState: state,
                        exitCode: 1
                    };
                }
            } else if (args[i].startsWith('-') && args[i] !== '-') {
                 // ignore other flags
            } else {
                targets.push(args[i]);
            }
        }

        const getTail = (content: string): string => {
            // Split by newline.
            // If the file ends with \n, split gives ["line1", "line2", ""].
            // Tail should return the last N lines.
            // If we just use split('\n'), we get the empty string at end.
            const lines = content.split('\n');

            // If the last element is empty (caused by trailing newline), we generally preserve it in output
            // effectively, "tail -n 1" on "a\n" should output "a\n".
            // split gives ["a", ""]. slice(-1) gives [""]. join gives "". Wrong.
            // slice(-2) gives ["a", ""]. join gives "a\n". Correct.

            // Actually, let's treat lines properly.
            // If content is empty, lines is [""] -> output "" (correct)
            // If content "a", lines ["a"] -> output "a" (correct)
            // If content "a\n", lines ["a", ""] -> tail -n 1 should be "a\n".
            // "a\n" is 1 line technically? No, it's 1 line ending in newline.
            // wc -l "a\n" says 1.
            // wc -l "a" says 0 (in some POSIX) or 1?
            // In this project, `wc` says "a\n" is 1 line.

            // Let's rely on slice logic.
            // If we have trailing empty string, it means the last line ended with \n.
            // We want the last N lines.

            // If we have ["a", "b", ""], that's 2 lines: "a" and "b".
            // If N=1, we want "b\n".
            // If we take slice(-1) of ["a", "b", ""], we get [""].

            // We should ignore the last empty element for counting, but include it in result?

            let effectiveLines = lines;
            let hasTrailing = false;
            if (lines.length > 0 && lines[lines.length - 1] === '') {
                effectiveLines = lines.slice(0, -1);
                hasTrailing = true;
            }

            const snippet = effectiveLines.slice(-linesToPrint);

            // Re-add trailing newline if it existed and we picked the last line?
            // Or simpler: join with \n.

            let output = snippet.join('\n');
            if (hasTrailing && snippet.length > 0) {
                 // If we picked lines from the end, and the original had a trailing newline,
                 // we should probably append it back if the last line we picked was indeed the last line of file.
                 // Since we are tailing, we ARE picking the last lines.
                 output += '\n';
            }

            return output;
        };

        if (targets.length === 0) {
            if (input !== undefined) {
                return { output: getTail(input), newState: state, exitCode: 0 };
            } else {
                return { output: '', newState: state, exitCode: 0 };
            }
        }

        const filename = targets[0];
        let path = filename;

        if (!path.startsWith('/')) {
            path = state.currentDirectory === '/' ? `/${filename}` : `${state.currentDirectory}/${filename}`;
        }

        try {
            const content = this.fs.readFile(path);
            return {
                output: getTail(content),
                newState: state,
                exitCode: 0
            };
        } catch (error: any) {
            return {
                output: `tail: cannot open '${filename}' for reading: No such file or directory`,
                newState: state,
                exitCode: 1
            };
        }
    }
}
