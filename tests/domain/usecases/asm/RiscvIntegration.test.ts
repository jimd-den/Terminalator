import { assert } from 'chai';
import { Assembler } from '../../../../src/domain/usecases/asm/Assembler';
import { RISCVInterpreter } from '../../../../src/domain/usecases/asm/RISCVInterpreter';
import { CpuState } from '../../../../src/domain/entities/asm/CpuState';
import { Opcode } from '../../../../src/domain/entities/asm/Instruction';

describe('RISC-V Integration', () => {
    let assembler: Assembler;
    let interpreter: RISCVInterpreter;
    let cpuSpec: CpuState;

    beforeEach(() => {
        assembler = new Assembler();
        interpreter = new RISCVInterpreter();
        cpuSpec = new CpuState();
    });

    it('should assemble and run a integrated program with data and code', () => {
        // Logic:
        // 1. Data at 0 (.string "Hello")
        // 2. Code at offset (start label)
        // 3. Syscall to print "Hello" (id 4)
        // 4. Syscall to exit (id 10)

        const source = `
.string "Hello"
.word 0
start:
    li a0, 0          ; a0 = address 0 (start of string)
    li a7, 4          ; print string
    ecall
    li a0, 0
    li a7, 10         ; exit
    ecall
`;
        const { program, memory, labels } = assembler.assemble(source);

        // Verify that start label is NOT 0
        const startAddr = labels.get('start');
        assert.isTrue(startAddr! > 0, 'Start address should be offset by data');

        // Verify instruction address matches label
        const firstInstr = program.find(i => i.mnemonic === 'addi'); // li -> addi
        assert.equal(firstInstr?.address, startAddr, 'First instruction should resolve to start label');

        // Execute
        const result = interpreter.run(program, memory, cpuSpec, labels);

        assert.equal(result.stdout, 'Hello');
        assert.equal(result.exitCode, 0);
    });

    it('should compile basic arithmetic', () => {
        const source = `
start:
    li t0, 10
    li t1, 20
    add t2, t0, t1
    mv a0, t2
    li a7, 1           ; print integer
    ecall
    li a7, 10
    ecall
`;
        const { program, memory, labels } = assembler.assemble(source);
        const result = interpreter.run(program, memory, cpuSpec, labels);
        assert.equal(result.stdout, '30');
    });
});
