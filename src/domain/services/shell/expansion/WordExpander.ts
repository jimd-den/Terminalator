import { TerminalState } from '../../../entities/TerminalState';
import { IOContext } from '../io/IOContext';
import { SourceScanner } from '../SourceScanner';
import { ArithmeticEvaluator, ArithmeticError } from './ArithmeticEvaluator';
import { escapePattern, hasPatternChars, removeAffix } from './PatternMatcher';
import {
    getOption, getParameter, getPositional, isValidName, setVariable, ReadonlyVariableError
} from './ShellVariables';

/**
 * WordExpander - POSIX word expansions (XCU §2.6).
 *
 *   1. tilde expansion
 *   2. parameter expansion, command substitution, arithmetic expansion
 *   3. field splitting (only on unquoted expansion results)
 *   4. pathname expansion (unless `set -f`)
 *   5. quote removal
 *
 * Words arrive in raw source form (quotes intact). Internally a word becomes
 * a list of `Part`s that remember whether each piece was quoted and whether
 * it is subject to field splitting; that is what makes "$x" vs $x, "$@",
 * and quoted glob characters behave correctly.
 */

interface Part {
    text: string;
    quoted: boolean;
    /** Unquoted expansion result: eligible for IFS field splitting. */
    split: boolean;
    /** Field break produced by "$@" / $@. */
    brk?: boolean;
}

interface Field {
    parts: Part[];
}

interface ScanMode {
    /** Inside double quotes (or an equivalent context). */
    dq: boolean;
    /** Here-document body: like dq, but `"` is an ordinary character. */
    heredoc?: boolean;
    /** Literal text is subject to splitting (word of ${x:-word} in unquoted context). */
    splitLiterals?: boolean;
    /** Assignment value: tilde expansion also after ':' */
    assignment?: boolean;
}

/** The mutable view of state an expansion works on (`${x:=y}` and `$((x=1))` assign). */
export interface ExpansionScope {
    state: TerminalState;
    /** Exit status of the last command substitution, for assignment-only commands. */
    lastSubstitutionStatus?: number;
    /** File descriptors inherited by command substitutions (stdin, stderr). */
    io?: IOContext;
}

export interface ExpanderDeps {
    runCommandSubstitution(script: string, state: TerminalState, io?: IOContext): Promise<{ stdout: string; status: number }>;
    /** Pathname expansion; returns sorted matches or [] when nothing matches. */
    glob(pattern: string, cwd: string): string[];
    homeOf(user: string): string | undefined;
}

export class ExpansionError extends Error {
    constructor(message: string, public readonly status = 1) {
        super(message);
        this.name = 'ExpansionError';
    }
}

const BREAK: Part = { text: '', quoted: false, split: false, brk: true };
const DEFAULT_IFS = ' \t\n';

export class WordExpander {
    private arithmetic = new ArithmeticEvaluator();

    constructor(private deps: ExpanderDeps) { }

    // --- Public API ----------------------------------------------------------

    /** Full expansion of a list of words into fields (command arguments, for-lists). */
    async expandWords(words: string[], scope: ExpansionScope): Promise<string[]> {
        const out: string[] = [];
        for (const w of words) out.push(...await this.expandFields(w, scope));
        return out;
    }

    async expandFields(word: string, scope: ExpansionScope): Promise<string[]> {
        const parts = await this.scan(word, { dq: false }, scope, true);
        const fields = this.splitFields(parts, scope.state);
        const results: string[] = [];
        const noglob = getOption(scope.state, 'noglob');
        for (const field of fields) {
            const literal = field.parts.map(p => p.text).join('');
            if (!noglob) {
                const pattern = field.parts.map(p => (p.quoted ? escapePattern(p.text) : p.text)).join('');
                if (hasPatternChars(pattern)) {
                    const matches = this.deps.glob(pattern, scope.state.currentDirectory);
                    if (matches.length > 0) {
                        results.push(...matches);
                        continue;
                    }
                }
            }
            results.push(literal);
        }
        return results;
    }

    /** Expansion without field splitting or globbing (redirection targets, case word, `${x=...}`). */
    async expandString(word: string, scope: ExpansionScope, opts: { assignment?: boolean } = {}): Promise<string> {
        const parts = await this.scan(word, { dq: false, assignment: opts.assignment }, scope, true);
        return this.joinWithBreaks(parts, ' ');
    }

