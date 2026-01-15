/**
 * LispInterpreter - Domain Layer
 * 
 * A minimalistic Lisp interpreter.
 * Supports S-expressions, basic arithmetic, and string manipulation.
 * Used by players to solve terminal tasks.
 */

import { Interpreter } from './Interpreter';

type LispValue = number | string | LispValue[];

export class LispInterpreter implements Interpreter {
    private globalEnv: Record<string, Function>;

    constructor() {
        this.globalEnv = {
            '+': (args: number[]) => args.reduce((a, b) => a + b, 0),
            '-': (args: number[]) => args.length === 1 ? -args[0] : args.reduce((a, b) => a - b),
            '*': (args: number[]) => args.reduce((a, b) => a * b, 1),
            '/': (args: number[]) => args.reduce((a, b) => a / b),
            'print': (args: any[]) => args.join(' '),
            'concat': (args: string[]) => args.join(''),
            'first': (args: any[][]) => args[0][0],
            'rest': (args: any[][]) => args[0].slice(1),
        };
    }

    evaluate(code: string): string {
        try {
            const tokens = this.tokenize(code);
            const invalidParentheses = this.checkParentheses(tokens);
            if (invalidParentheses) return invalidParentheses;

            const ast = this.parse(tokens);
            const result = this.evalAst(ast, this.globalEnv);
            return result !== undefined && result !== null ? result.toString() : '';
        } catch (error: any) {
            return `LISP ERROR: ${error.message}`;
        }
    }

    private tokenize(code: string): string[] {
        return code
            .replace(/\(/g, ' ( ')
            .replace(/\)/g, ' ) ')
            .trim()
            .split(/\s+/)
            .filter(t => t.length > 0);
    }

    private checkParentheses(tokens: string[]): string | null {
        let balance = 0;
        for (const t of tokens) {
            if (t === '(') balance++;
            if (t === ')') balance--;
            if (balance < 0) return 'LISP ERROR: Unexpected closing parenthesis';
        }
        if (balance > 0) return 'LISP ERROR: Unclosed parenthesis';
        return null;
    }

    private parse(tokens: string[]): LispValue {
        if (tokens.length === 0) throw new Error('Unexpected EOF');

        const token = tokens.shift()!;
        if (token === '(') {
            const list: LispValue[] = [];
            while (tokens.length > 0 && tokens[0] !== ')') {
                list.push(this.parse(tokens));
            }
            tokens.shift(); // consume ')'
            return list;
        } else if (token === ')') {
            throw new Error('Unexpected )');
        } else {
            return this.atom(token);
        }
    }

    private atom(token: string): LispValue {
        const num = parseFloat(token);
        if (!isNaN(num)) return num;
        if (token.startsWith('"') && token.endsWith('"')) return token.slice(1, -1);
        return token;
    }

    private evalAst(ast: LispValue, env: Record<string, any>): any {
        if (typeof ast === 'string') {
            if (ast.startsWith('"')) return ast; // String literal
            if (env[ast]) return env[ast]; // Variable/Function lookup
            return ast; // Symbol/String
        } else if (typeof ast === 'number') {
            return ast;
        } else if (Array.isArray(ast)) {
            if (ast.length === 0) return null;

            const [symbol, ...args] = ast;
            // Handle special forms like 'define' here if needed

            const fn = this.evalAst(symbol, env);
            if (typeof fn === 'function') {
                const evaluatedArgs = args.map(arg => this.evalAst(arg, env));
                return fn(evaluatedArgs);
            } else {
                throw new Error(`Function '${symbol}' not found`);
            }
        }
    }
}
