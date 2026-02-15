/**
 * EconomyService - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Economy of Computation (Ƶ)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Orchestrates meta-game wealth (Ƶ) using a pure ledger-based persistence model.
 * Adheres to Clean Architecture by interacting only with the ILedgerRepository.
 */

import { MiningSession } from '../entities/economy/MiningSession';
import { SimulationBus, GameEventType } from './SimulationBus';
import { RhythmConductor } from './RhythmConductor';
import { Transaction } from '../entities/economy/Wallet';
import { ILedgerRepository } from '../interfaces/ILedgerRepository';
import { DependencyContainer } from '../../infrastructure/di/DependencyContainer';

export class EconomyService {
    private session: MiningSession;
    private tickInterval: any = null;
    private capturedNodes: Map<string, number> = new Map(); // hostname -> cpuPower
    
    // Pillar: THE BALANCED SCALE (Ledger as Source of Truth)
    private repository: ILedgerRepository;
    private cachedBalance: number = 0;

    constructor(
        private bus?: SimulationBus,
        private conductor?: RhythmConductor
    ) {
        console.log(`[EconomyService] INITIALIZING WITH PERSISTENT LEDGER`);
        this.session = new MiningSession();
        this.repository = DependencyContainer.createLedgerRepository();
        
        // Initial balance sync
        this.syncCachedBalance();
        this.startTicker();
    }

    private async syncCachedBalance() {
        this.cachedBalance = await this.repository.getBalance();
        console.log(`[EconomyService] Initial Balance Synced: ${this.cachedBalance} Ƶ`);
        this.emitUpdate();
    }

    private startTicker() {
        if (this.tickInterval) clearInterval(this.tickInterval);
        this.tickInterval = setInterval(async () => {
            let totalPassive = this.session.decay();
            
            // Add passive income from captured nodes
            this.capturedNodes.forEach((power) => {
                totalPassive += (power / 100); // 100 CPU power = 1 Ƶ/sec
            });

            if (totalPassive > 0) {
                await this.credit(totalPassive, 'PASSIVE MINING');
            }
        }, 1000);
    }

    public registerCapturedNode(hostname: string, cpuPower: number) {
        console.log(`[EconomyService] Captured Node: ${hostname} (+${cpuPower/100} Ƶ/sec)`);
        this.capturedNodes.set(hostname, cpuPower);
        this.emitUpdate();
    }

    public getBalance(): number {
        return this.cachedBalance;
    }

    public getSession(): MiningSession {
        return this.session;
    }

    public startSession() {
        this.session.startSession();
        this.emitUpdate();
    }

    public dispose() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }

    public async debit(amount: number, description: string): Promise<boolean> {
        if (amount <= 0) return true;
        if (this.cachedBalance < amount) {
            console.log(`[EconomyService] DEBIT REJECTED: Insufficient Funds (${amount} > ${this.cachedBalance})`);
            return false;
        }

        const tx: Transaction = {
            id: Math.random().toString(36).substring(2, 9),
            amount,
            timestamp: Date.now(),
            description,
            type: 'DEBIT'
        };

        await this.repository.append(tx);
        await this.syncCachedBalance();
        return true;
    }

    public async credit(amount: number, description: string): Promise<void> {
        if (amount <= 0) return;

        const tx: Transaction = {
            id: Math.random().toString(36).substring(2, 9),
            amount,
            timestamp: Date.now(),
            description,
            type: 'CREDIT'
        };

        await this.repository.append(tx);
        await this.syncCachedBalance();
    }

    /**
     * Record a rhythmic hit and update balance.
     */
    public async recordHit(isOnBeat?: boolean) {
        const reward = this.session.processHit(Date.now(), isOnBeat);
        if (reward > 0) {
            await this.credit(reward, 'RHYTHM MINING');
        }
    }

    public recordMistake() {
        this.session.penalize();
        this.emitUpdate();
    }

    private emitUpdate() {
        if (this.bus) {
            this.bus.emit(GameEventType.ECONOMY_UPDATE, {
                balance: this.cachedBalance,
                hashRate: this.session.hashRate + (Array.from(this.capturedNodes.values()).reduce((a, b) => a + b, 0) / 100),
                streak: this.session.streak,
                sessionReward: this.session.sessionZincMined,
                totalMined: this.session.totalZincMined,
                capturedCount: this.capturedNodes.size
            });
        }
    }
}
