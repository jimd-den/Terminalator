import { SimulationBus, GameEventType } from './SimulationBus';

/**
 * RhythmConductor - Domain Service
 * 
 * The central timing authority for the Rhythm-Action Command Engine.
 * Emits high-precision heartbeat events with drift correction.
 * 
 * Pillar: THE STORYTELLER'S CODE (Managed Lifecycle)
 * Pillar: THE Swift Stream (Low-latency/Precision)
 */
export class RhythmConductor {
    private bpm: number = 120;
    private timer: NodeJS.Timeout | null = null;
    private startTime: number = 0;
    private tickCount: number = 0;
    private isActive: boolean = false;

    constructor(private bus: SimulationBus) {}

    /**
     * Starts the heartbeat at the specified BPM.
     */
    public start(bpm: number = 120): void {
        if (this.isActive) return;
        
        this.bpm = bpm;
        this.isActive = true;
        this.startTime = Date.now();
        this.tickCount = 0;
        
        this.scheduleNextTick();
    }

    /**
     * Stops the heartbeat.
     */
    public stop(): void {
        this.isActive = false;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    /**
     * Schedules the next tick with drift correction.
     */
    private scheduleNextTick(): void {
        if (!this.isActive) return;

        const intervalMs = 60000 / this.bpm;
        this.tickCount++;
        
        // Target time for the next tick
        const nextTickTime = this.startTime + (this.tickCount * intervalMs);
        const delay = Math.max(0, nextTickTime - Date.now());

        this.timer = setTimeout(() => {
            this.emitTick();
            this.scheduleNextTick();
        }, delay);
    }

    /**
     * Emits the RHYTHM_TICK event.
     */
    private emitTick(): void {
        this.bus.emit(GameEventType.TUTOR_EVENT, {
            type: 'RHYTHM_TICK',
            payload: {
                bpm: this.bpm,
                tick: this.tickCount,
                timestamp: Date.now()
            }
        });
    }

    public getBPM(): number {
        return this.bpm;
    }

    public isHeartbeatActive(): boolean {
        return this.isActive;
    }
}
