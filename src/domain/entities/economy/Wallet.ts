/**
 * Wallet.ts - Domain Entity
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The ZINC Wallet
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export interface Transaction {
    id: string;
    amount: number;
    timestamp: number;
    description: string;
    type: 'DEBIT' | 'CREDIT';
}

export interface Wallet {
    balance: number;
    transactions: Transaction[];
    lastUpdated: number;
}
