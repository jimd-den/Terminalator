import assert from 'node:assert';
import { describe, it } from 'node:test';
import { SchemeParser } from '../../../src/domain/usecases/SchemeParser';
import { schemeToString } from '../../../src/domain/entities/SchemeValue';

describe('Scheme Engine - Phase 1: Reader & Datums', () => {
    const parser = new SchemeParser();

    const read = (s: string) => parser.parse(s)[0];

    describe('Atomic Datums', () => {
        it('1. should read booleans (#t, #f, #true, #false)', () => {
            assert.deepStrictEqual(read('#t'), { type: 'boolean', value: true });
            assert.deepStrictEqual(read('#f'), { type: 'boolean', value: false });
            assert.deepStrictEqual(read('#true'), { type: 'boolean', value: true });
            assert.deepStrictEqual(read('#false'), { type: 'boolean', value: false });
        });

        it('2. should read symbols', () => {
            assert.deepStrictEqual(read('foo'), { type: 'symbol', value: 'foo' });
            assert.deepStrictEqual(read('+'), { type: 'symbol', value: '+' });
            assert.deepStrictEqual(read('list->vector'), { type: 'symbol', value: 'list->vector' });
        });

        it('3. should read numbers (integer tower base)', () => {
            assert.deepStrictEqual(read('42'), { type: 'number', value: 42 });
            assert.deepStrictEqual(read('-123'), { type: 'number', value: -123 });
        });

        it('4. should read strings with escapes', () => {
            assert.deepStrictEqual(read('"hello"'), { type: 'string', value: 'hello' });
            assert.deepStrictEqual(read('"a \\"quote\\""'), { type: 'string', value: 'a "quote"' });
        });

        it('5. should read characters (#\\a, #\\space)', () => {
            assert.deepStrictEqual(read('#\\a'), { type: 'char', value: 'a' });
            assert.deepStrictEqual(read('#\\space'), { type: 'char', value: ' ' });
        });
    });

    describe('Abbreviations', () => {
        it("6. should expand quote (')", () => {
            const result = read("'foo");
            assert.strictEqual((result as any).type, 'pair');
            assert.deepStrictEqual((result as any).value.car, { type: 'symbol', value: 'quote' });
        });

        it("7. should expand quasiquote (`)", () => {
            const result = read("`foo");
            assert.deepStrictEqual((result as any).value.car, { type: 'symbol', value: 'quasiquote' });
        });

        it("8. should expand unquote (,)", () => {
            const result = read(",foo");
            assert.deepStrictEqual((result as any).value.car, { type: 'symbol', value: 'unquote' });
        });

        it("9. should expand unquote-splicing (,@)", () => {
            const result = read(",@foo");
            assert.deepStrictEqual((result as any).value.car, { type: 'symbol', value: 'unquote-splicing' });
        });
    });

    describe('Lists & Pairs', () => {
        it('11. should read empty list', () => {
            assert.deepStrictEqual(read('()'), { type: 'null', value: null });
        });

        it('12. should read simple list', () => {
            const res = read('(a b c)');
            assert.strictEqual((res as any).type, 'pair');
        });

        it('14. should read dotted pairs (a . b)', () => {
            const res: any = read('(a . b)');
            assert.strictEqual(res.value.car.value, 'a');
            assert.strictEqual(res.value.cdr.value, 'b');
        });

        it('15. should read improper lists (a b . c)', () => {
            const res: any = read('(a b . c)');
            assert.strictEqual(res.value.cdr.value.cdr.value, 'c');
        });
    });

    describe('Vectors & Bytevectors', () => {
        it('16. should read vectors #(1 2 3)', () => {
            const res: any = read('#(1 2 3)');
            assert.strictEqual(res.type, 'vector');
            assert.strictEqual(res.value.length, 3);
        });

        it('17. should read bytevectors #u8(1 2 3)', () => {
            const res: any = read('#u8(1 2 3)');
            assert.strictEqual(res.type, 'bytevector');
            assert.ok(res.value instanceof Uint8Array);
        });
    });

    describe('Comments & Whitespace', () => {
        it('18. should ignore line comments (;)', () => {
            assert.deepStrictEqual(read('foo ; comment'), { type: 'symbol', value: 'foo' });
        });

        it('19. should ignore block comments (#| |#)', () => {
            assert.deepStrictEqual(read('foo #| block |# bar'), { type: 'symbol', value: 'foo' });
        });

        it('20. should support datum comments (#;)', () => {
            assert.deepStrictEqual(read('(a #; (nested datum) b)'), read('(a b)'));
        });
    });

    describe('Datum Labels & Shared Structure', () => {
        it('22. should read labelled datums #0=(a . #0#)', () => {
            const res: any = read('#0=(a . #0#)');
            assert.strictEqual(res.value.cdr, res); // Circular!
        });

        it('23. should read shared substructure', () => {
            const res: any = read('(#0=(1 2) #0#)');
            assert.strictEqual(res.value.car, res.value.cdr.value.car);
        });
    });

    describe('Lexical Edge Cases', () => {
        it('25. should handle vertical bar identifiers |name with spaces|', () => {
            assert.deepStrictEqual(read('|foo bar|'), { type: 'symbol', value: 'foo bar' });
        });
    });

    describe('Reader States & Errors', () => {
        it('29. should fail on unbalanced parentheses', () => {
            assert.throws(() => read('(a b'));
        });
    });
});
