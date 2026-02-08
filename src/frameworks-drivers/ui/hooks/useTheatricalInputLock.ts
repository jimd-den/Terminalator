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
        const unsubStart = bus.subscribe(GameEventType.TUTOR_EVENT, (event) => {
            if (event.payload.type === 'PRESENTATION_START') {
                console.log("[useTheatricalInputLock] Seizing input control.");
                setInputLocked(true);
            } else if (event.payload.type === 'PRESENTATION_END') {
                console.log("[useTheatricalInputLock] Releasing input control.");
                setInputLocked(false);
            }
        });

        return () => {
            unsubStart();
        };
    }, [bus, setInputLocked]);
};
