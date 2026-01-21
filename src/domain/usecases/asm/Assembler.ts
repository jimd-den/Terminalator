/**
 * Assembler - Use Case Layer
 * 
 * Converts RISC-V assembly source code into a stream of executable Instructions.
 * Handles simple directives (.string, .word), labels, and pseudo-ops.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Use Cases
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * Pillar: THE BALANCED SCALE (KISS)
 * 
 * Intent:
 * A lightweight alternative to a binary object loader.
 * Allows users to write human-readable code that maps directly to CPU ops.
 */

import { Instruction, Opcode, makeInstruction, Funct3 } from '../../entities/asm/Instruction';

export class Assembler {
    private labels: Map<string, number> = new Map();

    /**
     * First pass: Identify labels and their addresses.
     * Second pass: Generate instruction stream and initial memory.
     */
    assemble(source: string): { program: Instruction[], memory: Uint8Array, labels: Map<string, number> } {
        const rawLines = source.split('\n').map(l => l.split(';')[0].trim()).filter(l => l.length > 0);
        this.labels.clear();
        const memory = new Uint8Array(64 * 1024);
        let currentAddr = 0;
        const codeLines: { line: string, addr: number }[] = [];
        const dataDirectives: { directive: string, addr: number }[] = [];

        // Pass 1: Collect Labels and determine addresses
        for (const line of rawLines) {
            let activeLine = line;
            const labelMatch = activeLine.match(/^([a-zA-Z_][a-zA-Z0-9_]*):(.*)$/);
            if (labelMatch) {
                this.labels.set(labelMatch[1], currentAddr);
                activeLine = labelMatch[2].trim();
            }

            if (!activeLine) continue;

            if (activeLine.startsWith('.')) {
                dataDirectives.push({ directive: activeLine, addr: currentAddr });
                if (activeLine.startsWith('.string')) {
                    const str = activeLine.match(/"(.*)"/)?.[1] || '';
                    currentAddr += str.length + 1;
                } else if (activeLine.startsWith('.word')) {
                    currentAddr += 4;
                }
            } else {
                codeLines.push({ line: activeLine, addr: currentAddr });
                currentAddr += 4;
            }
        }

        // Pass 2: Generation
        const program: Instruction[] = [];
        // Fill memory with data directives
        for (const { directive, addr } of dataDirectives) {
            if (directive.startsWith('.string')) {
                const str = directive.match(/"(.*)"/)?.[1] || '';
                for (let i = 0; i < str.length; i++) {
                    memory[addr + i] = str.charCodeAt(i);
                }
                memory[addr + str.length] = 0; // null terminator
            } else if (directive.startsWith('.word')) {
                const val = parseInt(directive.split(/\s+/)[1]);
                memory[addr] = val & 0xFF;
                memory[addr + 1] = (val >> 8) & 0xFF;
                memory[addr + 2] = (val >> 16) & 0xFF;
                memory[addr + 3] = (val >> 24) & 0xFF;
            }
        }

        // Generate instructions
        for (const { line, addr } of codeLines) {
            // We need to map byte addresses to instruction indices for the interpreter
            // but for now, the interpreter uses PC as byte address / 4.
            // This only works if code is contiguous at the start.
            // Let's assume code is at the start for now.
            program.push(this.parseLine(line, addr));
        }

        return { program, memory, labels: this.labels };
    }

