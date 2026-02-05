/**
 * DiskCreditRepository.ts
 * 
 * Implements ICreditRepository using the simulated FileSystem.
 */

import { ICreditRepository } from '../domain/interfaces/ICreditRepository';
import { FileSystemService } from '../domain/services/FileSystemService';

export class DiskCreditRepository implements ICreditRepository {
    private readonly PATH = '/home/operator/.local/share/credits.json';

    constructor(private fs: FileSystemService) {}

    async getCredits(): Promise<number> {
        try {
            const data = this.fs.readFile(this.PATH);
            const parsed = JSON.parse(data);
            return parsed.credits || 0;
        } catch (e) {
            return 0;
        }
    }

    async saveCredits(amount: number): Promise<void> {
        // Ensure directory exists
        const dir = '/home/operator/.local/share';
        try {
            this.fs.mkdirp(dir);
        } catch (e) {
            // Might already exist
        }

        const data = JSON.stringify({ credits: amount });
        this.fs.writeFile(this.PATH, data, 'w');
    }
}
