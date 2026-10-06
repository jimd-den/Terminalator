/**
 * Wallet.ts - Domain Entity
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The ZINC Ledger (Event Sourcing Pattern)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Implements a pure ledger-based economy. 
 * Balance is a derived property, preventing "overwrite" bugs.
 */

export interface Transaction {
    id: string;
    amount: number;
    timestamp: number;
    description: string;
    type: 'DEBIT' | 'CREDIT';
}

export class Wallet {
    // The Ledger is the single source of truth
    private _transactions: Transaction[] = [];
    private _lastUpdated: number = Date.now();

    constructor(data?: { transactions?: Transaction[], lastUpdated?: number }) {
        console.log(`[Wallet] INSTANTIATED. UUID: ${Math.random().toString(36).substring(7)}`);
        if (data && data.transactions) {
            this._transactions = data.transactions;
            this._lastUpdated = data.lastUpdated || Date.now();
        }
    }

    /**
     * PURE DERIVATION: Balance is computed from the ledger.
     * This prevents any state-sync issues from "erasing" funds.
     */
    get balance(): number {
        return this._transactions.reduce((acc, tx) => {
            return tx.type === 'CREDIT' ? acc + tx.amount : acc - tx.amount;
        }, 0);
    }

    get transactions(): Transaction[] {
        return [...this._transactions];
    }

    get lastUpdated(): number {
        return this._lastUpdated;
    }

    /**
     * Appends a credit event to the ledger.
     */
    public credit(amount: number, description: string): void {
        if (amount <= 0) return;
        const before = this.balance;
        this.addTransaction('CREDIT', amount, description);
        console.log(`[Wallet] LEDGER CREDIT: +${amount} Ƶ (${description}). Total Entries: ${this._transactions.length}. [${before.toFixed(2)} -> ${this.balance.toFixed(2)}]`);
    }

    /**
     * Appends a debit event to the ledger if funds are sufficient.
     */
    public debit(amount: number, description: string): boolean {
        if (amount <= 0) return true;
        const current = this.balance;
        if (current < amount) {
            console.log(`[Wallet] LEDGER DEBIT FAILED: ${amount} > ${current} (${description})`);
            return false;
        }
        
        this.addTransaction('DEBIT', amount, description);
        console.log(`[Wallet] LEDGER DEBIT: -${amount} Ƶ (${description}). Total Entries: ${this._transactions.length}. [${current.toFixed(2)} -> ${this.balance.toFixed(2)}]`);
        return true;
    }

    private addTransaction(type: 'DEBIT' | 'CREDIT', amount: number, description: string) {
        const tx: Transaction = {
            id: Math.random().toString(36).substring(2, 9),
            amount,
            description,
            type,
            timestamp: Date.now()
        };
        // Use push for chronological ledger
        this._transactions.push(tx);
        this._lastUpdated = Date.now();
        
        // Optional: Keep ledger size sane for performance, but 1000s of entries are fine
        if (this._transactions.length > 1000) {
            // In a real DB we'd snapshot, here we can just keep the log
        }
    }

    public toJSON() {
        return {
            transactions: this._transactions,
            lastUpdated: this._lastUpdated,
            // Balance included in JSON for external consumers, but ignored on load
            balance: this.balance 
        };
    }
}
