import { TerminalState, createInitialTerminalState } from '../../src/domain/entities/TerminalState';
import { FileSystem } from '../../src/domain/entities/FileSystem';
import { FileSystemService } from '../../src/domain/services/FileSystemService';
import { GameCommandExecutor } from '../../src/interface-adapters/GameCommandExecutor';
import { DependencyContainer } from '../../src/infrastructure/di/DependencyContainer';
import { ConsoleTelemetryAdapter } from '../../src/infrastructure/telemetry/ConsoleTelemetryAdapter';
import { NetworkMap } from '../../src/domain/services/NetworkMap';
import { CommandResponse } from '../../src/domain/entities/Command';
import { OutputBuffer } from './OutputBuffer';
import { GameManager } from '../../src/interface-adapters/GameManager';
import { SimulationBus } from '../../src/domain/services/SimulationBus';
import { RhythmConductor } from '../../src/domain/services/RhythmConductor';

// Polyfill for React Native/Expo globals
(global as any).__DEV__ = true;

/**
 * TestUser - Framework Layer
 * 
 * Facade for simulating a user session in integration tests.
 * Encapsulates DI, State, and Execution.
 * 
 * Pattern: Facade + Adapter (for Output)
 */
export class TestUser {
    private state: TerminalState;
    private executor: GameCommandExecutor;
    private gameManager: GameManager;
    private output: OutputBuffer;

    constructor() {
        this.output = new OutputBuffer();
        
        // Bootstrap System
        const fs = new FileSystem();
        const networkMap = new NetworkMap();
        const telemetry = new ConsoleTelemetryAdapter(); // Keeps system logs as is
        const bus = new SimulationBus(telemetry);
        
        const conductor = new RhythmConductor(bus);
        this.gameManager = DependencyContainer.createGameManager(fs, networkMap, telemetry, bus, conductor);
        const fsService = new FileSystemService(fs);
        
        this.executor = new GameCommandExecutor(fsService, this.gameManager, networkMap, telemetry);
        this.state = createInitialTerminalState();
    }

    /**
     * Executes a command as the user.
     */
    public async exec(cmd: string): Promise<CommandResponse> {
        this.output.logInput(cmd);
        
        const response = await this.executor.execute(cmd, this.state);
        
        // Update local state tracking
        if (response.newState) {
            this.state = { ...this.state, ...response.newState };
        }

        this.output.logOutput(response.output);
        return response;
    }

    /**
     * Assert helper to verify output contains string.
     */
    public async expect(cmd: string, expected: string | RegExp): Promise<void> {
        const res = await this.exec(cmd);
        const match = typeof expected === 'string' 
            ? res.output.includes(expected)
            : expected.test(res.output);
            
        if (!match) {
            throw new Error(`Expected output to contain "${expected}", but got:\n${res.output}`);
        }
    }

    public getGameManager(): GameManager {
        return this.gameManager;
    }

    public getState(): TerminalState {
        return this.state;
    }
}
