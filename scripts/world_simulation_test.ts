import { GameManager } from '../src/interface-adapters/GameManager';
import { FileSystem } from '../src/domain/entities/FileSystem';
import { NetworkMap } from '../src/domain/services/NetworkMap';
import { FileSystemService } from '../src/domain/services/FileSystemService';
import { DependencyContainer } from '../src/infrastructure/di/DependencyContainer';
import { ConsoleTelemetryAdapter } from '../src/infrastructure/telemetry/ConsoleTelemetryAdapter';
import { SimulationBus } from '../src/domain/services/SimulationBus';
import { RhythmConductor } from '../src/domain/services/RhythmConductor';

async function testWorldSimulation() {
    console.log("--- WORLD SIMULATION TEST STARTING ---");

    const fs = new FileSystem();
    const networkMap = new NetworkMap();
    const telemetry = new ConsoleTelemetryAdapter();
    const bus = new SimulationBus(telemetry);
    
    // Use the DI container to create the GameManager
    const conductor = new RhythmConductor(bus);
    const gameManager = DependencyContainer.createGameManager(fs, networkMap, telemetry, bus, conductor);
    
    // The WorldManager is initialized in GameManager constructor.
    // It should have registered 'terminalator' (localhost) and projected /dev/airlock.
    
    const fsService = new FileSystemService(fs);
    
    // We need to use the SAME fsService that was registered in WorldManager.
    // Actually, GameManager registers the one it created.
    // Let's get that one if possible? No, GameManager doesn't expose it easily.
    // But since it's the SAME 'fs' object, it should work IF we register our test service.
    
    const worldManager = gameManager.getWorldManager();
    worldManager.registerHost('terminalator', fsService);

    // Find a valid device to test with
    const allDevices = worldManager.getAllDevices();
    if (allDevices.length === 0) {
        console.error("FAILED: No devices generated.");
        return;
    }
    
    // Pick a device from a generated host (not terminalator)
    const targetDevice = allDevices.find(d => d.type === 'ACTUATOR') || allDevices[0];
    const targetHost = targetDevice.hostId;
    const targetPath = targetDevice.path;

    console.log(`\n[TARGET] Testing device: ${targetDevice.name} on host: ${targetHost} at path: ${targetPath}`);

    // Get the FS for that host
    const targetFsService = worldManager.getHostFileSystem(targetHost);
    if (!targetFsService) {
        // If target host is terminalator, use fsService
        if (targetHost === 'terminalator') {
             // continue
        } else {
            console.error(`FAILED: No FS service found for host ${targetHost}`);
            return;
        }
    }
    const activeService = targetHost === 'terminalator' ? fsService : targetFsService!;

    // 1. Verify Device projection
    console.log("\n[1] Checking if device projected...");
    try {
        const content = activeService.readFile(targetPath);
        console.log(`PASSED: ${targetPath} exists. Initial Content: ${content}`);
    } catch (e: any) {
        console.error(`FAILED: ${targetPath} missing. Error: ${e.message}`);
        return;
    }

    // 2. Trigger World Effect via File Write
    console.log(`\n[2] Writing 'TEST_STATE' to ${targetPath}...`);
    activeService.writeFile(targetPath, 'TEST_STATE');

    // 3. Verify State Change in WorldManager
    console.log("\n[3] Verifying Device state in WorldManager...");
    if (targetDevice.state === 'TEST_STATE') {
        console.log("PASSED: WorldManager detected write and updated Device state.");
    } else {
        console.error(`FAILED: Device state is ${targetDevice.state}. Expected 'TEST_STATE'.`);
    }

    // 4. Verify Projection (Sensors)
    console.log("\n[4] Verifying state was projected back to FS...");
    // Force a tick/projection
    (worldManager as any).tick(new Map([[targetHost, activeService]]));
    
    const updatedContent = activeService.readFile(targetPath);
    if (updatedContent.trim() === 'TEST_STATE') {
        console.log("PASSED: State projected back to FS.");
    } else {
        console.error(`FAILED: File content is ${updatedContent}. Expected 'TEST_STATE'.`);
    }

    console.log("\n--- WORLD SIMULATION TEST COMPLETED ---");
}

testWorldSimulation().catch(console.error);
