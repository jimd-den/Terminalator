/**
 * ILedgerRepository - Domain Layer
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Pure Ledger Interface
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Transaction } from '../entities/economy/Wallet';

export interface ILedgerRepository {
    /**
     * Appends a new entry to the immutable ledger.
     */
    append(transaction: Transaction): Promise<void>;

    /**
     * Recomputes the total balance from the ledger.
     */
    getBalance(): Promise<number>;

    /**
     * Retrieves the transaction history.
     */
    getHistory(limit?: number): Promise<Transaction[]>;
}
