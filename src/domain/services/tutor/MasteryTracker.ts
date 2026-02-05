import { IMasteryRepository, MasteryData } from '../../interfaces/IMasteryRepository';

export type MasteryLevel = 'NOVICE' | 'COMPETENT' | 'MASTER';

export class MasteryTracker {
    private successCounts: Map<string, number> = new Map();
    private failureCounts: Map<string, number> = new Map();
    private repository?: IMasteryRepository;
    private initialized: Promise<void>;

    constructor(repository?: IMasteryRepository) {
        this.repository = repository;
        this.initialized = this.load();
    }

    private async load() {
        if (this.repository) {
            const data = await this.repository.getMasteryData();
            this.successCounts = new Map(Object.entries(data.successCounts));
            this.failureCounts = new Map(Object.entries(data.failureCounts));
        }
    }

    private async save() {
        if (this.repository) {
            const data: MasteryData = {
                successCounts: Object.fromEntries(this.successCounts),
                failureCounts: Object.fromEntries(this.failureCounts)
            };
            await this.repository.saveMasteryData(data);
        }
    }

    async recordSuccess(command: string): Promise<void> {
        await this.initialized;
        const current = this.successCounts.get(command) || 0;
        this.successCounts.set(command, current + 1);
        await this.save();
    }

    async recordFailure(command: string): Promise<void> {
        await this.initialized;
        const current = this.failureCounts.get(command) || 0;
        this.failureCounts.set(command, current + 1);
        await this.save();
    }

    getLevel(command: string): MasteryLevel {
        // Warning: getLevel is NOT async. If called too early, might return stale data.
        // But in practice, UI calls it after some interaction.
        const count = this.successCounts.get(command) || 0;
        if (count >= 15) return 'MASTER';
        if (count >= 5) return 'COMPETENT';
        return 'NOVICE';
    }

    getFailCount(command: string): number {
        return this.failureCounts.get(command) || 0;
    }
}
