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

interface Token {
    text: string;
    line: number;
    column: number;
}

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
     * Lexical Analysis: Splits source into meaningful tokens with location metadata.
     */
    private tokenize(source: string): Token[] {
        const tokens: Token[] = [];
        let line = 1;
        let column = 1;
        let i = 0;

        while (i < source.length) {
            const char = source[i];

            // Handle comments
            if (char === ';') {
                while (i < source.length && source[i] !== '\n') {
                    i++;
                }
                continue;
            }

            // Handle Newlines
            if (char === '\n') {
                line++;
                column = 1;
                i++;
                continue;
            }

            // Handle Whitespace
            if (/\s/.test(char)) {
                column++;
                i++;
                continue;
            }

            // Handle Parens and Quotes (Delimiters)
            if (['(', ')', "'", '`', ','].includes(char)) {
                let text = char;
                if (char === ',' && source[i + 1] === '@') {
                    text = ',@';
                    i++;
                }
                tokens.push({ text, line, column });
                column += text.length;
                i++;
                continue;
            }

            // Handle Strings
            if (char === '"') {
                let text = '"';
                const startCol = column;
                i++;
                column++;
                while (i < source.length && source[i] !== '"') {
                    text += source[i];
                    if (source[i] === '\n') {
                        line++;
                        column = 1;
                    } else {
                        column++;
                    }
                    i++;
                }
                if (i < source.length) {
                    text += '"';
                    i++;
                    column++;
                }
                tokens.push({ text, line, column: startCol });
                continue;
            }

            // Handle Atoms (Symbols, Numbers)
            let text = '';
            const startCol = column;
            while (i < source.length && !/\s|[()'`,;"]/.test(source[i])) {
                text += source[i];
                i++;
                column++;
            }
            if (text) {
                tokens.push({ text, line, column: startCol });
            }
        }

        return tokens;
    }

    /**
     * Syntactic Analysis: Converts tokens into SchemeValue trees.
     */
    private readFromTokens(tokens: Token[], index: number): [SchemeValue, number] {
        if (index >= tokens.length) {
            throw new Error('Unexpected end of input');
        }

        const token = tokens[index];

        if (token.text === '(') {
            return this.readList(tokens, index + 1);
        } else if (token.text === ')') {
            throw new Error(`Unexpected ) at line ${token.line}, column ${token.column}`);
        } else if (token.text === "'") {
            const [expr, next] = this.readFromTokens(tokens, index + 1);
            return [arrayToList([makeSymbol('quote'), expr]), next];
        } else if (token.text === '`') {
            const [expr, next] = this.readFromTokens(tokens, index + 1);
            return [arrayToList([makeSymbol('quasiquote'), expr]), next];
        } else if (token.text === ',') {
            const [expr, next] = this.readFromTokens(tokens, index + 1);
            return [arrayToList([makeSymbol('unquote'), expr]), next];
        } else if (token.text === ',@') {
            const [expr, next] = this.readFromTokens(tokens, index + 1);
            return [arrayToList([makeSymbol('unquote-splicing'), expr]), next];
        }

        return [this.atom(token.text), index + 1];
    }

    private readList(tokens: Token[], index: number): [SchemeValue, number] {
        const items: SchemeValue[] = [];
        let current = index;

        while (current < tokens.length && tokens[current].text !== ')') {
            // Handle dotted pairs: (a . b)
            if (tokens[current].text === '.') {
                if (items.length === 0) throw new Error('Unexpected . at start of list');
                const [cdr, next] = this.readFromTokens(tokens, current + 1);
                current = next;
                if (current >= tokens.length || tokens[current].text !== ')') {
                    throw new Error('Expected ) after dotted pair');
                }

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
            throw new Error('Expected ) to close list');
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