    private parseLine(line: string, address: number): Instruction {
        const parts = line.split(/[,\s]+/).filter(p => p.length > 0);
        const mnemonic = parts[0].toLowerCase();

        switch (mnemonic) {
            // --- Pseudo-ops ---
            case 'li': { // li rd, imm -> addi rd, x0, imm
                const rd = this.regToIndex(parts[1]);
                const imm = parseInt(parts[2]);
                return makeInstruction('addi', Opcode.OP_IMM, address, { rd, rs1: 0, imm, funct3: Funct3.ADD_SUB });
            }
            case 'mv': { // mv rd, rs -> addi rd, rs, 0
                const rd = this.regToIndex(parts[1]);
                const rs1 = this.regToIndex(parts[2]);
                return makeInstruction('addi', Opcode.OP_IMM, address, { rd, rs1, imm: 0, funct3: Funct3.ADD_SUB });
            }
            case 'nop': {
                return makeInstruction('addi', Opcode.OP_IMM, address, { rd: 0, rs1: 0, imm: 0, funct3: Funct3.ADD_SUB });
            }

            // --- Real Ops (Subset of RV32I) ---
            case 'add': {
                return this.makeROp(mnemonic, Opcode.OP, Funct3.ADD_SUB, 0x00, parts, address);
            }
            case 'sub': {
                return this.makeROp(mnemonic, Opcode.OP, Funct3.ADD_SUB, 0x20, parts, address);
            }
            case 'addi': {
                return this.makeIOp(mnemonic, Opcode.OP_IMM, Funct3.ADD_SUB, parts, address);
            }
            case 'lw': {
                // lw rd, offset(rs1)
                const rd = this.regToIndex(parts[1]);
                const memMatch = parts[2].match(/(-?\d+)\((.*)\)/);
                if (!memMatch) throw new Error(`Invalid lw syntax: ${line}`);
                const imm = parseInt(memMatch[1]);
                const rs1 = this.regToIndex(memMatch[2]);
                return makeInstruction(mnemonic, Opcode.LOAD, address, { rd, rs1, imm, funct3: Funct3.W });
            }
            case 'sw': {
                // sw rs2, offset(rs1)
                const rs2 = this.regToIndex(parts[1]);
                const memMatch = parts[2].match(/(-?\d+)\((.*)\)/);
                if (!memMatch) throw new Error(`Invalid sw syntax: ${line}`);
                const imm = parseInt(memMatch[1]);
                const rs1 = this.regToIndex(memMatch[2]);
                return makeInstruction(mnemonic, Opcode.STORE, address, { rs1, rs2, imm, funct3: Funct3.W });
            }
            case 'beq': {
                return this.makeBOp(mnemonic, Opcode.BRANCH, Funct3.BEQ, parts, address);
            }
            case 'bne': {
                return this.makeBOp(mnemonic, Opcode.BRANCH, Funct3.BNE, parts, address);
            }
            case 'jal': {
                const rd = this.regToIndex(parts[1]);
                const label = parts[2];
                return makeInstruction(mnemonic, Opcode.JAL, address, { rd, label });
            }
            case 'la': { // la rd, label -> li rd, address
                const rd = this.regToIndex(parts[1]);
                const label = parts[2];
                const addr = this.labels.get(label) || 0;
                return makeInstruction('addi', Opcode.OP_IMM, address, { rd, rs1: 0, imm: addr, funct3: Funct3.ADD_SUB });
            }
            case 'ecall': {
                return makeInstruction(mnemonic, Opcode.SYSTEM, address, {});
            }

            default:
                return makeInstruction(mnemonic, Opcode.UNKNOWN, address, {});
        }
    }

    private regToIndex(name: string): number {
        const n = name.toLowerCase();
        if (n.startsWith('x')) return parseInt(n.slice(1));
        const regMap: Record<string, number> = {
            'zero': 0, 'ra': 1, 'sp': 2, 'gp': 3, 'tp': 4, 't0': 5, 't1': 6, 't2': 7,
            's0': 8, 'fp': 8, 's1': 9, 'a0': 10, 'a1': 11, 'a2': 12, 'a3': 13, 'a4': 14, 'a5': 15,
            'a6': 16, 'a7': 17, 's2': 18, 's3': 19, 's4': 20, 's5': 21, 's6': 22, 's7': 23,
            's8': 24, 's9': 25, 's10': 26, 's11': 27, 't3': 28, 't4': 29, 't5': 30, 't6': 31
        };
        if (regMap[n] !== undefined) return regMap[n];
        throw new Error(`Unknown register: ${name}`);
    }

    private makeROp(mnemonic: string, opcode: Opcode, f3: number, f7: number, parts: string[], address: number): Instruction {
        return makeInstruction(mnemonic, opcode, address, {
            rd: this.regToIndex(parts[1]),
            rs1: this.regToIndex(parts[2]),
            rs2: this.regToIndex(parts[3]),
            funct3: f3,
            funct7: f7
        });
    }

    private makeIOp(mnemonic: string, opcode: Opcode, f3: number, parts: string[], address: number): Instruction {
        return makeInstruction(mnemonic, opcode, address, {
            rd: this.regToIndex(parts[1]),
            rs1: this.regToIndex(parts[2]),
            imm: parseInt(parts[3]),
            funct3: f3
        });
    }

    private makeBOp(mnemonic: string, opcode: Opcode, f3: number, parts: string[], address: number): Instruction {
        return makeInstruction(mnemonic, opcode, address, {
            rs1: this.regToIndex(parts[1]),
            rs2: this.regToIndex(parts[2]),
            label: parts[3],
            funct3: f3
        });
    }
}
