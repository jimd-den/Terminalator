/**
 * EconomyProvider - Presentation Layer
 * 
 * Provides access to the game's economy (Zinc/Credits).
 * Synchronizes balance state via the SimulationBus.
 * 
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture)
 * Pillar: THE OBSERVER (Event-driven state sync)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { EconomyService } from '../../../domain/services/EconomyService';
import { CoreEngine } from '../../../core/CoreEngine';
import { GameEventType } from '../../../domain/services/SimulationBus';

interface EconomyContextType {
    zincBalance: number;
    syncWallet: () => Promise<void>;
    economyService: EconomyService;
}

const EconomyContext = createContext<EconomyContextType | undefined>(undefined);

export const EconomyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const engine = CoreEngine.getInstance();
    const economyService = engine.getEconomyService();
    const bus = engine.getSimulationBus();

    const [zincBalance, setZincBalance] = useState(() => economyService.getBalance());

    useEffect(() => {
        const unsubscribe = bus.subscribe(GameEventType.ECONOMY_UPDATE, (event) => {
            setZincBalance(event.payload.balance);
        });
        return unsubscribe;
    }, [bus]);

    const syncWallet = useCallback(async () => {
        economyService.syncWallet();
        setZincBalance(economyService.getBalance());
    }, [economyService]);

    // Initial sync
    useEffect(() => {
        syncWallet();
    }, [syncWallet]);

    return (
        <EconomyContext.Provider value={{ zincBalance, syncWallet, economyService }}>
            {children}
        </EconomyContext.Provider>
    );
};

export const useEconomy = () => {
    const context = useContext(EconomyContext);
    if (!context) {
        throw new Error('useEconomy must be used within an EconomyProvider');
    }
    return context;
};
