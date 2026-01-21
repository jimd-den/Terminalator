/**
 * Instruction - Domain Layer Entity
 * 
 * Represents a decoded RISC-V instruction.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Entities
 * Pillar: THE BALANCED SCALE (SOLID)
 * 
 * Intent:
 * A structured representation of an operation to be executed by the VM.
 * Decouples the binary/text representation from the execution logic.
 */

export enum Opcode {
    LUI, AUIPC, JAL, JALR,
    BRANCH,
    LOAD, STORE,
    OP_IMM, OP,
    SYSTEM,
    UNKNOWN
}

export enum Funct3 {
    // Integer ALU
    ADD_SUB = 0x0,
    SLL = 0x1,
    SLT = 0x2,
    SLTU = 0x3,
    XOR = 0x4,
    SRL_SRA = 0x5,
    OR = 0x6,
    AND = 0x7,

    // Branch
    BEQ = 0x0,
    BNE = 0x1,
    BLT = 0x4,
    BGE = 0x5,
    BLTU = 0x6,
    BGEU = 0x7,

    // Load/Store
    B = 0x0,
    H = 0x1,
    W = 0x2,
    BU = 0x4,
    HU = 0x5
}

export interface Instruction {
    readonly opcode: Opcode;
    readonly rd?: number;
    readonly rs1?: number;
    readonly rs2?: number;
    readonly imm?: number;
    readonly funct3?: number;
    readonly funct7?: number;
    readonly label?: string; // For labels in assembly text
    readonly mnemonic: string;
    readonly address: number; // Virtual address of this instruction
}

/**
 * Creates an instruction object.
 */
export const makeInstruction = (mnemonic: string, opcode: Opcode, address: number, params: Partial<Instruction>): Instruction => ({
    mnemonic,
    opcode,
    address,
    ...params
});
