import React, { useEffect, useMemo } from 'react';
import { useProcess } from '../context/ProcessProvider';
import { useInput } from '../context/InputContext';
import { GameEventType } from '../../../domain/services/SimulationBus';
import { PerformanceMonitor } from '../VisualCortex/PerformanceMonitor';
import { useVisualDirector } from '../../../interface-adapters/ui/VisualCortex/useVisualDirector';

/**
 * AppInitializer - Presentation Layer
 * 
 * Handles initial system boot logic via SimulationBus events.
 */
export const AppInitializer = () => {
    const { bus } = useProcess();
    const { setInputLocked } = useInput();
    const { reportLag } = useVisualDirector();

    useEffect(() => {
        // Ensure input is unlocked on boot
        setInputLocked(false);

        // Notify Domain that system is ready
        if (bus) {
            bus.emit(GameEventType.SYSTEM_BOOT, { timestamp: Date.now() });
        }

        // Initialize Performance Monitor
        const monitor = new PerformanceMonitor();
        monitor.onLagDetected(() => {
            console.warn("[AppInitializer] Performance Lag Detected. Triggering Reduced Motion.");
            reportLag();
        });
        monitor.start();

        return () => monitor.stop();
    }, [reportLag]);

    return null;
};
