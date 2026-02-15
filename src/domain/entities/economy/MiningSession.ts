/**
 * MiningSession - Domain Entity
 * 
 * Implements "Proof of Rhythm" mining logic.
 * Tracks keystroke timing relative to the mainframe's internal clock.
 * 
 * Pillar: THE STORYTELLER'S CODE (Gamification)
 * Pillar: THE Swift Stream (Performance/Timing)
 */

export enum RhythmSubdivision {
    QUARTER = 1,
    EIGHTH = 2,
    SIXTEENTH = 4
}

export class MiningSession {
    public hashRate: number = 0.0;
    public totalZincMined: number = 0;
    public sessionZincMined: number = 0;
    public streak: number = 0;
    public lastBeatTime: number = 0;
    
    private readonly BASE_REWARD = 1.0; // [REBALANCED] 1 Hit ≈ 1 ZCoin (at base hashrate)
    private readonly MAX_HASHRATE = 100.0;
    private readonly STREAK_BOOST = 0.1;
    private readonly PASSIVE_DECAY = 0.02; // Per tick
    private readonly MISTAKE_PENALTY = 0.5;
    
    private readonly BPM = 120; // Mainframe internal heartbeat
    private readonly BEAT_MS = (60 / 120) * 1000;

    /**
     * Processes a rhythmic hit.
     * @param timestamp - Current time in ms.
     * @param forceOnBeat - Optional override for rhythm check.
     * @returns reward for this hit.
     */
    public processHit(timestamp: number, forceOnBeat?: boolean): number {
        // Use robust modulo arithmetic (same as TutorEngine)
        // This allows hits slightly before OR after the beat.
        const beatOffset = timestamp % this.BEAT_MS;
        const isOnBeat = forceOnBeat !== undefined ? forceOnBeat : (beatOffset < 80 || beatOffset > (this.BEAT_MS - 80));

        if (isOnBeat) {
            this.streak++;
            // Hashrate increases with streak
            this.hashRate = Math.min(this.MAX_HASHRATE, this.hashRate + this.STREAK_BOOST);
            
            const reward = this.BASE_REWARD * this.hashRate;
            this.totalZincMined += reward;
            this.sessionZincMined += reward;
            return reward;
        } else {
            this.penalize();
            return 0;
        }
    }

    /**
     * Passive decay of hashrate over time.
     */
    public decay(): number {
        if (this.hashRate > 0) {
            this.hashRate = Math.max(0, this.hashRate - this.PASSIVE_DECAY);
        }
        
        // Passive income: Small trickle as long as hashrate > 0
        const passiveReward = (this.BASE_REWARD * this.hashRate) / 10;
        this.totalZincMined += passiveReward;
        this.sessionZincMined += passiveReward;
        return passiveReward;
    }

    private checkSubdivisions(offset: number): boolean {
        const tolerance = 80; // ms
        
        // Check Quarter (0)
        if (offset < tolerance) return true;
        
        // Check Eighth (BEAT / 2)
        const eighth = this.BEAT_MS / 2;
        if (Math.abs(offset - eighth) < tolerance) return true;

        // Check Sixteenth (BEAT / 4)
        const sixteenth = this.BEAT_MS / 4;
        if (Math.abs(offset - sixteenth) < tolerance) return true;
        if (Math.abs(offset - (sixteenth * 3)) < tolerance) return true;

        return false;
    }

    public penalize() {
        this.streak = 0;
        this.hashRate = Math.max(0, this.hashRate - this.MISTAKE_PENALTY);
    }

    public startSession() {
        this.sessionZincMined = 0;
    }

    public reset() {
        this.streak = 0;
        this.hashRate = 0.0;
        this.totalZincMined = 0;
        this.sessionZincMined = 0;
    }
}
