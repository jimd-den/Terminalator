import { ExecutableFormat } from '../services/shell/ProgramLoader';
import { IBinaryRunner } from '../interfaces/IBinaryRunner';
import { FileSystemService } from '../services/FileSystemService';
import { createOutputStream } from '../entities/Stream';
import { exportedEnvironment } from '../services/shell/expansion/ShellVariables';
import { RISCVInterpreter } from './asm/RISCVInterpreter';
import { CpuState } from '../entities/asm/CpuState';

/** RISC-V artifacts produced by `compile foo.s` (the Glass Box executables). */
export class RiscvArtifactFormat implements ExecutableFormat {
    readonly name = 'riscv-artifact';
    private interpreter = new RISCVInterpreter();

    matches(_content: Uint8Array, text: string): boolean {
        return text.trimStart().startsWith('{') && text.includes('"RISCV_EXECUTABLE"');
    }

    async run(_content: Uint8Array, text: string) {
        const artifact = JSON.parse(text);
        const res = this.interpreter.run(
            artifact.program,
            new Uint8Array(artifact.memory),
            new CpuState(),
            new Map(Object.entries(artifact.labels))
        );
        return { status: res.exitCode, stdout: res.stdout };
    }
}

/** ELF / WebAssembly binaries, delegated to the injected binary runner. */
export class NativeBinaryFormat implements ExecutableFormat {
    readonly name = 'native-binary';

    constructor(private runner: IBinaryRunner, private fs: FileSystemService) { }

    matches(content: Uint8Array): boolean {
        const isWasm = content.length >= 4 && content[0] === 0x00 && content[1] === 0x61 && content[2] === 0x73 && content[3] === 0x6d;
        const isElf = content.length >= 4 && content[0] === 0x7f && content[1] === 0x45 && content[2] === 0x4c && content[3] === 0x46;
        return isWasm || isElf;
    }

    async run(content: Uint8Array, _text: string, args: string[], state: any, io: any) {
        const stdout = createOutputStream();
        const stderr = createOutputStream();
        const res = await this.runner.run(content, args, {
            stdin: io.stdin,
            stdout,
            stderr,
            fs: this.fs,
            env: exportedEnvironment(state),
        });
        return { status: res.exitCode, stdout: stdout.getContents() + (res.output ?? ''), stderr: stderr.getContents() };
    }
}
