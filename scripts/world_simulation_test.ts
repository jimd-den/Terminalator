import { GameManager } from '../src/interface-adapters/GameManager';
import { FileSystem } from '../src/domain/entities/FileSystem';
import { NetworkMap } from '../src/domain/services/NetworkMap';
import { FileSystemService } from '../src/domain/services/FileSystemService';
import { DependencyContainer } from '../src/infrastructure/di/DependencyContainer';
import { ConsoleTelemetryAdapter } from '../src/infrastructure/telemetry/ConsoleTelemetryAdapter';

async function testWorldSimulation() {
    console.log("--- WORLD SIMULATION TEST STARTING ---");

    const fs = new FileSystem();
    const networkMap = new NetworkMap();
    const telemetry = new ConsoleTelemetryAdapter();
    
    // Use the DI container to create the GameManager
    const gameManager = DependencyContainer.createGameManager(fs, networkMap, telemetry);
    
    // The WorldManager is initialized in GameManager constructor.
    // It should have registered 'terminalator' (localhost) and projected /dev/airlock.
    
    const fsService = new FileSystemService(fs);
    
    // 1. Verify Device projection
    console.log("\n[1] Checking if /dev/airlock was projected...");
    try {
        const content = fsService.readFile('/dev/airlock');
        console.log(`PASSED: /dev/airlock exists. Initial Content: ${content}`);
    } catch (e: any) {
        console.error(`FAILED: /dev/airlock missing. Error: ${e.message}`);
        return;
    }

    // 2. Trigger World Effect via File Write
    console.log("\n[2] Writing 'OPEN' to /dev/airlock...");
    
    // We need to use the SAME fsService that was registered in WorldManager.
    // Actually, GameManager registers the one it created.
    // Let's get that one if possible? No, GameManager doesn't expose it easily.
    // But since it's the SAME 'fs' object, it should work IF we register our test service.
    
    const worldManager = gameManager.getWorldManager();
    worldManager.registerHost('terminalator', fsService);

    fsService.writeFile('/dev/airlock', 'OPEN');

    // 3. Verify State Change in WorldManager
    console.log("\n[3] Verifying Device state in WorldManager...");
    const devices = worldManager.getAllDevices();
    const airlock = devices.find(d => d.name === 'airlock');

    if (airlock && airlock.state === 'OPEN') {
        console.log("PASSED: WorldManager detected write and updated Device state.");
    } else {
        console.error(`FAILED: Device state is ${airlock?.state}. Expected 'OPEN'.`);
    }

    // 4. Verify Projection (Sensors)
    console.log("\n[4] Verifying state was projected back to FS...");
    // Force a tick/projection
    worldManager.tick(new Map([['terminalator', fsService]]));
    
    const updatedContent = fsService.readFile('/dev/airlock');
    if (updatedContent.trim() === 'OPEN') {
        console.log("PASSED: State projected back to /dev/airlock.");
    } else {
        console.error(`FAILED: /dev/airlock content is ${updatedContent}. Expected 'OPEN'.`);
    }

    console.log("\n--- WORLD SIMULATION TEST COMPLETED ---");
}

testWorldSimulation().catch(console.error);
