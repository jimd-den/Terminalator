/**
 * SchemeParser - Use Case Layer
 * 
 * A robust R7RS-compliant reader for Scheme S-expressions.
 * Supports numbers, symbols, booleans, strings, characters, vectors, 
 * bytevectors, datum labels (#n=), and various comment types.
 * 
 * Pillar: THE STORYTELLER’S CODE (Literate Documentation)
 * Pillar: THE BALANCED SCALE (KISS)
 * Pillar: THE SHADOW’S VEIL (Clean Architecture)
 * 
 * Intent:
 * Converts raw source code into a tree of SchemeValue entities.
 * Decouples the textual representation from the in-memory object model.
 */

import {
    SchemeValue,
    makeNumber,
    makeSymbol,
    makeBoolean,
    makeString,
    makeChar,
    makePair,
    makeVector,
    makeBytevector,
    NIL,
    EOF
} from '../entities/SchemeValue';

export class SchemeParser {
    private input: string = '';
    private pos: number = 0;
    private labels: Map<number, SchemeValue> = new Map();

    /**
     * Parses a string into a list of Scheme expressions.
     */
    parse(source: string): SchemeValue[] {
        this.input = source;
        this.pos = 0;
        this.labels.clear();

        const expressions: SchemeValue[] = [];
        while (true) {
            this.skipWhitespaceAndComments();
            if (this.isEOF()) break;
            expressions.push(this.readDatum());
        }

        return expressions;
    }

    /**
     * Internal: Read a single datum from the current position.
     */
    private readDatum(): SchemeValue {
        this.skipWhitespaceAndComments();
        if (this.isEOF()) throw new Error('Unexpected end of input');

        const char = this.peek();

        // 1. Lists
        if (char === '(') {
            return this.readList();
        }

        // 2. Abbreviations
        if (char === "'") {
            this.advance();
            return makePair(makeSymbol('quote'), makePair(this.readDatum(), NIL));
        }
        if (char === '`') {
            this.advance();
            return makePair(makeSymbol('quasiquote'), makePair(this.readDatum(), NIL));
        }
        if (char === ',') {
            this.advance();
            if (this.peek() === '@') {
                this.advance();
                return makePair(makeSymbol('unquote-splicing'), makePair(this.readDatum(), NIL));
            }
            return makePair(makeSymbol('unquote'), makePair(this.readDatum(), NIL));
        }

        // 3. Special Prefixes (#)
        if (char === '#') {
            return this.readHashDatum();
        }

        // 4. Strings
        if (char === '"') {
            return this.readString();
        }

        // 5. Atomics (Numbers, Symbols)
        return this.readAtomic();
    }

    private readList(): SchemeValue {
        this.advance(); // '('
        let head: SchemeValue = NIL;
        let last: any = null;

        while (true) {
            this.skipWhitespaceAndComments();
            if (this.isEOF()) throw new Error('Expected )');
            if (this.peek() === ')') {
                this.advance();
                break;
            }

            // Dotted pair handling: (a b . c)
            if (this.peek() === '.') {
                const next = this.input[this.pos + 1];
                if (this.isDelimiter(next)) {
                    this.advance(); // '.'
                    if (!last) throw new Error('Unexpected .');
                    last.value.cdr = this.readDatum();
                    this.skipWhitespaceAndComments();
                    if (this.peek() !== ')') throw new Error('Expected ) after dotted pair');
                    this.advance();
                    break;
                }
            }

            const datum = this.readDatum();
            const pair = makePair(datum, NIL);
            if (!last) {
                head = pair;
            } else {
                last.value.cdr = pair;
            }
            last = pair;
        }

        return head;
    }

    private readHashDatum(): SchemeValue {
        this.advance(); // '#'
        const char = this.peek();

        // Booleans
        if (char === 't' || char === 'f') {
            const word = this.readWord();
            if (word === 't' || word === 'true') return makeBoolean(true);
            if (word === 'f' || word === 'false') return makeBoolean(false);
            throw new Error(`Invalid boolean: #${word}`);
        }

        // Characters
        if (char === '\\') {
            this.advance();
            const word = this.readWord();
            if (word === 'space') return makeChar(' ');
            if (word === 'newline') return makeChar('\n');
            if (word === 'tab') return makeChar('\t');
            if (word.length === 1) return makeChar(word);
            return makeChar(word); // Fallback for raw character
        }

        // Vectors
        if (char === '(') {
            const list = this.readList();
            return makeVector(this.listToArr(list));
        }

        // Bytevectors
        if (char === 'u') {
            this.advance();
            if (this.peek() === '8') {
                this.advance();
                if (this.peek() !== '(') throw new Error('Expected ( after #u8');
                const list = this.readList();
                const arr = this.listToArr(list);
                return makeBytevector(new Uint8Array(arr.map(v => v.value)));
            }
        }

        // Labels #n= and #n#
        if (/[0-9]/.test(char)) {
            let nStr = '';
            while (/[0-9]/.test(this.peek())) nStr += this.advance();
            const n = parseInt(nStr, 10);
            if (this.peek() === '=') {
                this.advance();
                const placeholder: any = { type: 'placeholder', id: n };
                this.labels.set(n, placeholder);
                const actual = this.readDatum();

                // Recursively patch the placeholder with the actual value in the container
                this.patch(actual, placeholder, actual);

                this.labels.set(n, actual);
                return actual;
            } else if (this.peek() === '#') {
                this.advance();
                const label = this.labels.get(n);
                if (label === undefined) throw new Error(`Undefined label: #${n}#`);
                return label;
            }
        }

        throw new Error(`Unknown hash syntax: #${char}`);
    }

