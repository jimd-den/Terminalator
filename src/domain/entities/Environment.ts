/**
 * Environment - Domain Layer Entity
 * 
 * Manages lexical scope and variable bindings for the Scheme engine.
 * Supports hierarchical scopes (parent pointers) for closures.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture) - Encapsulation
 * Pillar: THE BALANCED SCALE (SOLID) - Liskov Substitution
 * 
 * Intent:
 * Provides a structured way to resolve symbols to values.
 * Allows nested scopes while maintaining visibility of outer variables.
 */

import { SchemeValue } from './SchemeValue';

export class Environment {
    private bindings: Map<string, SchemeValue> = new Map();
    private parent: Environment | null;

    constructor(parent: Environment | null = null) {
        this.parent = parent;
    }

    /**
     * Define a new variable in the CURRENT scope.
     */
    define(name: string, value: SchemeValue): void {
        this.bindings.set(name.toLowerCase(), value);
    }

    /**
     * Update an existing variable (set!).
     * Traverses up the scope chain.
     */
    assign(name: string, value: SchemeValue): void {
        const key = name.toLowerCase();
        if (this.bindings.has(key)) {
            this.bindings.set(key, value);
        } else if (this.parent) {
            this.parent.assign(name, value);
        } else {
            throw new Error(`Unbound variable: ${name}`);
        }
    }

    /**
     * Look up a variable.
     * Traverses up the scope chain.
     */
    lookup(name: string): SchemeValue {
        const key = name.toLowerCase();
        if (this.bindings.has(key)) {
            return this.bindings.get(key)!;
        } else if (this.parent) {
            return this.parent.lookup(name);
        } else {
            throw new Error(`Unbound variable: ${name}`);
        }
    }

    /**
     * Creates a new child environment for a procedure call.
     */
    extend(params: string[], args: SchemeValue[]): Environment {
        if (params.length !== args.length) {
            throw new Error(`Wrong number of arguments: expected ${params.length}, got ${args.length}`);
        }
        const child = new Environment(this);
        for (let i = 0; i < params.length; i++) {
            child.define(params[i], args[i]);
        }
        return child;
    }
}