    /** Expansion of an assignment value `NAME=value` (no splitting/globbing, tilde after ':'). */
    async expandAssignmentValue(value: string, scope: ExpansionScope): Promise<string> {
        const parts = await this.scan(value, { dq: false, assignment: true }, scope, true);
        return this.joinWithBreaks(parts, ' ');
    }

    /** Expansion into a pattern: quoted characters are escaped so they match literally. */
    async expandPattern(word: string, scope: ExpansionScope, dq = false): Promise<string> {
        const parts = await this.scan(word, { dq }, scope, !dq);
        return parts.filter(p => !p.brk).map(p => (p.quoted ? escapePattern(p.text) : p.text)).join('');
    }

    /** Here-document body with an unquoted delimiter: $, ` and \ are active. */
    async expandHereDoc(body: string, scope: ExpansionScope): Promise<string> {
        const parts = await this.scan(body, { dq: true, heredoc: true }, scope, false);
        return this.joinWithBreaks(parts, ' ');
    }

    /** Arithmetic on an already-isolated expression (used by the `$((...))` scanner and builtins). */
    async evaluateArithmetic(expr: string, scope: ExpansionScope): Promise<number> {
        const parts = await this.scan(expr, { dq: true, heredoc: true }, scope, false);
        const text = parts.map(p => p.text).join('');
        try {
            return this.arithmetic.evaluate(text, {
                get: name => getParameter(scope.state, name),
                set: (name, value) => { scope.state = setVariable(scope.state, name, value); },
            });
        } catch (e: any) {
            if (e instanceof ArithmeticError) throw new ExpansionError(`arithmetic expression: ${e.message}: "${text.trim()}"`, 2);
            if (e instanceof ReadonlyVariableError) throw new ExpansionError(e.message, 2);
            throw e;
        }
    }

    // --- Scanning ------------------------------------------------------------

    private joinWithBreaks(parts: Part[], sep: string): string {
        let out = '';
        for (const p of parts) out += p.brk ? sep : p.text;
        return out;
    }

    private async scan(word: string, mode: ScanMode, scope: ExpansionScope, atWordStart: boolean): Promise<Part[]> {
        const parts: Part[] = [];
        let literal = '';
        const flush = () => {
            if (literal) parts.push({ text: literal, quoted: mode.dq, split: !mode.dq && !!mode.splitLiterals });
            literal = '';
        };

        let i = 0;
        if (atWordStart && !mode.dq) i = this.tilde(word, 0, parts, scope, mode);

        while (i < word.length) {
            const c = word[i];

            if (c === '\\') {
                const next = word[i + 1];
                if (next === undefined) { literal += c; i++; continue; }
                const escapable = !mode.dq || '$`\\\n'.includes(next) || (next === '"' && !mode.heredoc);
                if (!escapable) { literal += c; i++; continue; }
                flush();
                if (next !== '\n') parts.push({ text: next, quoted: true, split: false });
                i += 2;
                continue;
            }

            if (c === "'" && !mode.dq) {
                flush();
                const end = word.indexOf("'", i + 1);
                const stop = end === -1 ? word.length : end;
                parts.push({ text: word.substring(i + 1, stop), quoted: true, split: false });
                i = stop + 1;
                continue;
            }

            if (c === '"' && !mode.dq) {
                flush();
                const end = SourceScanner.endOf(word, i, 'dq');
                const inner = word.substring(i + 1, end - 1);
                const innerParts = await this.scan(inner, { dq: true }, scope, false);
                const onlyAt = /^\$(@|\{@\})$/.test(inner);
                if (innerParts.length === 0 && !onlyAt) parts.push({ text: '', quoted: true, split: false });
                parts.push(...innerParts);
                i = end;
                continue;
            }

            if (c === '`') {
                flush();
                const end = SourceScanner.endOf(word, i, 'bq');
                const raw = word.substring(i + 1, end - 1);
                const script = raw.replace(mode.dq ? /\\([$`\\"])/g : /\\([$`\\])/g, '$1');
                parts.push(this.expansionPart(await this.substitute(script, scope), mode));
                i = end;
                continue;
            }

            if (c === '$') {
                const consumed = await this.dollar(word, i, mode, scope, parts, flush);
                if (consumed > 0) { i += consumed; continue; }
                literal += c;
                i++;
                continue;
            }

            if (c === ':' && mode.assignment && !mode.dq && word[i + 1] === '~') {
                literal += c;
                flush();
                i = this.tilde(word, i + 1, parts, scope, mode);
                continue;
            }

            literal += c;
            i++;
        }
        flush();
        return parts;
    }

