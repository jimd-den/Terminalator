/**
 * AsmChecker - Use Case Layer
 * 
 * Implements syntax checking for RISC-V assembly code.
 * Validates mnemonics, registers, labels, and directives.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Use Cases
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * Pillar: THE BALANCED SCALE (SOLID)
 * 
 * Intent:
 * Catches assembly errors (typos, invalid registers) before execution.
 * Ensures the Assembler will be able to process the source.
 */

import { SyntaxChecker, SyntaxError } from '../../ports/SyntaxChecker';

export class AsmChecker implements SyntaxChecker {
    readonly language = 'asm';

    private validMnemonics = new Set([
        'add', 'sub', 'addi', 'lw', 'sw', 'beq', 'bne', 'jal', 'ecall',
        'li', 'mv', 'nop', 'la'
    ]);

    private validDirectives = new Set([
        '.string', '.word'
    ]);

    private registerRegex = /^(x\d+|zero|ra|sp|gp|tp|t[0-6]|s[0-1]1|s[0-9]|fp|a[0-7])$/i;

    check(source: string): SyntaxError[] {
        const errors: SyntaxError[] = [];
        const lines = source.split('\n');

        lines.forEach((line, index) => {
            const trimmedLine = line.split(';')[0].trim();
            if (!trimmedLine) return;

            // Handle labels
            let activeLine = trimmedLine;
            const labelMatch = activeLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*):(.*)$/);
            if (labelMatch) {
                activeLine = labelMatch[2].trim();
                if (!activeLine) return;
            }

            // Handle components
            if (activeLine.startsWith('.')) {
                const parts = activeLine.split(/\s+/);
                if (!this.validDirectives.has(parts[0].toLowerCase())) {
                    errors.push({
                        line: index + 1,
                        column: trimmedLine.indexOf(parts[0]) + 1,
                        message: `Unknown directive: ${parts[0]}`,
                        severity: 'error'
                    });
                }
                return;
            }

            const parts = activeLine.split(/[,\s]+/).filter(p => p.length > 0);
            const mnemonic = parts[0].toLowerCase();

            if (!this.validMnemonics.has(mnemonic)) {
                errors.push({
                    line: index + 1,
                    column: trimmedLine.indexOf(parts[0]) + 1,
                    message: `Unknown mnemonic: ${parts[0]}`,
                    severity: 'error'
                });
                return;
            }

            // Basic register validation for common instructions
            if (['add', 'sub', 'addi', 'lw', 'sw', 'beq', 'bne', 'jal', 'li', 'mv', 'la'].includes(mnemonic)) {
                for (let i = 1; i < parts.length; i++) {
                    const arg = parts[i];

                    // Determine if this argument can be a label
                    let canBeLabel = false;
                    if (mnemonic === 'jal' && i === 2) canBeLabel = true;
                    if ((mnemonic === 'beq' || mnemonic === 'bne') && i === 3) canBeLabel = true;
                    if (mnemonic === 'la' && i === 2) canBeLabel = true;

                    // Skip immediates
                    if (/^-?\d+$/.test(arg)) continue;

                    // Handle memory syntax: offset(reg)
                    if (arg.includes('(')) {
                        const regMatch = arg.match(/\((.*)\)/);
                        if (regMatch && !this.registerRegex.test(regMatch[1])) {
                            errors.push({
                                line: index + 1,
                                column: trimmedLine.indexOf(arg) + 1,
                                message: `Invalid register in memory access: ${regMatch[1]}`,
                                severity: 'error'
                            });
                        }
                        continue;
                    }

                    // Validate register or allowed label
                    if (canBeLabel && this.isProbablyLabel(arg)) continue;

                    if (!this.registerRegex.test(arg)) {
                        errors.push({
                            line: index + 1,
                            column: trimmedLine.indexOf(arg) + 1,
                            message: `Invalid register or operand: ${arg}`,
                            severity: 'error'
                        });
                    }
                }
            }
        });

        return errors;
    }

    private isProbablyLabel(arg: string): boolean {
        // Simple heuristic: if it's not a register, and contains letters, it's a label
        return /[a-zA-Z]/.test(arg) && !this.registerRegex.test(arg);
    }
}
