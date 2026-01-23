import { strict as assert } from 'assert';
import { GameCommandExecutor } from '../../src/interface-adapters/GameCommandExecutor';
import { FileSystem } from '../../src/domain/entities/FileSystem';
import { FileSystemService } from '../../src/domain/services/FileSystemService';
import { GameManager } from '../../src/interface-adapters/GameManager';
import { ConsoleTelemetryAdapter } from '../../src/infrastructure/telemetry/ConsoleTelemetryAdapter';

// Mock GameManager if needed or use real one stubbed
class MockGameManager extends GameManager {
    constructor() {
        super(new FileSystem(), new ConsoleTelemetryAdapter());
    }
}

async function runTest() {
    console.log('Testing GameCommandExecutor Registration...');

    const fs = new FileSystem();
    const service = new FileSystemService(fs);
    const telemetry = new ConsoleTelemetryAdapter();
    const gameManager = new MockGameManager();

    const executor = new GameCommandExecutor(service, gameManager, telemetry);
    const registry = executor.getRegistry();

    // Verify Core Commands
    assert.ok(registry.get('ls'), 'Registry should contain ls');
    assert.ok(registry.get('cd'), 'Registry should contain cd');

    // Verify Game Commands
    assert.ok(registry.get('mail'), 'Registry should contain mail');
    assert.ok(registry.get('check-comms'), 'Registry should contain check-comms');

    console.log('PASS: GameCommandExecutor has all commands.');
}

runTest().catch((e) => {
    console.error('FAIL:', e);
    process.exit(1);
});