    private expansionPart(text: string, mode: ScanMode): Part {
        return { text, quoted: mode.dq, split: !mode.dq };
    }

    /** Tilde-prefix at `start`; returns the index after it (or `start` if none). */
    private tilde(word: string, start: number, parts: Part[], scope: ExpansionScope, mode: ScanMode): number {
        if (word[start] !== '~') return start;
        let end = start + 1;
        while (end < word.length && word[end] !== '/' && !(mode.assignment && word[end] === ':')) end++;
        const login = word.substring(start + 1, end);
        if (/['"\\$`]/.test(login)) return start;
        const home = login === '' ? scope.state.environment.HOME : this.deps.homeOf(login);
        if (home === undefined) return start;
        parts.push({ text: home, quoted: true, split: false });
        return end;
    }

    private async substitute(script: string, scope: ExpansionScope): Promise<string> {
        const { stdout, status } = await this.deps.runCommandSubstitution(script, scope.state, scope.io);
        scope.lastSubstitutionStatus = status;
        return stdout.replace(/\n+$/, '');
    }

    /** Handles `$...` at word[i]; returns characters consumed (0 = literal '$'). */
    private async dollar(word: string, i: number, mode: ScanMode, scope: ExpansionScope, parts: Part[], flush: () => void): Promise<number> {
        const next = word[i + 1];

        if (next === '(') {
            flush();
            const end = SourceScanner.endOf(word, i, 'dollar');
            const text = word.substring(i, end);
            if (text.startsWith('$((') && text.endsWith('))')) {
                const value = await this.evaluateArithmetic(text.substring(3, text.length - 2), scope);
                parts.push(this.expansionPart(String(value), mode));
            } else {
                parts.push(this.expansionPart(await this.substitute(text.substring(2, text.length - 1), scope), mode));
            }
            return end - i;
        }

        if (next === '{') {
            flush();
            const end = SourceScanner.endOf(word, i, 'dollar');
            parts.push(...await this.braceParameter(word.substring(i + 2, end - 1), mode, scope));
            return end - i;
        }

        const simple = /^([A-Za-z_][A-Za-z0-9_]*|[0-9]|[@*#?$!\-])/.exec(word.substring(i + 1));
        if (!simple) return 0;
        flush();
        parts.push(...this.parameterParts(simple[1], mode, scope));
        return 1 + simple[1].length;
    }

    /** Value of a parameter as parts ("$@" yields one part per positional parameter). */
    private parameterParts(name: string, mode: ScanMode, scope: ExpansionScope): Part[] {
        if (name === '@' || name === '*') {
            const params = getPositional(scope.state);
            if (mode.dq && name === '*') {
                const ifs = scope.state.environment.IFS;
                const sep = ifs === undefined ? ' ' : ifs.charAt(0);
                return [{ text: params.join(sep), quoted: true, split: false }];
            }
            if (mode.dq && mode.heredoc) return [{ text: params.join(' '), quoted: true, split: false }];
            const out: Part[] = [];
            params.forEach((p, idx) => {
                if (idx > 0) out.push(BREAK);
                out.push({ text: p, quoted: mode.dq, split: !mode.dq });
            });
            return out;
        }
        const value = getParameter(scope.state, name);
        if (value === undefined && getOption(scope.state, 'nounset')) {
            throw new ExpansionError(`${name}: parameter not set`, 2);
        }
        return [this.expansionPart(value ?? '', mode)];
    }

    private async braceParameter(inner: string, mode: ScanMode, scope: ExpansionScope): Promise<Part[]> {
        if (inner === '#') return this.parameterParts('#', mode, scope);

        // ${#name}: string length
        if (inner.startsWith('#') && /^#([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*#?$!\-])$/.test(inner)) {
            const name = inner.substring(1);
            const value = name === '@' || name === '*'
                ? String(getPositional(scope.state).length)
                : String((this.lookup(name, scope) ?? '').length);
            return [this.expansionPart(value, mode)];
        }

        const m = /^([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*#?$!\-])([\s\S]*)$/.exec(inner);
        if (!m) throw new ExpansionError(`\${${inner}}: bad substitution`, 2);
        const [, name, rest] = m;
        if (rest === '') return this.parameterParts(name, mode, scope);

        const opMatch = /^(:?[-=?+]|%%|%|##|#)/.exec(rest);
        if (!opMatch) throw new ExpansionError(`\${${inner}}: bad substitution`, 2);
        const op = opMatch[1];
        const arg = rest.substring(op.length);
        const value = this.lookup(name, scope);
        const isSet = name === '@' || name === '*' ? getPositional(scope.state).length > 0 : value !== undefined;
        const colon = op.startsWith(':');
        const usable = colon ? isSet && (value ?? '') !== '' : isSet;
        const nested: ScanMode = { dq: mode.dq, splitLiterals: !mode.dq };

        switch (op.replace(':', '')) {
            case '-':
                return usable ? this.parameterParts(name, mode, scope) : this.scan(arg, nested, scope, !mode.dq);
            case '+':
                return usable ? this.scan(arg, nested, scope, !mode.dq) : [];
            case '=': {
                if (usable) return this.parameterParts(name, mode, scope);
                if (!isValidName(name)) throw new ExpansionError(`${name}: cannot assign in this way`, 2);
                const assigned = await this.expandString(arg, scope);
                try {
                    scope.state = setVariable(scope.state, name, assigned);
                } catch (e: any) {
                    throw new ExpansionError(e.message, 2);
                }
                return [this.expansionPart(assigned, mode)];
            }
            case '?': {
                if (usable) return this.parameterParts(name, mode, scope);
                const message = arg ? await this.expandString(arg, scope) : (colon ? 'parameter null or not set' : 'parameter not set');
                throw new ExpansionError(`${name}: ${message}`, 2);
            }
            default: {
                if (value === undefined && getOption(scope.state, 'nounset')) {
                    throw new ExpansionError(`${name}: parameter not set`, 2);
                }
                const pattern = await this.expandPattern(arg, scope, false);
                return [this.expansionPart(removeAffix(value ?? '', pattern, op as '#' | '##' | '%' | '%%'), mode)];
            }
        }
    }

    private lookup(name: string, scope: ExpansionScope): string | undefined {
        return getParameter(scope.state, name);
    }

    // --- Field splitting -----------------------------------------------------

    private splitFields(parts: Part[], state: TerminalState): Field[] {
        const ifs = state.environment.IFS ?? DEFAULT_IFS;
        const isWs = (c: string) => (c === ' ' || c === '\t' || c === '\n') && ifs.includes(c);
        const fields: Field[] = [];
        let cur: Field | null = null;
        let lastDelimNonWs = false;
        let sawAnything = false;

        const append = (p: Part) => {
            if (!cur) cur = { parts: [] };
            cur.parts.push(p);
            lastDelimNonWs = false;
            sawAnything = true;
        };
        const end = () => {
            if (cur) fields.push(cur);
            cur = null;
        };

        for (const part of parts) {
            if (part.brk) {
                end();
                lastDelimNonWs = false;
                continue;
            }
            if (!part.split || ifs === '') {
                if (part.text !== '' || part.quoted) append({ ...part });
                continue;
            }
            let run = '';
            for (const c of part.text) {
                if (!ifs.includes(c)) { run += c; continue; }
                if (run) { append({ text: run, quoted: false, split: false }); run = ''; }
                if (isWs(c)) {
                    end();
                } else {
                    if (cur) end();
                    else if (lastDelimNonWs || !sawAnything) fields.push({ parts: [{ text: '', quoted: true, split: false }] });
                    lastDelimNonWs = true;
                    sawAnything = true;
                }
            }
            if (run) append({ text: run, quoted: false, split: false });
        }
        end();
        return fields;
    }
}
