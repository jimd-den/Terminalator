/**
 * LocalStorageLedgerRepository - Infrastructure Layer
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * Browser-Native Ledger (fallback for Web)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Implements ILedgerRepository using browser localStorage.
 * Provides the same pure ledger logic as the SQLite implementation
 * but avoids the Web Worker/WASM bundling issues on the web.
 * 
 * Satisfies the "offline-first mobile and browser" requirement.
 */

import { ILedgerRepository } from '../../domain/interfaces/ILedgerRepository';
import { Transaction } from '../../domain/entities/economy/Wallet';

export class LocalStorageLedgerRepository implements ILedgerRepository {
    private readonly STORAGE_KEY = 'terminalator_ledger';

    public async append(tx: Transaction): Promise<void> {
        console.log(`[LocalStorageLedger] DB_APPEND ${tx.type}: ${tx.amount} Ƶ (${tx.description})`);
        const history = await this.getHistory();
        history.push(tx);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(history));
    }

    public async getBalance(): Promise<number> {
        const history = await this.getHistory();
        return history.reduce((acc, tx) => {
            return tx.type === 'CREDIT' ? acc + tx.amount : acc - tx.amount;
        }, 0);
    }

    public async getHistory(limit?: number): Promise<Transaction[]> {
        const data = localStorage.getItem(this.STORAGE_KEY);
        if (!data) return [];
        try {
            const history = JSON.parse(data) as Transaction[];
            if (limit) return history.slice(-limit);
            return history;
        } catch (e) {
            console.error("[LocalStorageLedger] Failed to parse ledger data:", e);
            return [];
        }
    }
}
