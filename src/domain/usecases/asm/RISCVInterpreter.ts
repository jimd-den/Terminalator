/**
 * RISCVInterpreter - Use Case Layer
 * 
 * The execution engine for the RISC-V virtual machine.
 * Implements a Fetch-Decode-Execute loop for the RV32I subset.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Use Cases
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * Pillar: THE WATCHMAN’S LOG (Telemetry/Logging)
 * 
 * Intent:
 * Provides a sandboxed environment for low-level experimentation.
 * Bridges CPU operations to terminal effects via syscalls.
 */

import { CpuState } from '../../entities/asm/CpuState';
import { Instruction, Opcode, Funct3 } from '../../entities/asm/Instruction';
import { SimulationBus, GameEventType, RegisterModifiedPayload } from '../../services/SimulationBus';

export interface InterpreterOutput {
    stdout: string;
    exitCode: number;
    instructionCount: number;
}

export class RISCVInterpreter {
    private stdout: string[] = [];
    private instructionCount: number = 0;

    constructor(private bus?: SimulationBus) {}

    /**
     * Executes a program from start to finish.
     * @param program - Map of byte address to Instruction.
     * @param memory - Initial memory state.
     * @param state - CPU state.
     * @param labels - Label map.
     */
    run(program: Instruction[], memory: Uint8Array, state: CpuState, labels: Map<string, number>): InterpreterOutput {
        this.stdout = [];
        this.instructionCount = 0;
        state.reset();
        state.loadMemory(memory);

        // Auto-detect entry point
        if (labels.has('main')) {
            state.pc = labels.get('main')!;
        } else if (labels.has('start')) {
            state.pc = labels.get('start')!;
        }

        return this.runWithMap(this.buildInstructionMap(program), memory, state, labels);
    }

    private buildInstructionMap(program: Instruction[]): Map<number, Instruction> {
        const map = new Map<number, Instruction>();
        for (const instr of program) {
            map.set(instr.address, instr);
        }
        return map;
    }

    private runWithMap(instrMap: Map<number, Instruction>, memory: Uint8Array, state: CpuState, labels: Map<string, number>): InterpreterOutput {
        while (!state.isHalted) {
            this.instructionCount++;
            const instruction = instrMap.get(state.pc);
            if (!instruction) {
                // Check if we ran past the program
                if (state.pc >= 64 * 1024) break;
                // If no instruction at this PC, treat as NOP and move on (dangerous but simple)
                state.pc += 4;
                continue;
            }

            this.execute(instruction, state, labels);
        }

        return {
            stdout: this.stdout.join(''),
            exitCode: state.exitCode,
            instructionCount: this.instructionCount
        };
    }

    private execute(instr: Instruction, state: CpuState, labels: Map<string, number>): void {
        let nextPc = state.pc + 4;
        const mnemonic = instr.mnemonic || 'unknown';

        switch (instr.opcode) {
            case Opcode.OP_IMM: {
                const rs1Val = state.getRegister(instr.rs1!);
                const imm = instr.imm!;

                if (instr.funct3 === Funct3.ADD_SUB) {
                    this.setRegister(state, instr.rd!, rs1Val + imm, mnemonic);
                } else if (instr.funct3 === Funct3.AND) {
                    this.setRegister(state, instr.rd!, rs1Val & imm, mnemonic);
                } else if (instr.funct3 === Funct3.OR) {
                    this.setRegister(state, instr.rd!, rs1Val | imm, mnemonic);
                }
                break;
            }

            case Opcode.OP: {
                const rs1Val = state.getRegister(instr.rs1!);
                const rs2Val = state.getRegister(instr.rs2!);

                if (instr.funct3 === Funct3.ADD_SUB) {
                    if (instr.funct7 === 0x00) {
                        this.setRegister(state, instr.rd!, rs1Val + rs2Val, mnemonic);
                    } else if (instr.funct7 === 0x20) {
                        this.setRegister(state, instr.rd!, rs1Val - rs2Val, mnemonic);
                    }
                }
                break;
            }

            case Opcode.BRANCH: {
                const rs1Val = state.getRegister(instr.rs1!);
                const rs2Val = state.getRegister(instr.rs2!);
                let takeBranch = false;

                if (instr.funct3 === Funct3.BEQ) takeBranch = rs1Val === rs2Val;
                else if (instr.funct3 === Funct3.BNE) takeBranch = rs1Val !== rs2Val;

                if (takeBranch && instr.label) {
                    const target = labels.get(instr.label);
                    if (target !== undefined) {
                        nextPc = target;
                    }
                }
                break;
            }

            case Opcode.JAL: {
                this.setRegister(state, instr.rd!, state.pc + 4, mnemonic);
                if (instr.label) {
                    const target = labels.get(instr.label);
                    if (target !== undefined) {
                        nextPc = target;
                    }
                }
                break;
            }

            case Opcode.LOAD: {
                const base = state.getRegister(instr.rs1!);
                const addr = base + instr.imm!;
                if (instr.funct3 === Funct3.W) {
                    this.setRegister(state, instr.rd!, state.readWord(addr), mnemonic);
                }
                break;
            }

            case Opcode.STORE: {
                const base = state.getRegister(instr.rs1!);
                const rs2Val = state.getRegister(instr.rs2!);
                const addr = base + instr.imm!;
                if (instr.funct3 === Funct3.W) {
                    state.writeWord(addr, rs2Val);
                }
                break;
            }

            case Opcode.SYSTEM: {
                this.handleSyscall(state);
                break;
            }

            default:
                // Implicit NOP for unknown
                break;
        }

        state.pc = nextPc;
    }

    private setRegister(state: CpuState, rd: number, value: number, instruction?: string): void {
        const oldValue = state.getRegister(rd);
        state.setRegister(rd, value);

        if (this.bus) {
            const payload: RegisterModifiedPayload = {
                register: `x${rd}`,
                oldValue,
                newValue: value,
                instruction
            };
            this.bus.emit(GameEventType.REGISTER_MODIFIED, payload);
        }
    }

    private handleSyscall(state: CpuState): void {
        const syscallId = state.getRegister(17); // a7 register

        switch (syscallId) {
            case 1: // Print Integer
                this.stdout.push(String(state.getRegister(10))); // a0
                break;
            case 4: // Print String
                // Pointer in a0
                let addr = state.getRegister(10);
                let str = "";
                while (true) {
                    const char = state.readByte(addr++);
                    if (char === 0) break;
                    str += String.fromCharCode(char);
                }
                this.stdout.push(str);
                break;
            case 10: // Exit
                state.isHalted = true;
                state.exitCode = state.getRegister(10); // a0
                break;
            case 11: // Print Char
                this.stdout.push(String.fromCharCode(state.getRegister(10)));
                break;
            default:
                this.stdout.push(`\n[VM] Unknown ecall: ${syscallId}\n`);
                state.isHalted = true;
                break;
        }
    }
}
