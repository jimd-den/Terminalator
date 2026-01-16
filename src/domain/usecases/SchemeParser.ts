/**
 * SchemeParser - Use Case Layer
 * 
 * A robust Lexer and Parser for Scheme S-expressions.
 * Supports numbers, symbols, booleans, strings, and quoted expressions.
 * Designed to be extensible for full R7RS compliance.
 * 
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * Pillar: THE BALANCED SCALE (KISS)
 * Pillar: THE SHADOW’S VEIL (Clean Architecture)
 * 
 * Intent:
 * Converts raw source code into a tree of SchemeValue entities.
 * Handles the complexities of Lisp syntax (nested parens, comments, quotes).
 */

import {
    SchemeValue,
    makeNumber,
    makeSymbol,
    makeBoolean,
    makeString,
    makePair,
    NIL,
    arrayToList
} from '../entities/SchemeValue';

export class SchemeParser {
    /**
     * Parses a string into a list of Scheme expressions.
     */
    parse(source: string): SchemeValue[] {
        const tokens = this.tokenize(source);
        const expressions: SchemeValue[] = [];
        let current = 0;

        while (current < tokens.length) {
            const [expr, next] = this.readFromTokens(tokens, current);
            expressions.push(expr);
            current = next;
        }

        return expressions;
    }

    /**
     * Lexical Analysis: Splits source into meaningful tokens.
     */
    private tokenize(source: string): string[] {
        // Remove comments
        const noComments = source.replace(/;.*$/gm, '');

        // Add padding around parens and quotes for easy splitting
        const padded = noComments
            .replace(/\(/g, ' ( ')
            .replace(/\)/g, ' ) ')
            .replace(/'/g, " ' ")
            .replace(/`/g, ' ` ')
            .replace(/,/g, ' , ')
            .replace(/,@/g, ' ,@ ');

        // Split by whitespace but respect strings
        const tokens: string[] = [];
        let currentToken = '';
        let inString = false;

        for (let i = 0; i < padded.length; i++) {
            const char = padded[i];

            if (char === '"') {
                inString = !inString;
                currentToken += char;
                if (!inString) {
                    tokens.push(currentToken);
                    currentToken = '';
                }
            } else if (inString) {
                currentToken += char;
            } else if (/\s/.test(char)) {
                if (currentToken) {
                    tokens.push(currentToken);
                    currentToken = '';
                }
            } else {
                currentToken += char;
            }
        }

        if (currentToken) tokens.push(currentToken);
        return tokens;
    }

    /**
     * Syntactic Analysis: Converts tokens into SchemeValue trees.
     */
    private readFromTokens(tokens: string[], index: number): [SchemeValue, number] {
        if (index >= tokens.length) {
            throw new Error('Unexpected end of input');
        }

        const token = tokens[index];

        if (token === '(') {
            return this.readList(tokens, index + 1);
        } else if (token === ')') {
            throw new Error('Unexpected )');
        } else if (token === "'") {
            const [expr, next] = this.readFromTokens(tokens, index + 1);
            return [arrayToList([makeSymbol('quote'), expr]), next];
        } else if (token === '`') {
            const [expr, next] = this.readFromTokens(tokens, index + 1);
            return [arrayToList([makeSymbol('quasiquote'), expr]), next];
        } else if (token === ',') {
            const [expr, next] = this.readFromTokens(tokens, index + 1);
            return [arrayToList([makeSymbol('unquote'), expr]), next];
        }

        return [this.atom(token), index + 1];
    }

    private readList(tokens: string[], index: number): [SchemeValue, number] {
        const items: SchemeValue[] = [];
        let current = index;

        while (current < tokens.length && tokens[current] !== ')') {
            // Handle dotted pairs: (a . b)
            if (tokens[current] === '.') {
                if (items.length === 0) throw new Error('Unexpected . at start of list');
                const [cdr, next] = this.readFromTokens(tokens, current + 1);
                current = next;
                if (tokens[current] !== ')') throw new Error('Expected ) after dotted pair');

                // Construct nested pair manually for the tail
                let list = cdr;
                for (let i = items.length - 1; i >= 0; i--) {
                    list = makePair(items[i], list);
                }
                return [list, current + 1];
            }

            const [expr, next] = this.readFromTokens(tokens, current);
            items.push(expr);
            current = next;
        }

        if (current >= tokens.length) {
            throw new Error('Expected )');
        }

        return [arrayToList(items), current + 1];
    }

    /**
     * Atomic values: numbers, symbols, booleans, strings.
     */
    private atom(token: string): SchemeValue {
        if (token === '#t') return makeBoolean(true);
        if (token === '#f') return makeBoolean(false);

        if (token.startsWith('"') && token.endsWith('"')) {
            return makeString(token.slice(1, -1));
        }

        const num = Number(token);
        if (!isNaN(num) && token !== '') {
            return makeNumber(num);
        }

        return makeSymbol(token);
    }
}
