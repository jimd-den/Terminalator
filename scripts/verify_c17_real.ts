
import { FileSystem } from '../src/domain/entities/FileSystem';
import { ExecuteCommand } from '../src/domain/usecases/ExecuteCommand';
import { TerminalState, createInitialTerminalState } from '../src/domain/entities/TerminalState';
import { HostCompilerService } from '../src/infrastructure/services/HostCompilerService';
import { HostBinaryRunner } from '../src/infrastructure/services/HostBinaryRunner';
import { C17Command } from '../src/domain/commands/core/C17Command';
import { CommandRegistry } from '../src/domain/commands/CommandRegistry';

async function runVerification() {
    console.log('--- C17 Real Compilation Verification ---');

    // 1. Setup Services
    const fs = new FileSystem();
    const compiler = new HostCompilerService();
    const runner = new HostBinaryRunner();

    // 2. Setup Command Registry & Executor
    const registry = new CommandRegistry();
    // Register c17 command manually for this test
    registry.register('c17', new C17Command(compiler, fs));

    // Initialize Executor with full binary support
    const executor = new ExecuteCommand(fs, undefined, registry, runner);

    // 3. Setup Environment
    const state = createInitialTerminalState();

    // Create a source file
    const cSource = `
    #include <stdio.h>
    int main() {
        printf("Hello from Real GCC via Terminalator!\\n");
        return 0;
    }
    `;
    fs.writeFile('/home/operator/main.c', cSource, 'w');
    console.log('[Step 1] Created /home/operator/main.c');

    // 4. Compile
    console.log('[Step 2] Running: c17 main.c -o app');
    const compileRes = await executor.execute('c17 main.c -o app', state);

    if (compileRes.exitCode !== 0) {
        console.error('Compilation Failed:', compileRes.output);
        process.exit(1);
    }
    console.log('Compilation Success');

    // 5. Verify Binary Exists & Permissions
    const binaryNode = fs.resolveNode('/home/operator/app');
    if (!binaryNode) {
        console.error('Binary /home/operator/app not found');
        process.exit(1);
    }
    const inode = fs.getInode(binaryNode.inodeId);
    if (!inode || !(inode.content instanceof Uint8Array)) {
        console.error('Binary content is not Uint8Array or inode invalid');
        process.exit(1);
    }
    console.log(`[Step 3] Binary created: ${inode.content.length} bytes`);

    // 6. Execute Binary
    console.log('[Step 4] Running: ./app');
    const runRes = await executor.execute('./app', state);

    console.log('Execution Output:', runRes.output);

    if (runRes.output.includes('Hello from Real GCC')) {
        console.log('\n✅ VERIFICATION PASSED: Full Compilation & Execution Pipeline Works.');
        process.exit(0);
    } else {
        console.error('\n❌ VERIFICATION FAILED: Unexpected output.');
        process.exit(1);
    }
}

runVerification().catch(e => {
    console.error(e);
    process.exit(1);
});
