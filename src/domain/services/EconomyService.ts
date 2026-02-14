/**
 * EconomyService - Domain Service
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * The Economy of Computation (Ƶ)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Manages the ZINC economy (Ƶ).
 * Handles passive mining from captured nodes and active mining from typing.
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture)
 */

import { FileSystemService } from './FileSystemService';
import { MiningSession } from '../entities/economy/MiningSession';
import { SimulationBus, GameEventType } from './SimulationBus';
import { RhythmConductor } from './RhythmConductor';
import { Wallet, Transaction } from '../entities/economy/Wallet';

export class EconomyService {
    private wallet: Wallet = { balance: 0, transactions: [], lastUpdated: Date.now() };
    private readonly WALLET_PATH = '/home/operator/.wallet';
    private session: MiningSession;
    private tickInterval: any = null;
    private capturedNodes: Map<string, number> = new Map(); // hostname -> cpuPower

    constructor(
        private fsService: FileSystemService, 
        private bus?: SimulationBus,
        private conductor?: RhythmConductor
    ) {
        this.session = new MiningSession();
        this.loadWallet();
        this.startTicker();
    }

    private startTicker() {
        if (this.tickInterval) clearInterval(this.tickInterval);
        this.tickInterval = setInterval(() => {
            let totalPassive = this.session.decay();
            
            // Add passive income from captured nodes
            this.capturedNodes.forEach((power) => {
                totalPassive += (power / 100); // 100 CPU power = 1 Ƶ/sec
            });

            if (totalPassive > 0) {
                this.wallet.balance += totalPassive;
                this.emitUpdate();
            }
        }, 1000);
    }

    public registerCapturedNode(hostname: string, cpuPower: number) {
        this.capturedNodes.set(hostname, cpuPower);
        this.emitUpdate();
    }

    public getBalance(): number {
        return this.wallet.balance;
    }

    public getSession(): MiningSession {
        return this.session;
    }

    public startSession() {
        this.session.startSession();
        this.emitUpdate();
    }

    public syncWallet() {
        this.loadWallet();
    }

    public debit(amount: number, description: string): boolean {
        if (this.wallet.balance < amount) return false;
        
        this.wallet.balance -= amount;
        this.addTransaction('DEBIT', amount, description);
        this.saveWallet();
        this.emitUpdate();
        return true;
    }

    public credit(amount: number, description: string) {
        this.wallet.balance += amount;
        this.addTransaction('CREDIT', amount, description);
        this.saveWallet();
        this.emitUpdate();
    }

    private addTransaction(type: 'DEBIT' | 'CREDIT', amount: number, description: string) {
        const tx: Transaction = {
            id: Math.random().toString(36).substring(2, 9),
            amount,
            description,
            type,
            timestamp: Date.now()
        };
        this.wallet.transactions.unshift(tx);
        if (this.wallet.transactions.length > 50) this.wallet.transactions.pop();
    }

    /**
     * Record a rhythmic hit and update balance.
     */
    public recordHit(nextBeatTime?: number) {
        const reward = this.session.processHit(Date.now(), nextBeatTime);
        if (reward > 0) {
            this.wallet.balance += reward;
            this.saveWallet();
            this.emitUpdate();
        }
    }

    public recordMistake() {
        this.session.penalize();
        this.emitUpdate();
    }

    private emitUpdate() {
        if (this.bus) {
            this.bus.emit(GameEventType.ECONOMY_UPDATE, {
                balance: this.wallet.balance,
                hashRate: this.session.hashRate + (Array.from(this.capturedNodes.values()).reduce((a, b) => a + b, 0) / 100),
                streak: this.session.streak,
                sessionReward: this.session.sessionZincMined,
                capturedCount: this.capturedNodes.size
            });
        }
    }

    private loadWallet() {
        try {
            const content = this.fsService.readFile(this.WALLET_PATH);
            const data = JSON.parse(content);
            this.wallet = {
                balance: data.balance || 0,
                transactions: data.transactions || [],
                lastUpdated: data.lastUpdated || Date.now()
            };
        } catch (e) {
            this.saveWallet(); 
        }
    }

    private saveWallet() {
        try {
            this.wallet.lastUpdated = Date.now();
            this.fsService.writeFile(this.WALLET_PATH, JSON.stringify(this.wallet, null, 2));
        } catch (e) {}
    }
}
