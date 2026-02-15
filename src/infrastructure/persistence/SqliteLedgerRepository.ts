/**
 * SqliteLedgerRepository - Infrastructure Layer
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The External Database (SQLite)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Implements ILedgerRepository using expo-sqlite.
 * This is the definitive "Clean Architecture" solution for offline-first storage.
 * Surivives app reloads, Metro disconnections, and system resets.
 */

import * as SQLite from 'expo-sqlite';
import { ILedgerRepository } from '../../domain/interfaces/ILedgerRepository';
import { Transaction } from '../../domain/entities/economy/Wallet';

export class SqliteLedgerRepository implements ILedgerRepository {
    private db: SQLite.SQLiteDatabase | null = null;
    private initialized: Promise<void>;

    constructor() {
        this.initialized = this.init();
    }

    private async init() {
        try {
            this.db = await SQLite.openDatabaseAsync('terminalator_economy.db');
            
            // Create immutable ledger table
            await this.db.execAsync(`
                PRAGMA journal_mode = WAL;
                CREATE TABLE IF NOT EXISTS ledger (
                    id TEXT PRIMARY KEY NOT NULL,
                    amount REAL NOT NULL,
                    type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    timestamp INTEGER NOT NULL
                );
            `);
            console.log("[SqliteLedger] Database Initialized.");
        } catch (e) {
            console.error("[SqliteLedger] Initialization Failed:", e);
        }
    }

    public async append(tx: Transaction): Promise<void> {
        await this.initialized;
        if (!this.db) return;

        console.log(`[SqliteLedger] DB_APPEND ${tx.type}: ${tx.amount} Ƶ (${tx.description})`);

        try {
            await this.db.runAsync(
                'INSERT INTO ledger (id, amount, type, description, timestamp) VALUES (?, ?, ?, ?, ?)',
                [tx.id, tx.amount, tx.type, tx.description, tx.timestamp]
            );
        } catch (e) {
            console.error("[SqliteLedger] Append Failed:", e);
        }
    }

    public async getBalance(): Promise<number> {
        await this.initialized;
        if (!this.db) return 0;

        try {
            // Recompute balance purely from the ledger
            const result = await this.db.getFirstAsync<{ balance: number }>(`
                SELECT 
                    SUM(CASE WHEN type = 'CREDIT' THEN amount ELSE -amount END) as balance 
                FROM ledger
            `);
            return result?.balance || 0;
        } catch (e) {
            console.error("[SqliteLedger] GetBalance Failed:", e);
            return 0;
        }
    }

    public async getHistory(limit: number = 50): Promise<Transaction[]> {
        await this.initialized;
        if (!this.db) return [];

        try {
            const rows = await this.db.getAllAsync<any>(
                'SELECT * FROM ledger ORDER BY timestamp DESC LIMIT ?',
                [limit]
            );
            return rows.map(r => ({
                id: r.id,
                amount: r.amount,
                type: r.type as 'CREDIT' | 'DEBIT',
                description: r.description,
                timestamp: r.timestamp
            }));
        } catch (e) {
            console.error("[SqliteLedger] GetHistory Failed:", e);
            return [];
        }
    }
}
