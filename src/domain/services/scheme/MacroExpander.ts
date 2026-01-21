/**
 * MacroExpander - Domain Service
 * 
 * Handles Scheme macro expansion (syntax-rules).
 * Acts as a pre-processor before compilation.
 * 
 * Pillar: THE SHADOW’S VEIL (Clean Architecture)
 */

import { SchemeValue, schemeToString, listToArray, makePair, NIL } from '../../entities/SchemeValue';

type SyntaxRule = {
    pattern: SchemeValue;
    template: SchemeValue;
};

type MacroTransformer = {
    keywords: string[];
    rules: SyntaxRule[];
};

export class MacroExpander {
    private macros: Map<string, MacroTransformer> = new Map();

    /**
     * Expands all macros in an expression.
     * Also processes define-syntax to register new macros.
     */
    expand(expr: SchemeValue): SchemeValue {
        if (!expr) return expr;

        // 1. Handle define-syntax
        if (expr.type === 'pair') {
            const head = (expr.value as any).car;
            if (head.type === 'symbol' && head.value === 'define-syntax') {
                this.registerMacro(expr);
                return { type: 'symbol', value: '#<void>' }; // Replace definition with void
            }
        }

        // 2. Recursive Expansion
        if (expr.type === 'pair') {
            // Check if head is a macro
            const head = (expr.value as any).car;
            if (head.type === 'symbol' && this.macros.has(head.value)) {
                return this.expandMacroUse(head.value, expr);
            }

            // Otherwise expand children
            const arr = listToArray(expr);
            const expandedArr = arr.map(e => this.expand(e));
            return expandedArr.reduceRight((acc, v) => makePair(v, acc), NIL);
        }

        return expr;
    }

    private registerMacro(expr: SchemeValue) {
        const arr = listToArray(expr);
        // (define-syntax name (syntax-rules (literals...) ((pat) (templ)) ...))
        const name = (arr[1] as any).value;
        const transformerSpec = arr[2];
        const specArr = listToArray(transformerSpec);

        if ((specArr[0] as any).value !== 'syntax-rules') {
            throw new Error('Only syntax-rules macros are supported');
        }

        const keywords = listToArray(specArr[1]).map(k => (k as any).value);
        const rules = specArr.slice(2).map(rule => {
            const r = listToArray(rule);
            return {
                pattern: r[0],
                template: r[1]
            };
        });

        this.macros.set(name, { keywords, rules });
    }

    private expandMacroUse(name: string, expr: SchemeValue): SchemeValue {
        const transformer = this.macros.get(name)!;
        const use = listToArray(expr); // (macro arg1 arg2)

        for (const rule of transformer.rules) {
            const bindings = this.match(rule.pattern, use, transformer.keywords);
            if (bindings) {
                // Found a match! Expand template
                const expansion = this.substitute(rule.template, bindings);
                // Recursively expand result (macros generating macros)
                return this.expand(expansion);
            }
        }

        throw new Error(`No matching syntax-rules for macro '${name}'`);
    }

    private match(pattern: SchemeValue, input: SchemeValue[], keywords: string[]): Map<string, SchemeValue> | null {
        const bindings = new Map<string, SchemeValue>();
        // Pattern: (macro arg1 ...)
        // We match input array against pattern structure
        // Note: pattern is S-Expression, input is array of S-Expressions for convenience?
        // Let's normalize pattern to array too.

        return this.matchRecursive(pattern, { type: 'pair', value: null } /* dummy */, input, bindings, keywords) ? bindings : null;
    }

    // Simplified matcher
    private matchRecursive(pat: SchemeValue, input: any, inputArr: SchemeValue[], bindings: Map<string, SchemeValue>, keywords: string[]): boolean {
        // Need thorough matching logic handled more cleanly
        // InputArr corresponds to the list form of the macro use
        const patArr = listToArray(pat);

        // Basic length check
        // Note: patterns can include ... (ellipsis)
        // For now, assume fixed length matching for simplicity of Phase 1
        if (patArr.length !== inputArr.length) return false;

        for (let i = 0; i < patArr.length; i++) {
            const p = patArr[i];
            const val = inputArr[i];

            if (p.type === 'symbol') {
                const name = p.value;
                if (keywords.includes(name) || i === 0) { // i=0 is the macro name itself, usually ignored or matched literally
                    if (i === 0) continue; // Skip macro name
                    // Literal match check would go here
                    if (val.type !== 'symbol' || val.value !== name) return false;
                } else {
                    // Pattern variable
                    bindings.set(name, val);
                }
            } else if (p.type === 'pair') {
                if (val.type !== 'pair') return false;
                // Recurse for nested lists
                // This assumes simple nested match without ... for now
                // Bindings will be mutated in place
                // This requires a non-array based matcher for recursion
                // Skipped for MVP of Step 1
            } else {
                // Literals (numbers, etc)
                if (JSON.stringify(p) !== JSON.stringify(val)) return false;
            }
        }
        return true;
    }

    private substitute(template: SchemeValue, bindings: Map<string, SchemeValue>): SchemeValue {
        if (template.type === 'symbol') {
            if (bindings.has(template.value)) {
                return bindings.get(template.value)!;
            }
            return template;
        }
        if (template.type === 'pair') {
            const arr = listToArray(template);
            const subArr = arr.map(x => this.substitute(x, bindings));
            return subArr.reduceRight((acc, v) => makePair(v, acc), NIL);
        }
        return template;
    }
}
