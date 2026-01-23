
import { FileSystem } from './src/domain/entities/FileSystem';
import { FileSystemService } from './src/domain/services/FileSystemService';
import { SchemeCommand } from './src/interface-adapters/commands/game/SchemeCommand';
import { TerminalState } from './src/domain/entities/TerminalState';
import { ProcessContext } from './src/domain/entities/ProcessContext';

async function verifyLoad() {
    console.log('--- Verifying Scheme LOAD ---');
    const fs = new FileSystem();
    const service = new FileSystemService(fs);
    const cmd = new SchemeCommand(service);

    const state: TerminalState = {
        currentDirectory: '/',
        history: [],
        environment: {},
        lastExitCode: 0,
        fs: service,
        user: { name: 'operator', groups: [] },
        inputBuffer: ''
    };

    const ctx: ProcessContext = {
        fs: fs,
        fileSystemService: service,
        env: {},
        cwd: '/',
        user: { name: 'operator', groups: [] },
        stdin: '',
        executor: {} as any // Mock
    };

    // Create a scheme file
    console.log('Creating test.scm...');
    service.createFile('test.scm', 0o644);
    service.writeFile('test.scm', '(define loaded-val 1337) (display "File Loaded!")');

    // Run scheme load
    console.log('Running (load "test.scm")...');
    const result = await cmd.execute(['-e', '(load "test.scm")'], ctx, state);
    console.log('Output:', result.output);

    // Verify side effect
    console.log('Verifying loaded variable...');
    const verifyRes = await cmd.execute(['-e', '(display loaded-val)'], ctx, state);
    console.log('Variable Output:', verifyRes.output);

    if (verifyRes.output === '1337') {
        console.log('SUCCESS: loaded-val is 1337');
    } else {
        console.error('FAILURE: expected 1337, got', verifyRes.output);
        process.exit(1);
    }
}

verifyLoad().catch(console.error);
