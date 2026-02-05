export type MasteryLevel = 'NOVICE' | 'COMPETENT' | 'MASTER';

export class MasteryTracker {
    private successCounts: Map<string, number> = new Map();
    private failureCounts: Map<string, number> = new Map();

    recordSuccess(command: string): void {
        const current = this.successCounts.get(command) || 0;
        this.successCounts.set(command, current + 1);
    }

    recordFailure(command: string): void {
        const current = this.failureCounts.get(command) || 0;
        this.failureCounts.set(command, current + 1);
    }

    getLevel(command: string): MasteryLevel {
        const count = this.successCounts.get(command) || 0;
        if (count >= 15) return 'MASTER';
        if (count >= 5) return 'COMPETENT';
        return 'NOVICE';
    }

    getFailCount(command: string): number {
        return this.failureCounts.get(command) || 0;
    }
}
