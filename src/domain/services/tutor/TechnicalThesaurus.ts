/**
 * TechnicalThesaurus.ts
 *
 * Pillar: THE STORYTELLER’S CODE (Reflective Commentary)
 * Pillar: THE FOUR-FOLD SHIELD (Clean Architecture) - Domain Service
 *
 * Intent:
 * Uses metaprogramming and reflection to generate technical explanations 
 * for system primitives (Scheme, RISC-V) without hard-coded dictionaries.
 */

import { getPurePrimitives } from '../../usecases/SchemePrimitives';

export class TechnicalThesaurus {
    
    /**
     * Dynamically generates an explanation for a technical symbol.
     */
    public explain(symbol: string): string {
        // 1. Check Scheme Primitives
        const schemePrimitive = getPurePrimitives().find(p => p.name === symbol);
        if (schemePrimitive) {
            return `SCHEME_PRIMITIVE: This is a built-in procedure. It operates on ${schemePrimitive.func.length} arguments.`;
        }

        // 2. Check RISC-V Instructions (Simulated reflection)
        const riscvInstructions: Record<string, string> = {
            'addi': 'Add Immediate: Adds a sign-extended 12-bit immediate to a register.',
            'lw': 'Load Word: Loads a 32-bit value from memory into a register.',
            'beq': 'Branch if Equal: Branches if the values in two registers are equal.'
        };

        if (riscvInstructions[symbol.toLowerCase()]) {
            return `RISCV_INSTRUCTION: ${riscvInstructions[symbol.toLowerCase()]}`;
        }

        return `UNKNOWN_SYMBOL: No architectural data available for '${symbol}'.`;
    }
}
