/**
 * ProcedureRegistry - Domain Layer Entity
 * 
 * A central registry for built-in Scheme functions.
 * Enables modular extension of the standard library (TCO-ready).
 * 
 * Pillar: THE MASTER’S TOOL (Design Patterns - Registry)
 * Pillar: THE FOUR-FOLD SHIELD (Dependency Minimalism)
 * 
 * Intent:
 * Decouples the evaluator from specific math or list functions.
 * Allows the game to inject "hacking" procedures into the Scheme environment.
 */

import { SchemeValue, makeProcedure, Procedure } from './SchemeValue';
import { Environment } from './Environment';

export type BuiltinFunc = (args: SchemeValue[]) => SchemeValue;

export class ProcedureRegistry {
    private static instance: ProcedureRegistry;
    private registry: Map<string, BuiltinFunc> = new Map();

    private constructor() { }

    public static getInstance(): ProcedureRegistry {
        if (!ProcedureRegistry.instance) {
            ProcedureRegistry.instance = new ProcedureRegistry();
        }
        return ProcedureRegistry.instance;
    }

    /**
     * Register a new built-in function.
     */
    register(name: string, func: BuiltinFunc): void {
        this.registry.set(name.toLowerCase(), func);
    }

    /**
     * Populate an environment with all registered built-ins.
     */
    populate(env: Environment): void {
        for (const [name, func] of this.registry.entries()) {
            const proc: Procedure = {
                name,
                isBuiltin: true,
                call: func
            };
            env.define(name, makeProcedure(proc));
        }
    }

    /**
     * Clear all registrations (mainly for testing).
     */
    clear(): void {
        this.registry.clear();
    }
}
