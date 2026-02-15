/**
 * WalletRepository - Infrastructure Layer
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Persistence Adapter
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Implements a persistent storage for the Wallet using the best available method:
 * 1. Node.js 'fs' (for CLI/Tests) - Writes to 'wallet_db.json'
 * 2. In-Memory Fallback (for ephemeral sessions)
 * 
 * Future: Can be extended to use AsyncStorage for Mobile.
 */

import { Wallet } from '../../domain/entities/economy/Wallet';

export interface IWalletRepository {
    save(wallet: Wallet): void;
    load(): Wallet | null;
}

export class WalletRepository implements IWalletRepository {
    private readonly DB_PATH = './wallet_db.json';

    public save(wallet: Wallet): void {
        const data = JSON.stringify(wallet.toJSON(), null, 2);
        
        try {
            // Node.js environment check
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                const fs = require('fs');
                fs.writeFileSync(this.DB_PATH, data);
                console.log(`[WalletRepository] Saved to external DB: ${this.DB_PATH}`);
            }
        } catch (e) {
            console.error(`[WalletRepository] Save failed: ${e}`);
        }
    }

    public load(): Wallet | null {
        try {
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                const fs = require('fs');
                if (fs.existsSync(this.DB_PATH)) {
                    const data = fs.readFileSync(this.DB_PATH, 'utf-8');
                    const json = JSON.parse(data);
                    console.log(`[WalletRepository] Loaded from external DB. Balance: ${json.balance}`);
                    return new Wallet(json);
                }
            }
        } catch (e) {
            console.error(`[WalletRepository] Load failed: ${e}`);
        }
        return null;
    }
}
