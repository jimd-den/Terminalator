/**
 * SchemeDesugarer - Domain Use Case Layer
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Derived Forms
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * R7RS defines a small set of PRIMITIVE expression types -- quote, if, lambda,
 * define, set!, begin -- and then derives everything else from them. `let` is
 * not a builtin; it is an immediately-applied lambda. `cond` is nested `if`s.
 * `do` is a tail-recursive loop.
 *
 * This module performs those derivations as real source-to-source rewrites,
 * which matters for a game that teaches Scheme: a player who asks "what IS
 * let?" can be shown the answer, because the implementation is the answer
 * rather than a special case buried in a compiler switch.
 *
 * The compiler downstream therefore stays small and only ever sees core forms.
 *
 * Hygiene: rewrites that must bind a temporary (`or`, `cond =>`, `case`) use
 * gensym'd names carrying a character no reader can produce, so a rewrite can
 * never capture a user variable of the same name.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
    SchemeValue, makeSymbol, makeBoolean, makeNumber, NIL,
    arrayToList, listToArray, makePair
} from '../entities/SchemeValue';

const S = makeSymbol;
const L = (...parts: SchemeValue[]) => arrayToList(parts);

/** Unspecified value, used where a form has no defined result. */
const UNSPECIFIED: SchemeValue = { type: 'symbol', value: '#<void>' };

let gensymCounter = 0;
/**
 * A name the reader cannot produce, so desugaring never shadows user code.
 */
const gensym = (hint: string): SchemeValue =>
    ({ type: 'symbol', value: ` ${hint}.${gensymCounter++}` });

const isSym = (v: SchemeValue | undefined, name: string): boolean =>
    !!v && v.type === 'symbol' && v.value === name;

/** True for `()` or an improper tail we should stop at. */
const isNull = (v: SchemeValue | undefined) => !!v && v.type === 'null';

