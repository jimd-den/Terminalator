/**
 * BandwidthSimulator.ts - Domain Service
 * 
 * Simulates data transfer speeds and latencies.
 * 
 * Pillar: Performance & Purity (Deterministic)
 */

export class BandwidthSimulator {
    /**
     * Calculates the time taken to transfer data.
     * 
     * @param sizeBytes - Size of data in bytes.
     * @param bandwidthBps - Bandwidth in bytes per second.
     * @param latencyMs - Latency in milliseconds.
     * @returns Time in milliseconds.
     */
    public calculateTransferTime(sizeBytes: number, bandwidthBps: number, latencyMs: number = 0): number {
        if (bandwidthBps <= 0) return Infinity;
        
        const transferTimeSec = sizeBytes / bandwidthBps;
        return (transferTimeSec * 1000) + latencyMs;
    }

    /**
     * Estimates the effective bandwidth based on distance or network health.
     */
    public getEffectiveBandwidth(baseBandwidth: number, health: number = 1.0): number {
        return baseBandwidth * Math.max(0, health);
    }
}
