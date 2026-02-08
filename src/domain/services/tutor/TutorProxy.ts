/**
 * TutorProxy.ts
 *
 * Pillar: THE STORYTELLER’S CODE (Metaprogramming)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Service
 *
 * Intent:
 * A factory that wraps Domain Entities in a TypeScript Proxy to intercept 
 * low-level state changes. This provides the Tutor with "Deep Context" 
 * without modifying the core entities themselves.
 *
 * Why: To maintain the purity of entities like CpuState while allowing
 * the TutorBot to "see" exactly what values are being written to registers.
 */

import { CpuState } from '../../entities/asm/CpuState';
import { SimulationBus, GameEventType } from '../SimulationBus';

export class TutorProxy {
    
    /**
     * Wraps a CpuState instance to emit deep-context events.
     */
    public static wrapCpuState(cpu: CpuState, bus: SimulationBus): CpuState {
        return new Proxy(cpu, {
            get(target: any, prop: string | symbol, receiver: any) {
                const value = Reflect.get(target, prop, receiver);
                
                // Intercept 'setRegister' to capture the intent
                if (prop === 'setRegister' && typeof value === 'function') {
                    return (...args: any[]) => {
                        const [index, newVal] = args;
                        const oldValue = target.getRegister(index);
                        
                        // Execute actual logic
                        const result = value.apply(target, args);
                        
                        // Emit deep-context event for the Tutor
                        bus.emit(GameEventType.REGISTER_MODIFIED, {
                            register: CpuState.getRegisterName(index),
                            index,
                            oldValue,
                            newValue: newVal,
                            source: 'PROXY'
                        });
                        
                        return result;
                    };
                }
                
                return value;
            }
        });
    }

    /**
     * Future: wrapFileSystem, wrapEnvironment, etc.
     */
}
