interface Keystroke {
    char: string;
    timestamp: number;
}

export interface TutorReaction {
    text: string;
    type: 'info' | 'warn' | 'hint' | 'critical';
}

export class TutorSpy {
    private history: Keystroke[] = [];
    private startTime: number = 0;

    recordKeystroke(char: string, timestamp: number = Date.now()): void {
        if (this.history.length === 0) this.startTime = timestamp;
        this.history.push({ char, timestamp });
        
        // Keep only last 10 seconds of history for rolling WPM calculation contexts
        // But for the calculation itself, we need to respect the input timeframe.
        // For simplicity in this iteration, we track all session history but calculate based on bounds.
    }

    calculateWPM(now: number = Date.now()): number {
        if (this.history.length < 2) return 0;
        
        // Calculate based on the full recorded history span
        const start = this.history[0].timestamp;
        const durationMin = (now - start) / 60000;
        
        if (durationMin <= 0) return 0;

        const chars = this.history.length;
        const words = chars / 5;
        return Math.round(words / durationMin);
    }

    analyze(wpm: number): TutorReaction | null {
        if (wpm < 20) {
            return {
                text: "My sensors detect a biological bottleneck. Type faster.",
                type: 'warn'
            };
        }
        if (wpm > 100) {
            return {
                text: "Impressive throughput. Are you enhanced?",
                type: 'info'
            };
        }
        return null;
    }
}
