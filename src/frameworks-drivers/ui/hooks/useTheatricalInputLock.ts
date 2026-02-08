import { useEffect } from 'react';
import { useProcess } from '../context/ProcessProvider';
import { useInput } from '../context/InputContext';
import { GameEventType } from '../../../domain/services/SimulationBus';

/**
 * useTheatricalInputLock - Presentation Layer Hook
 * 
 * Automatically locks user input when a theatrical presentation starts
 * and unlocks it when it ends. This ensures that users cannot interrupt
 * heavy animations or "Glass Box" sequences.
 * 
 * Pillar: THE STORYTELLER'S CODE (Interruption Gating)
 */
export const useTheatricalInputLock = () => {
    const { bus } = useProcess();
    const { setInputLocked } = useInput();

    useEffect(() => {
        const unsub = bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
            const type = event.payload.type;
            if (type === 'THEATRE_ACTIVE') {
                console.log("[useTheatricalInputLock] Seizing input control.");
                setInputLocked(true);
            } else if (type === 'THEATRE_COMPLETE') {
                console.log("[useTheatricalInputLock] Releasing input control.");
                setInputLocked(false);
            }
        });

        return () => {
            unsub();
        };
    }, [bus, setInputLocked]);
};
