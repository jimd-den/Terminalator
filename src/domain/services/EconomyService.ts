/**
 * EconomyService - Domain Service
 * 
 * Manages the ZINC economy (Ƶ).
 * Handles wallet persistence and mining rewards.
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture)
 * Pillar: THE SHADOW'S VEIL (Persistence)
 */

import { FileSystemService } from './FileSystemService';
import { MiningSession } from '../entities/economy/MiningSession';
import { SimulationBus, GameEventType } from './SimulationBus';
import { RhythmConductor } from './RhythmConductor';

export class EconomyService {
    private zincBalance: number = 0;
    private readonly WALLET_PATH = '/home/operator/.wallet';
    private session: MiningSession;
    private tickInterval: any = null;

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
        console.log("[EconomyService] Starting ticker...");
        this.tickInterval = setInterval(() => {
            const passiveReward = this.session.decay();
            if (passiveReward > 0 || this.session.hashRate > 0) {
                this.zincBalance += passiveReward;
                this.emitUpdate();
            }
        }, 1000); // Pulse every second
    }

    public getBalance(): number {
        return this.zincBalance;
    }

    public getSession(): MiningSession {
        return this.session;
    }

    public startSession() {
        this.session.startSession();
        this.emitUpdate();
    }

    /**
     * Record a rhythmic hit and update balance.
     */
    public recordHit(nextBeatTime?: number) {
        const reward = this.session.processHit(Date.now(), nextBeatTime);
        if (reward > 0) {
            this.zincBalance += reward;
            this.saveWallet();
            this.emitUpdate();
        }
    }

    /**
     * Penalize for mistake.
     */
    public recordMistake() {
        this.session.penalize();
        this.emitUpdate();
    }

    private emitUpdate() {
        if (this.bus) {
            this.bus.emit(GameEventType.ECONOMY_UPDATE, {
                balance: this.zincBalance,
                hashRate: this.session.hashRate,
                streak: this.session.streak,
                sessionReward: this.session.sessionZincMined
            });
        }
    }

    private loadWallet() {
        try {
            const node = this.fsService.resolve(this.WALLET_PATH);
            if (node) {
                const content = this.fsService.readFile(this.WALLET_PATH);
                const data = JSON.parse(content);
                this.zincBalance = data.balance || 0;
            } else {
                this.saveWallet(); // Create initial wallet
            }
        } catch (e) {
            console.error("[EconomyService] Failed to load wallet:", e);
            this.zincBalance = 0;
        }
    }

    private saveWallet() {
        try {
            const data = {
                balance: this.zincBalance,
                lastSync: Date.now(),
                currency: 'ZINC',
                symbol: 'Ƶ'
            };
            this.fsService.writeFile(this.WALLET_PATH, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error("[EconomyService] Failed to save wallet:", e);
        }
    }

    public syncWallet() {
        this.loadWallet();
    }
}
