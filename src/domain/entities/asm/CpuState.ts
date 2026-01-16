/**
 * CpuState - Domain Layer Entity
 * 
 * Represents the architectural state of a RISC-V CPU (RV32I).
 * Includes 32 general-purpose registers, program counter, and memory.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Entities
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * Pillar: THE BALANCED SCALE (KISS)
 * 
 * Intent:
 * Provides the storage for the virtual machine's runtime data.
 * Adheres to the standard RISC-V register naming conventions.
 */

export class CpuState {
    // 32 General-purpose registers (x0 to x31)
    // x0 is hardwired to zero
    private registers: Int32Array = new Int32Array(32);

    // Program Counter
    public pc: number = 0;

    // Simulated Memory (64KB for simplicity)
    private memory: Uint8Array = new Uint8Array(64 * 1024);

    // Status flags
    public isHalted: boolean = false;
    public exitCode: number = 0;

    constructor() {
        this.reset();
    }

    /**
     * Loads a block of data into memory at the start.
     */
    loadMemory(data: Uint8Array): void {
        this.memory.set(data);
    }

    /**
     * Resets the CPU state to power-on defaults.
     */
    reset(): void {
        this.registers.fill(0);
        this.pc = 0;
        this.isHalted = false;
        this.exitCode = 0;
    }

    /**
     * Reads a register value.
     */
    getRegister(index: number): number {
        if (index === 0) return 0; // x0 is always 0
        return this.registers[index & 0x1F];
    }

    /**
     * Writes a register value.
     */
    setRegister(index: number, value: number): void {
        if (index === 0) return; // Cannot write to x0
        this.registers[index & 0x1F] = value;
    }

    /**
     * Memory Access: Byte
     */
    readByte(address: number): number {
        return this.memory[address % this.memory.length];
    }

    writeByte(address: number, value: number): void {
        this.memory[address % this.memory.length] = value & 0xFF;
    }

    /**
     * Memory Access: Word (32-bit, Little Endian)
     */
    readWord(address: number): number {
        const addr = address % this.memory.length;
        return (this.memory[addr] |
            (this.memory[addr + 1] << 8) |
            (this.memory[addr + 2] << 16) |
            (this.memory[addr + 3] << 24));
    }

    writeWord(address: number, value: number): void {
        const addr = address % this.memory.length;
        this.memory[addr] = value & 0xFF;
        this.memory[addr + 1] = (value >> 8) & 0xFF;
        this.memory[addr + 2] = (value >> 16) & 0xFF;
        this.memory[addr + 3] = (value >> 24) & 0xFF;
    }

    /**
     * Utility: Register names for debugging
     */
    static getRegisterName(index: number): string {
        const names = [
            'zero', 'ra', 'sp', 'gp', 'tp', 't0', 't1', 't2',
            's0', 's1', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5',
            'a6', 'a7', 's2', 's3', 's4', 's5', 's6', 's7',
            's8', 's9', 's10', 's11', 't3', 't4', 't5', 't6'
        ];
        return names[index] || `x${index}`;
    }
}
