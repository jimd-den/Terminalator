// Mock __DEV__ for NodeJS environment
(global as any).__DEV__ = true;

import { GameManager } from '../src/interface-adapters/GameManager';
import { FileSystem } from '../src/domain/entities/FileSystem';
import { Logger } from '../src/infrastructure/telemetry/Logger';

// Mock Logger to avoid cluttering output
Logger.trace = <T>(name: string, fn: () => T) => fn();

const fs = new FileSystem();
const gameManager = new GameManager(fs);

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
