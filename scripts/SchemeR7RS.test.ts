/**
 * SchemeR7RS.test.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * R7RS Conformance
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * A language a player cannot write real programs in cannot teach them Scheme,
 * so this suite is phrased as "can you actually write this?" rather than as
 * unit tests of the compiler's internals.
 *
 * Baseline when written: 7 of 40. `let`, `cond`, `and`/`or`, `eq?`, the whole
 * string library, quasiquote and working continuations were all absent, and
 * tail recursion consumed memory proportional to iteration count despite the
 * compiler claiming otherwise.
 *
 * Known gaps, deliberately not asserted here: the exact numeric tower (1/3 is
 * a float, not an exact third) and variadic lambda formals.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// @ts-ignore
import { expect, test, describe } from "bun:test";
import { SchemeParser } from "../src/domain/usecases/SchemeParser";
import { SchemeEvaluator } from "../src/domain/usecases/SchemeEvaluator";
import { Environment } from "../src/domain/entities/Environment";
import { schemeToString } from "../src/domain/entities/SchemeValue";
import { registerStandardLibrary, getPrelude } from "../src/interface-adapters/scheme/StandardLibrary";
import { ProcedureRegistry } from "../src/domain/entities/ProcedureRegistry";

registerStandardLibrary();
const parser = new SchemeParser();
const prelude = getPrelude();

/** A fresh top-level environment with the base library and prelude loaded. */
const freshEnv = () => {
    const env = new Environment();
    ProcedureRegistry.getInstance().populate(env);
    const ev = new SchemeEvaluator();
    for (const e of parser.parse(prelude)) ev.evaluate(e, env);
    return env;
};

const run = (src: string): string => {
    const env = freshEnv();
    const ev = new SchemeEvaluator();
    let last: any;
    for (const form of parser.parse(src)) last = ev.evaluate(form, env);
    return schemeToString(last);
};

const CASES: [string, string, string][] = [
  ["core","(+ 1 2)","3"],
  ["core","(if #t 1 2)","1"],
  ["core","((lambda (x) (* x x)) 5)","25"],
  ["binding","(let ((x 2)(y 3)) (+ x y))","5"],
  ["binding","(let* ((x 1)(y (+ x 1))) y)","2"],
  ["binding","(letrec ((f (lambda (n) (if (= n 0) 1 (* n (f (- n 1))))))) (f 5))","120"],
  ["binding","(let loop ((i 0)(acc 0)) (if (= i 5) acc (loop (+ i 1) (+ acc i))))","10"],
  ["cond","(cond ((= 1 2) 'a) (else 'b))","b"],
  ["cond","(case 2 ((1) 'one) ((2) 'two) (else 'other))","two"],
  ["cond","(and 1 2 3)","3"],
  ["cond","(or #f 7)","7"],
  ["cond","(when #t 42)","42"],
  ["cond","(unless #f 42)","42"],
  ["loop","(do ((i 0 (+ i 1))(s 0 (+ s i))) ((= i 5) s))","10"],
  ["equiv","(eq? 'a 'a)","#t"],
  ["equiv","(eqv? 1.0 1.0)","#t"],
  ["equiv","(equal? (list 1 2) (list 1 2))","#t"],
  ["hof","(map (lambda (x) (* x x)) (list 1 2 3))","(1 4 9)"],
  ["hof","(apply + (list 1 2 3))","6"],
  ["hof","(for-each display (list 1 2))","-"],
  ["assoc","(assq 'b '((a 1)(b 2)))","(b 2)"],
  ["assoc","(member 2 '(1 2 3))","(2 3)"],
  ["string","(string-append \"a\" \"b\")",String.raw`"ab"`],
  ["string","(string-length \"abc\")","3"],
  ["string","(substring \"hello\" 1 3)",String.raw`"el"`],
  ["string","(string->symbol \"x\")","x"],
  ["string","(number->string 42)",String.raw`"42"`],
  ["string","(string->number \"42\")","42"],
  ["char","(char->integer #\\A)","65"],
  ["vector","(vector-ref (vector 1 2 3) 1)","2"],
  ["quasi","`(1 ,(+ 1 1) 3)","(1 2 3)"],
  ["macro","(begin (define-syntax swap! (syntax-rules () ((_ a b) (let ((t a)) (set! a b) (set! b t))))) (define x 1) (define y 2) (swap! x y) (list x y))","(2 1)"],
  ["tail","(letrec ((lp (lambda (n) (if (= n 0) 'done (lp (- n 1)))))) (lp 100000))","done"],
  ["callcc","(+ 1 (call-with-current-continuation (lambda (k) (k 10))))","11"],
  ["numeric","(exact->inexact 1/2)","0.5"],
  ["numeric","(sqrt 16)","4"],
  ["numeric","(expt 2 10)","1024"],
  ["values","(call-with-values (lambda () (values 1 2)) +)","3"],
  ["error","(guard (e (#t 'caught)) (raise 'boom))","caught"],
  ["internal","(define (f) (define a 1) (define b 2) (+ a b))","-"],
];
const grouped = CASES.reduce((acc, [cat, src, want]) => {
    (acc[cat] ??= []).push([src, want]);
    return acc;
}, {} as Record<string, [string, string][]>);

for (const [category, cases] of Object.entries(grouped)) {
    describe(`R7RS :: ${category}`, () => {
        for (const [src, want] of cases) {
            test(src, () => {
                const got = run(src);
                // "-" means "must not throw"; the value itself is unspecified.
                if (want !== "-") expect(got).toBe(want);
            });
        }
    });
}

describe("R7RS :: proper tail calls", () => {
    test("a tail loop runs in constant space, not merely without crashing", () => {
        // The old compiler emitted APPLY + RETURN, which grew the VM's call
        // stack once per iteration: 1e6 iterations cost ~224MB. Constant space
        // is the actual R7RS requirement, so measure memory, not survival.
        const before = process.memoryUsage().heapUsed;
        expect(run("(let loop ((i 0)) (if (= i 500000) 'done (loop (+ i 1))))")).toBe("done");
        const grownMb = (process.memoryUsage().heapUsed - before) / 1048576;
        expect(grownMb).toBeLessThan(40);
    });

    test("mutual recursion is also tail recursive", () => {
        expect(run(`(letrec ((ev? (lambda (n) (if (= n 0) #t (od? (- n 1)))))
                             (od? (lambda (n) (if (= n 0) #f (ev? (- n 1))))))
                      (ev? 300001))`)).toBe("#f");
    });
});

describe("R7RS :: continuations", () => {
    test("an escape continuation returns a value to its capture point", () => {
        expect(run("(+ 1 (call/cc (lambda (k) (k 10))))")).toBe("11");
    });

    test("a continuation can abort a computation early", () => {
        expect(run(`(call/cc (lambda (return)
                      (for-each (lambda (x) (if (> x 2) (return x) #f)) '(1 2 3 4))
                      'never))`)).toBe("3");
    });
});
