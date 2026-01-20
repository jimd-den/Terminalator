
import { FileSystem } from '../src/domain/entities/FileSystem';
import { ExecuteCommand, CommandResponse } from '../src/domain/usecases/ExecuteCommand';
import { TerminalState, createInitialTerminalState } from '../src/domain/entities/TerminalState';
import { WasmCompilerService } from '../src/infrastructure/services/WasmCompilerService';
import { GccCommand } from '../src/domain/commands/core/GccCommand';
import { CommandRegistry } from '../src/domain/commands/CommandRegistry';
import { IBinaryRunner } from '../src/domain/interfaces/IBinaryRunner';

// Mock Binary Runner for verification
class MockBinaryRunner implements IBinaryRunner {
    async run(binary: Uint8Array, args: string[]): Promise<CommandResponse> {
        const text = new TextDecoder().decode(binary.slice(16)); // Skip ELF header
        return {
            output: `[MockRunner] Executed binary. Content: ${text}`,
            newState: createInitialTerminalState(), // simplify
            exitCode: 0
        };
    }
}

async function runVerification() {
    console.log('--- WASM "In-App" Compiler Verification ---');

    // 1. Setup Services
    const fs = new FileSystem();
    const compiler = new WasmCompilerService();
    const mockRunner = new MockBinaryRunner();

    // 2. Setup Registry & Executor
    const registry = new CommandRegistry();
    // Register gcc pointing to WASM service
    registry.register('gcc', new GccCommand(compiler, fs));

    // Executor with Mock Runner (simulating App execution environment)
    const executor = new ExecuteCommand(fs, undefined, registry, mockRunner);

    // 3. Setup Environment
    const state = createInitialTerminalState();

    fs.writeFile('/home/operator/main.c', 'int main() { return 0; }', 'w');
    console.log('[Step 1] Created /home/operator/main.c');

    // 4. Compile (In-App)
    console.log('[Step 2] Running: gcc main.c -o app');
    const compileRes = await executor.execute('gcc main.c -o app', state);

    if (compileRes.exitCode !== 0) {
        console.error('Compilation Failed:', compileRes.output);
        process.exit(1);
    }
    console.log('Compilation Success');

    // 5. Verify Binary
    const binaryNode = fs.resolveNode('/home/operator/app');
    if (!binaryNode) {
        console.error('Binary /home/operator/app not found');
        process.exit(1);
    }
    const inode = fs.getInode(binaryNode.inodeId);
    if (!inode || !(inode.content instanceof Uint8Array)) {
        console.error('Binary content invalid');
        process.exit(1);
    }

    // Check if it's the stub binary we expect from WasmCompilerService
    const magic = inode.content.slice(0, 4); // 0x7F ELF
    if (magic[0] !== 0x7f || magic[1] !== 0x45) { // Check .E
        console.error('Binary header incorrect');
        process.exit(1);
    }
    console.log(`[Step 3] Binary verified (${inode.content.length} bytes, ELF header present).`);

    // 6. Execute Binary (Simulated)
    console.log('[Step 4] Running: ./app');
    const runRes = await executor.execute('./app', state);

    console.log('Execution Output:', runRes.output);

    if (runRes.output.includes('compiled_binary_from_wasm_service')) {
        console.log('\n✅ VERIFICATION PASSED: WasmCompilerService integrated successfully.');
        process.exit(0);
    } else {
        console.error('\n❌ VERIFICATION FAILED: Output mismatch.');
        process.exit(1);
    }
}

runVerification().catch(e => {
    console.error(e);
    process.exit(1);
});
