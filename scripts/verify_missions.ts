// Mock __DEV__ for NodeJS environment
(global as any).__DEV__ = true;

import { GameManager } from '../src/interface-adapters/GameManager';
import { FileSystem } from '../src/domain/entities/FileSystem';
import { ConsoleTelemetryAdapter } from '../src/infrastructure/telemetry/ConsoleTelemetryAdapter';

// Mock Telemetry to avoid cluttering output or just use the adapter
// Here we will use the real adapter but maybe suppress some logs if needed
// Or we can create a MockAdapter
class MockTelemetry extends ConsoleTelemetryAdapter {
    trace<T>(fnName: string, fn: (...args: any[]) => T, ...args: any[]): T {
        // Simple pass-through for verification script
        return fn(...args);
    }
}

const telemetry = new MockTelemetry();
const fs = new FileSystem();
const gameManager = new GameManager(fs, telemetry);

console.log('--- STARTING MISSION VERIFICATION ---\n');

for (let i = 0; i < 5; i++) {
    console.log(`[Event ${i + 1}] Spawning NPC Event...`);
    const mail = gameManager.spawnNPCEvent();

    console.log(`From: ${mail.from}`);
    console.log(`Subject: ${mail.subject}`);
    console.log(`Body Snippet: ${mail.body.split('\n')[6]}`); // Print mission description line
    console.log('-----------------------------------');
}

const activeNPCs = gameManager.getActiveNPCs();
console.log(`\nActive NPCs: ${activeNPCs.length}`);
activeNPCs.forEach(npc => {
    console.log(`- ${npc.name} (${npc.career})`);
});
