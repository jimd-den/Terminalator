/**
 * SimulationBus.ts
 *
 * Pillar: The Four-Fold Shield (Clean Architecture) - Domain Service
 * Pillar: The Balanced Scale (Observer Pattern)
 *
 * Intent:
 * Provides a central, decoupled event bus for the terminal simulation.
 * Every command, file access, or register modification emits a GameEvent.
 * Mission Inspectors and the TutorBot subscribe to this bus to react to system state changes.
 *
 * Design Pattern: Observer
 * Why: To allow the simulation kernel (Shell/VM) to remain pure and unaware of 
 * higher-level game logic like missions or tutorials, while still allowing 
 * those systems to react to low-level state changes in real-time.
 */

import { TelemetryPort } from '../ports/TelemetryPort';

/**
 * Enumerates the types of events that can occur within the simulation.
 */
export enum GameEventType {
    COMMAND_EXECUTED = 'COMMAND_EXECUTED',
    REGISTER_MODIFIED = 'REGISTER_MODIFIED',
    FILE_ACCESS = 'FILE_ACCESS',
    MISSION_PROGRESS = 'MISSION_PROGRESS',
    TUTOR_EVENT = 'TUTOR_EVENT',
    ECONOMY_UPDATE = 'ECONOMY_UPDATE',
    KEYSTROKE_ACCEPTED = 'KEYSTROKE_ACCEPTED',
    ERROR_OCCURRED = 'ERROR_OCCURRED'
}

/**
 * Payload for a COMMAND_EXECUTED event.
 */
export interface CommandExecutedPayload {
    command: string;
    args: string[];
    exitCode: number;
    output: string;
    cwd: string;
}

/**
 * Payload for a REGISTER_MODIFIED event.
 */
export interface RegisterModifiedPayload {
    register: string;
    oldValue: number;
    newValue: number;
    instruction?: string;
}

/**
 * Payload for a FILE_ACCESS event.
 */
export interface FileAccessPayload {
    path: string;
    operation: 'READ' | 'WRITE' | 'DELETE' | 'EXECUTE';
    success: boolean;
}

/**
 * Represents a discrete event within the simulation world.
 */
export interface GameEvent {
    type: GameEventType;
    timestamp: string; // ISO 8601
    payload: CommandExecutedPayload | RegisterModifiedPayload | FileAccessPayload | any;
}

export type GameEventCallback = (event: GameEvent) => void;

/**
 * The SimulationBus is the central nervous system of the Terminalator domain.
 * It allows disparate components (Shell, RISC-V VM, Tutor) to communicate
 * without direct dependencies, adhering to the principle of "The Loose Thread".
 */
export class SimulationBus {
    private listeners: Map<GameEventType | '*', GameEventCallback[]> = new Map();

    constructor(private telemetry: TelemetryPort) {}

    /**
     * Subscribes a callback to a specific event type or all events ('*').
     *
     * @param type - The event type to listen for.
     * @param callback - The function to execute when the event occurs.
     */
    public subscribe(type: GameEventType | '*', callback: GameEventCallback): () => void {
        console.log(`[SimulationBus] SUBSCRIBE: ${type}`);
        this.telemetry.trace('SimulationBus.subscribe', () => {
            if (!this.listeners.has(type)) {
                this.listeners.set(type, []);
            }
            this.listeners.get(type)!.push(callback);
        }, type);

        return () => {
            console.log(`[SimulationBus] UNSUBSCRIBE: ${type}`);
            const list = this.listeners.get(type);
            if (list) {
                this.listeners.set(type, list.filter(l => l !== callback));
            }
        };
    }

    /**
     * Subscribes a callback to a specific event type for a single execution.
     *
     * @param type - The event type to listen for.
     * @param callback - The function to execute when the event occurs.
     */
    public once(type: GameEventType, callback: GameEventCallback): void {
        const unsubscribe = this.subscribe(type, (event) => {
            unsubscribe();
            callback(event);
        });
    }

    /**
     * Waits for a specific event to occur.
     *
     * @param type - The event type to wait for.
     * @param timeoutMs - Optional timeout in milliseconds.
     * @returns A promise that resolves with the event payload.
     */
    public waitFor(type: GameEventType, timeoutMs: number = 5000): Promise<GameEvent> {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error(`Timeout waiting for event: ${type}`));
            }, timeoutMs);

            this.once(type, (event) => {
                clearTimeout(timer);
                resolve(event);
            });
        });
    }

    /**
     * Emits a GameEvent to all relevant subscribers.
     *
     * @param type - The type of event to emit.
     * @param payload - The data associated with the event.
     */
    public emit(type: GameEventType, payload: any): void {
        console.log(`[SimulationBus] EMIT: ${type}`, payload);
        this.telemetry.trace('SimulationBus.emit', () => {
            const event: GameEvent = {
                type,
                timestamp: new Date().toISOString(),
                payload
            };

            const specificListeners = this.listeners.get(type) || [];
            const wildcardListeners = this.listeners.get('*') || [];
            
            const allListeners = [...specificListeners, ...wildcardListeners];
            
            this.telemetry.debug(`Emitting ${type} to ${allListeners.length} listeners`, { payload });

            allListeners.forEach(callback => {
                try {
                    callback(event);
                } catch (error) {
                    console.error(`[SimulationBus] Listener Error for ${type}:`, error);
                    this.telemetry.error(`Error in SimulationBus listener for ${type}`, { error, event });
                }
            });
        }, type, payload);
    }
}
