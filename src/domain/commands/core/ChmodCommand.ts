/**
 * ChmodCommand - Core Command
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * POSIX chmod - Change file modes (IEEE Std 1003.1-2024)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * The chmod utility shall change any or all of the file mode bits 
 * of the file named by each file operand.
 * 
 * THE EIGHT PILLARS OF THE CRAFT:
 * 1. Strict Architecture: Implements IStructuredCommand.
 * 2. Literate Documentation: Supports octal AND symbolic modes (u+x, etc.).
 * 3. Dependency Minimalism: Uses FileSystemService for application.
 * 5. Performance: O(1) mode calculation.
 * 8. SOLID / KISS: Clean separation of mode parsing and application.
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { CommandResponse } from '../ICommand';
import { CommandBase } from '../CommandBase';
import { CommandCapability } from '../IStructuredCommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';

export class ChmodCommand extends CommandBase {
    public readonly capabilities = [CommandCapability.MODIFY];
    public readonly utility = 'chmod';

    constructor(private fs: FileSystemService) {
        super();
    }

    protected async executeInternal(
        rawArgs: string[],
        flags: Set<string>,
        operands: string[],
        context: ProcessContext,
        state: TerminalState
    ): Promise<CommandResponse> {
        const recursive = flags.has('R');

        if (operands.length < 2) {
            return { output: 'chmod: missing operand', newState: state, exitCode: 1 };
        }

        const modeSpec = operands[0];
        const files = operands.slice(1);

        const errors: string[] = [];

        for (const file of files) {
            try {
                const dentry = this.fs.resolve(file, state.currentDirectory, true, context.user);
                if (!dentry) {
                    errors.push(`chmod: cannot access '${file}': No such file or directory`);
                    continue;
                }

                if (recursive) {
                    this.chmodRecursive(dentry, modeSpec, context.user);
                } else {
                    const inode = this.fs.getInode(dentry.inodeId)!;
                    const newMode = this.calculateMode(inode.mode, modeSpec);
                    this.fs.chmod(file, newMode, state.currentDirectory, context.user);
                }
            } catch (e: any) {
                errors.push(`chmod: ${file}: ${e.message}`);
            }
        }

        return {
            output: errors.join('\n'),
            newState: state,
            exitCode: errors.length > 0 ? 1 : 0
        };
    }

    private chmodRecursive(dentry: any, modeSpec: string, user: any): void {
        const inode = this.fs.getInode(dentry.inodeId)!;
        const newMode = this.calculateMode(inode.mode, modeSpec);
        const path = this.fs.getAbsolutePath(dentry);

        this.fs.chmod(path, newMode, '/', user);

        if (dentry.children) {
            for (const child of dentry.children.values()) {
                this.chmodRecursive(child, modeSpec, user);
            }
        }
    }

    private calculateMode(currentMode: number, spec: string): number {
        if (/^[0-7]+$/.test(spec)) {
            const octal = parseInt(spec, 8);
            return (currentMode & 0o170000) | octal;
        }

        let newMode = currentMode & 0o7777;
        const typeBits = currentMode & 0o170000;

        const clauses = spec.split(',');
        for (const clause of clauses) {
            const match = clause.match(/^([ugoa]*)([+=-])([rwxXstugo]*)$/);
            if (!match) throw new Error(`invalid mode: '${spec}'`);

            const whoStr = match[1] || 'a';
            const op = match[2];
            const permStr = match[3];

            let whoMask = 0;
            if (whoStr.includes('a')) whoMask = 0o777;
            if (whoStr.includes('u')) whoMask |= 0o700;
            if (whoStr.includes('g')) whoMask |= 0o070;
            if (whoStr.includes('o')) whoMask |= 0o007;

            let permBits = 0;
            if (permStr.includes('r')) permBits |= 0o444;
            if (permStr.includes('w')) permBits |= 0o222;
            if (permStr.includes('x')) permBits |= 0o111;

            permBits &= whoMask;

            if (op === '+') {
                newMode |= permBits;
            } else if (op === '-') {
                newMode &= ~permBits;
            } else if (op === '=') {
                newMode = (newMode & ~whoMask) | permBits;
            }
        }

        return typeBits | newMode;
    }
}