export class SchemeDesugarer {
    /**
     * Rewrites derived forms into core forms, recursively.
     */
    public desugar(expr: SchemeValue): SchemeValue {
        if (expr.type !== 'pair') return expr;

        const head = expr.value.car as SchemeValue;

        if (head.type === 'symbol') {
            switch (head.value) {
                case 'quote':        return expr;                     // never touch quoted data
                case 'quasiquote':   return this.desugar(this.quasi(this.nth(expr, 1), 1));
                case 'let':          return this.desugar(this.let_(expr));
                case 'let*':         return this.desugar(this.letStar(expr));
                case 'letrec':
                case 'letrec*':      return this.desugar(this.letrec(expr));
                case 'cond':         return this.desugar(this.cond(this.args(expr)));
                case 'case':         return this.desugar(this.case_(expr));
                case 'and':          return this.desugar(this.and(this.args(expr)));
                case 'or':           return this.desugar(this.or(this.args(expr)));
                case 'when':         return this.desugar(this.when(expr, false));
                case 'unless':       return this.desugar(this.when(expr, true));
                case 'do':           return this.desugar(this.do_(expr));
                case 'delay':        return this.desugar(this.delay(expr));
                case 'delay-force':  return this.desugar(this.delay(expr));
                case 'define-values':return this.desugar(this.defineValues(expr));
                case 'let-values':
                case 'let*-values':  return this.desugar(this.letValues(expr));
                case 'guard':        return this.desugar(this.guard(expr));
                case 'parameterize': return this.desugar(this.begin(this.args(expr).slice(1)));
            }
        }

        // Not a derived form: rewrite the parts.
        return this.mapList(expr, v => this.desugar(v));
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    /** Elements after the head. */
    private args(expr: SchemeValue): SchemeValue[] {
        return listToArray(expr).slice(1);
    }

    private nth(expr: SchemeValue, n: number): SchemeValue {
        return listToArray(expr)[n] ?? UNSPECIFIED;
    }

    /** Rewrites every element of a (possibly improper) list. */
    private mapList(list: SchemeValue, f: (v: SchemeValue) => SchemeValue): SchemeValue {
        if (list.type !== 'pair') return list;
        return makePair(f(list.value.car as SchemeValue), this.mapList(list.value.cdr as SchemeValue, f));
    }

    private begin(body: SchemeValue[]): SchemeValue {
        if (body.length === 0) return UNSPECIFIED;
        if (body.length === 1) return body[0];
        return L(S('begin'), ...body);
    }

    /** Splits `((v e) ...)` into names and initialisers. */
    private bindings(spec: SchemeValue): { names: SchemeValue[]; inits: SchemeValue[] } {
        const names: SchemeValue[] = [];
        const inits: SchemeValue[] = [];
        for (const b of listToArray(spec)) {
            if (b.type === 'pair') {
                const parts = listToArray(b);
                names.push(parts[0]);
                inits.push(parts[1] ?? UNSPECIFIED);
            } else {
                names.push(b);
                inits.push(UNSPECIFIED);
            }
        }
        return { names, inits };
    }

    // ── binding forms ────────────────────────────────────────────────────────

    /**
     * (let ((v e) ...) body ...)        => ((lambda (v ...) body ...) e ...)
     * (let name ((v e) ...) body ...)   => named loop via letrec
     */
    private let_(expr: SchemeValue): SchemeValue {
        const parts = listToArray(expr);

        // Named let: the second element is a symbol.
        if (parts[1]?.type === 'symbol') {
            const name = parts[1];
            const { names, inits } = this.bindings(parts[2]);
            const body = parts.slice(3);
            const loop = L(S('lambda'), arrayToList(names), ...body);
            return L(L(S('letrec'), L(L(name, loop)), name), ...inits);
        }

        const { names, inits } = this.bindings(parts[1]);
        const body = parts.slice(2);
        return L(L(S('lambda'), arrayToList(names), ...body), ...inits);
    }

    /** Nested single-binding lets, innermost holding the body. */
    private letStar(expr: SchemeValue): SchemeValue {
        const parts = listToArray(expr);
        const specs = listToArray(parts[1]);
        const body = parts.slice(2);

        if (specs.length === 0) return L(S('let'), NIL, ...body);

        const build = (i: number): SchemeValue =>
            i === specs.length
                ? this.begin(body)
                : L(S('let'), L(specs[i]), build(i + 1));

        return build(0);
    }

    /**
     * (letrec ((v e) ...) body ...)
     *   => (let ((v #f) ...) (set! v e) ... body ...)
     *
     * Binding first and assigning after is what lets the initialisers see one
     * another, which is the entire point of letrec -- mutual recursion.
     */
    private letrec(expr: SchemeValue): SchemeValue {
        const parts = listToArray(expr);
        const { names, inits } = this.bindings(parts[1]);
        const body = parts.slice(2);

        const holes = names.map(n => L(n, makeBoolean(false)));
        const sets = names.map((n, i) => L(S('set!'), n, inits[i]));

        return L(S('let'), arrayToList(holes), ...sets, ...body);
    }

    // ── conditionals ─────────────────────────────────────────────────────────

    private cond(clauses: SchemeValue[]): SchemeValue {
        if (clauses.length === 0) return UNSPECIFIED;

        const clause = clauses[0];
        const rest = clauses.slice(1);
        const parts = listToArray(clause);
        const test = parts[0];

        if (isSym(test, 'else')) return this.begin(parts.slice(1));

        // (test => receiver): bind the test value and hand it to the receiver.
        if (isSym(parts[1], '=>')) {
            const t = gensym('cond');
            return L(S('let'), L(L(t, test)),
                L(S('if'), t, L(parts[2], t), this.cond(rest)));
        }

        // (test) with no body yields the test value itself.
        if (parts.length === 1) {
            const t = gensym('cond');
            return L(S('let'), L(L(t, test)), L(S('if'), t, t, this.cond(rest)));
        }

        return L(S('if'), test, this.begin(parts.slice(1)), this.cond(rest));
    }

    /** (case key clause ...) => (let ((k key)) (cond ((memv k '(d ...)) ...) ...)) */
    private case_(expr: SchemeValue): SchemeValue {
        const parts = listToArray(expr);
        const k = gensym('case');
        const clauses = parts.slice(2).map(clause => {
            const c = listToArray(clause);
            if (isSym(c[0], 'else')) return clause;
            const test = L(S('memv'), k, L(S('quote'), c[0]));
            // (data => receiver) is legal in R7RS case too.
            return arrayToList([test, ...c.slice(1)]);
        });
        return L(S('let'), L(L(k, parts[1])), arrayToList([S('cond'), ...clauses]));
    }

    private and(exprs: SchemeValue[]): SchemeValue {
        if (exprs.length === 0) return makeBoolean(true);
        if (exprs.length === 1) return exprs[0];
        return L(S('if'), exprs[0], this.and(exprs.slice(1)), makeBoolean(false));
    }

    /**
     * `or` must return the value of the first true expression, not #t, and must
     * evaluate it only once -- hence the temporary binding.
     */
    private or(exprs: SchemeValue[]): SchemeValue {
        if (exprs.length === 0) return makeBoolean(false);
        if (exprs.length === 1) return exprs[0];
        const t = gensym('or');
        return L(S('let'), L(L(t, exprs[0])),
            L(S('if'), t, t, this.or(exprs.slice(1))));
    }

    private when(expr: SchemeValue, negate: boolean): SchemeValue {
        const parts = listToArray(expr);
        const test = negate ? L(S('not'), parts[1]) : parts[1];
        return L(S('if'), test, this.begin(parts.slice(2)), UNSPECIFIED);
    }

    // ── iteration ────────────────────────────────────────────────────────────

    /**
     * (do ((var init step) ...) (test expr ...) command ...)
     *   => named loop; the recursive call sits in tail position so the loop
     *      runs in constant space.
     */
    private do_(expr: SchemeValue): SchemeValue {
        const parts = listToArray(expr);
        const specs = listToArray(parts[1]).map(s => listToArray(s));
        const vars = specs.map(s => s[0]);
        const inits = specs.map(s => s[1] ?? UNSPECIFIED);
        // A variable with no step expression keeps its current value.
        const steps = specs.map((s, i) => s[2] ?? vars[i]);

        const exit = listToArray(parts[2]);
        const test = exit[0];
        const result = this.begin(exit.slice(1));
        const commands = parts.slice(3);

        const loop = gensym('do');
        const body = L(S('if'), test, result,
            this.begin([...commands, arrayToList([loop, ...steps])]));

        return L(S('let'), loop, arrayToList(vars.map((v, i) => L(v, inits[i]))), body);
    }

    // ── promises and multiple values ─────────────────────────────────────────

    private delay(expr: SchemeValue): SchemeValue {
        return L(S('make-promise-thunk'), L(S('lambda'), NIL, this.nth(expr, 1)));
    }

    private defineValues(expr: SchemeValue): SchemeValue {
        const parts = listToArray(expr);
        const names = listToArray(parts[1]);
        const tmp = gensym('dv');
        const defs = names.map((n, i) =>
            L(S('define'), n, L(S('list-ref'), tmp, makeNumber(i))));
        return this.begin([
            L(S('define'), tmp, L(S('call-with-values'), L(S('lambda'), NIL, parts[2]), S('list'))),
            ...defs
        ]);
    }

    private letValues(expr: SchemeValue): SchemeValue {
        const parts = listToArray(expr);
        const specs = listToArray(parts[1]).map(s => listToArray(s));
        const body = parts.slice(2);

        const build = (i: number): SchemeValue => {
            if (i === specs.length) return this.begin(body);
            const [formals, init] = specs[i];
            return L(S('call-with-values'),
                L(S('lambda'), NIL, init),
                L(S('lambda'), formals, build(i + 1)));
        };
        return build(0);
    }

    /**
     * (guard (var clause ...) body ...)
     *   => (%guard (lambda () body ...)
     *              (lambda (var) (cond clause ... (else (raise-continuable var)))))
     *
     * %guard is handled by the VM, which is the only place that can install a
     * handler across the interpreter loop. A condition matching no clause is
     * re-raised, as R7RS requires -- swallowing it would hide real errors.
     */
    private guard(expr: SchemeValue): SchemeValue {
        const parts = listToArray(expr);
        const spec = listToArray(parts[1]);
        const varName = spec[0];
        const clauses = spec.slice(1);
        const body = parts.slice(2);

        const hasElse = clauses.some(c => isSym(listToArray(c)[0], 'else'));
        const allClauses = hasElse
            ? clauses
            : [...clauses, L(S('else'), L(S('raise-continuable'), varName))];

        return L(S('%guard'),
            L(S('lambda'), NIL, ...body),
            L(S('lambda'), L(varName), arrayToList([S('cond'), ...allClauses])));
    }

    // ── quasiquote ───────────────────────────────────────────────────────────

    /**
     * Expands `template` into explicit cons/append calls.
     *
     * `depth` tracks nesting so an inner quasiquote does not consume the
     * unquotes belonging to an outer one.
     */
    private quasi(tpl: SchemeValue, depth: number): SchemeValue {
        if (tpl.type !== 'pair') {
            // Vectors and atoms are self-quoting at this level.
            return tpl.type === 'symbol' || tpl.type === 'null'
                ? L(S('quote'), tpl)
                : tpl;
        }

        const head = tpl.value.car as SchemeValue;

        if (isSym(head, 'unquote')) {
            const inner = this.nth(tpl, 1);
            if (depth === 1) return inner;
            return L(S('list'), L(S('quote'), S('unquote')), this.quasi(inner, depth - 1));
        }

        if (isSym(head, 'quasiquote')) {
            const inner = this.nth(tpl, 1);
            return L(S('list'), L(S('quote'), S('quasiquote')), this.quasi(inner, depth + 1));
        }

        // (unquote-splicing x) in car position splices into the result.
        if (head.type === 'pair' && isSym(head.value.car as SchemeValue, 'unquote-splicing')) {
            const spliced = listToArray(head)[1];
            const rest = this.quasi(tpl.value.cdr as SchemeValue, depth);
            if (depth === 1) return L(S('append'), spliced, rest);
            return L(S('cons'), this.quasi(head, depth - 1), rest);
        }

        return L(S('cons'), this.quasi(head, depth), this.quasi(tpl.value.cdr as SchemeValue, depth));
    }
}