    private readString(): SchemeValue {
        this.advance(); // '"'
        let str = '';
        while (!this.isEOF() && this.peek() !== '"') {
            const char = this.advance();
            if (char === '\\') {
                const next = this.advance();
                if (next === 'n') str += '\n';
                else if (next === 't') str += '\t';
                else if (next === '"') str += '"';
                else if (next === '\\') str += '\\';
                else str += next;
            } else {
                str += char;
            }
        }
        if (this.advance() !== '"') throw new Error('Unterminated string');
        return makeString(str);
    }

    private readAtomic(): SchemeValue {
        const word = this.readWord();
        if (word === '') throw new Error('Unexpected empty atom');

        // Number check (simple)
        const num = Number(word);
        if (!isNaN(num) && word !== '+' && word !== '-') {
            return makeNumber(num);
        }

        return makeSymbol(word);
    }

    private readWord(): string {
        let word = '';
        while (!this.isEOF() && !this.isDelimiter(this.peek())) {
            const char = this.advance();
            if (char === '|') {
                // Pipe-quoted symbol |symbol name|
                while (!this.isEOF() && this.peek() !== '|') {
                    word += this.advance();
                }
                this.advance(); // '|'
            } else {
                word += char;
            }
        }
        return word;
    }

    private skipWhitespaceAndComments(): void {
        while (true) {
            while (/\s/.test(this.peek())) this.advance();

            if (this.peek() === ';') {
                while (!this.isEOF() && this.peek() !== '\n') this.advance();
                continue;
            }

            if (this.peek() === '#' && this.input[this.pos + 1] === '|') {
                this.pos += 2;
                let depth = 1;
                while (depth > 0 && !this.isEOF()) {
                    if (this.peek() === '#' && this.input[this.pos + 1] === '|') {
                        depth++; this.pos += 2;
                    } else if (this.peek() === '|' && this.input[this.pos + 1] === '#') {
                        depth--; this.pos += 2;
                    } else {
                        this.advance();
                    }
                }
                continue;
            }

            if (this.peek() === '#' && this.input[this.pos + 1] === ';') {
                this.pos += 2;
                this.readDatum(); // Skip next datum
                continue;
            }

            break;
        }
    }

    private listToArr(list: SchemeValue): SchemeValue[] {
        const arr: SchemeValue[] = [];
        let curr = list;
        while (curr.type === 'pair') {
            arr.push(curr.value.car);
            curr = curr.value.cdr;
        }
        return arr;
    }

    /**
     * Patch structures to resolve circularities from labels.
     */
    private patch(obj: SchemeValue, placeholder: any, replacement: SchemeValue, seen: Set<any> = new Set()): void {
        if (!obj || typeof obj !== 'object' || seen.has(obj)) return;
        seen.add(obj);

        if (obj.type === 'pair') {
            if (obj.value.car === placeholder) (obj.value as any).car = replacement;
            else this.patch(obj.value.car, placeholder, replacement, seen);

            if (obj.value.cdr === placeholder) (obj.value as any).cdr = replacement;
            else this.patch(obj.value.cdr, placeholder, replacement, seen);
        } else if (obj.type === 'vector') {
            const elements = obj.value as SchemeValue[];
            for (let i = 0; i < elements.length; i++) {
                if (elements[i] === placeholder) elements[i] = replacement;
                else this.patch(elements[i], placeholder, replacement, seen);
            }
        }
    }

    private peek(): string { return this.input[this.pos] || ''; }
    private advance(): string { return this.input[this.pos++] || ''; }
    private isEOF(): boolean { return this.pos >= this.input.length; }
    private isDelimiter(char: string): boolean {
        return !char || /\s/.test(char) || '()";'.includes(char);
    }
}
