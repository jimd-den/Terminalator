import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * DuCommand - Core Command
 *
 * Estimates file space usage.
 *
 * Pillar: The Four-Fold Shield (Strict Architecture)
 * Pillar: The Swift Stream (Performance)
 * Pillar: The Storyteller’s Code (Literate Documentation)
 *
 * Intent:
 * Allows the operator to measure disk usage.
 */

import { ICommand } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';

import { FileSystemService } from '../../services/FileSystemService';
import { Dentry } from '../../entities/FileSystem';
import { DirectoryNode } from '../../entities/filesystem/DirectoryNode';

export class DuCommand implements ICommand {
    constructor(private fs: FileSystemService) { }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const input = getStdinAsString(context);
        const files = args.filter(arg => !arg.startsWith('-'));

        // POSIX default: 512-byte units.
        // We do not implement -k or -h yet, but straightforward to add.

        if (files.length === 0) {
            files.push('.');
        }

        const report: { size: number, path: string }[] = [];

        for (const filename of files) {
            let path = filename;
            // . handling
            if (path === '.') path = state.currentDirectory;

            if (!path.startsWith('/')) {
                path = state.currentDirectory === '/'
                    ? `/${filename}`
                    : `${state.currentDirectory}/${filename}`;
            }

            const node = this.fs.resolve(path);
            if (!node) {
                return {
                    output: `du: cannot access '${filename}': No such file or directory`,
                    newState: state,
                    exitCode: 1
                };
            }

            // Recursive size calculation
            // du outputs statistics for arguments. If directory, it traverses and outputs stats for subdirectories and finally the directory itself.
            // "By default, the output shall contain an entry for each file... that is a directory... and for each operand"
            // Wait, does `du` output files inside directory by default? NO. Only if -a is specified.
            // By default `du dir` outputs subdirectories and the dir itself.
            // But if operand is a file, it outputs it.

            // My test expectation was: "1 /du_dir/f1" followed by "9 /du_dir".
            // That implies `du dir` outputs files inside? 
            // Checking standard `du`: `du dir` ONLY outputs subdirectories.
            // `du -a dir` outputs all files.

            // However, my test case added `f1`. If I want to pass my test, `du` must output files?
            // "1 /du_dir/f1" 
            // Wait, if `f1` is just a file in `du_dir`, standard `du` won't show it unless `-a`.
            // Re-reading test: 
            /*
            command: 'du /du_dir',
            expectedOutput: /1\s+\/du_dir\/f1[\s\S]*9\s+\/du_dir/
            */
            // I wrote a test expecting `-a` behavior without `-a` flag?
            // "du reports directory size recursively"
            // I should fix the test or implement `-a` by default?
            // POSIX `du` without `-a` only writes directories.
            // So my test expectation is strict POSIX *violation* if I expect `f1` in output without `-a`.

            // But wait, if I run `du -a`, I get files.
            // Let's implement `-a` behavior if requested, OR default to strict POSIX?
            // If I default to strict POSIX, `f1` won't show.
            // Total `9 /du_dir` is correct though (8 for dir + 1 for file).

            // Strategy: I will implement `du` strictly. I should update the test to expect ONLY `/du_dir` line?
            // OR I update test to use `du -a`?
            // Or I implement `du` to act like `du -a` for now?
            // A lot of "simple" du implementations show everything.
            // But I want POSIX compliance.
            // POSIX: "du - estimate file space usage... by default... files of type directory".
            // So `f1` should NOT be shown.

            // I'll update the test expectation in the next step (REFACTOR) or fix implementation to be compliant?
            // Implementation: Recursive calc, but only collect report for Dirs (unless -a) OR if it was an explicit operand.

            // Let's implement proper logic:
            // 1. Calculate size of Tree.
            // 2. Collect entries to print.
            //    - If operand is file -> print.
            //    - If operand is dir -> print it (and recursively subdirs).

            this.traverse(node, path, report, true); // root is operand, always print
        }

        const output = report.map(r => `${r.size}\t${r.path}`).join('\n');

        return {
            output: output,
            newState: state,
            exitCode: 0
        };
    }

    private traverse(node: Dentry, path: string, report: { size: number, path: string }[], isOperand: boolean): number {
        const BLOCK_SIZE = 512;

        let sizeBytes = 0;

        if (this.fs.isDirectory(node)) {
            sizeBytes = 4096; // 4KB for directory metadata structure
            // Children
            // Use 'children' property? FileSystem Dentry doesn't expose children directly if it acts as just a pointer?
            // wait, Dentry has children map?
            // In FileSystem.ts: interface Dentry { ... children: Map<string, Dentry>; ... }
            // Yes.

            for (const [name, child] of (node as DirectoryNode).children) {
                const childPath = path === '/' ? `/${name}` : `${path}/${name}`;
                // Recursively add child size
                // Pass false for isOperand
                const childSize = this.traverse(child, childPath, report, false);
                sizeBytes += childSize * BLOCK_SIZE; // childSize is in blocks
            }
        } else {
            // File
            // Need content length.
            // Dentry -> Inode -> content?
            // Inode has content (string).
            // Dentry has inodeId.
            // We need fs.getInode(id).
            // Is getInode public? We established earlier it might NOT be.
            // BUT, `fs.readFile(path)` is public.
            // We can resolve content by reading? Expensive but works.
            try {
                // If it's a directory, readFile throws? We checked isDirectory.
                const content = this.fs.readFile(path);
                sizeBytes = content.length;
            } catch (e) {
                // Should not happen if locking/concurrency not issue
                sizeBytes = 0;
            }
        }

        const blocks = Math.ceil(sizeBytes / BLOCK_SIZE);

        // Report Logic
        // Print if:
        // 1. It is a Directory
        // 2. OR it is an explicit Operand
        // 3. OR -a is set (not impl yet)

        // Note: Standard du prints children BEFORE parent (post-order).
        // My recursion does this naturally if I push to report AFTER children loop.

        if (this.fs.isDirectory(node) || isOperand) {
            report.push({ size: blocks, path: path }); // path usually full path
        }

        return blocks;
    }
}
