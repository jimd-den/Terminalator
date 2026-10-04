/**
 * man, apropos, whatis - display system documentation (POSIX man).
 *
 *   man [-a] [-w] [-s section] [section] name...
 *   man -k keyword...            (apropos keyword...)
 *   man -f name...               (whatis name...)
 *
 * Pages come from the installed manual (ManualCatalog) and are formatted
 * as man-db does when writing plain text: a header line, NAME / SYNOPSIS /
 * DESCRIPTION sections indented seven columns and filled and justified to
 * MANWIDTH (default 80) minus two, and a footer line. Names match without
 * regard to case. Exit status 16 means a page or keyword was not found.
 */
import { Utility } from '../shared/Utility';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { CommandResponse } from '../../entities/Command';
import { getopt } from '../shared/InputFiles';
import { reply } from '../shared/Spool';
import { MANUAL_PAGES, ManualPage, SECTION_TITLES, manualPath } from '../../services/os/ManualCatalog';

export type ManMode = 'man' | 'apropos' | 'whatis';

const NOT_FOUND = 16;
/** man-db's default section search order. */
const SECTION_ORDER = ['1', 'n', 'l', '8', '3', '0', '2', '5', '4', '9', '6', '7'];
const SOURCE = 'Terminalator OS';

function sectionRank(section: string): number {
    const i = SECTION_ORDER.indexOf(section.charAt(0));
    return i < 0 ? SECTION_ORDER.length : i;
}

function inSection(p: ManualPage, sections: string[] | null): boolean {
    return !sections || sections.some(s => p.section === s || p.section.startsWith(s));
}

/** Lookup by page name (any of its names), case-insensitively. */
export function findPages(name: string, sections: string[] | null): ManualPage[] {
    const key = name.toLowerCase();
    return MANUAL_PAGES
        .filter(p => p.names.some(n => n.toLowerCase() === key) && inSection(p, sections))
        .sort((a, b) => sectionRank(a.section) - sectionRank(b.section));
}

/** A whatis(1)/apropos(1) line: "ls (1)               - list directory contents". */
function summaryLine(name: string, p: ManualPage): string {
    return `${`${name} (${p.section})`.padEnd(20)} - ${p.summary}`;
}

/** Fills words into lines of at most `width` columns, justifying all but the last (groff .ad b). */
function fill(text: string, indent: number, width: number, hanging = indent, justify = true): string[] {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current: string[] = [];
    let len = 0;
    let lead = indent;
    const flush = (last: boolean) => {
        if (!current.length) return;
        let line = current.join(' ');
        const room = width - lead;
        if (justify && !last && current.length > 1 && line.length < room) {
            const gaps = current.length - 1;
            const extra = room - line.length;
            const per = Math.floor(extra / gaps);
            const more = extra % gaps;
            // groff distributes the leftover spaces alternately from each end; start at the right.
            line = current.map((w, i) => i === gaps ? w : w + ' '.repeat(1 + per + (gaps - i <= more ? 1 : 0))).join('');
        }
        lines.push(' '.repeat(lead) + line);
        current = []; len = 0; lead = hanging;
    };
    for (const w of words) {
        if (current.length && lead + len + 1 + w.length > width) flush(false);
        len += (current.length ? 1 : 0) + w.length;
        current.push(w);
    }
    flush(true);
    return lines;
}

/** Renders a page as plain text, `columns` wide. */
export function renderPage(p: ManualPage, columns: number): string {
    const width = Math.max(columns - 2, 40);
    const title = `${p.names[0].toUpperCase()}(${p.section})`;
    const center = SECTION_TITLES[p.section.charAt(0)] ?? '';
    const header = (left: string, mid: string, right: string) => {
        const midStart = Math.max(left.length + 1, Math.ceil((width - mid.length) / 2));
        let line = left.padEnd(midStart) + mid;
        line = line.padEnd(Math.max(line.length + 1, width - right.length)) + right;
        return line;
    };
    const out: string[] = [header(title, center, title), ''];
    out.push('NAME', ...fill(`${p.names.join(', ')} - ${p.summary}`, 7, width), '');
    if (p.synopsis.length) {
        out.push('SYNOPSIS');
        for (const syn of p.synopsis) {
            const cmd = syn.split(' ')[0];
            out.push(...fill(syn, 7, width, 7 + cmd.length + 1, false));
        }
        out.push('');
    }
    out.push('DESCRIPTION');
    p.description.forEach((para, i) => {
        if (i) out.push('');
        out.push(...fill(para, 7, width));
    });
    out.push('', header(SOURCE, '', title));
    return out.join('\n') + '\n';
}

export class ManCommand extends Utility {
    readonly utility: string;

    constructor(private mode: ManMode = 'man') {
        super();
        this.utility = mode;
    }

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const spec = this.mode === 'man' ? 'kfwaS:s:M:P:L:m:C:ceIi' : this.mode === 'apropos' ? 'aerws:S:lL:m:M:C:' : 'rwls:S:L:m:M:C:';
        const { opts, operands, error } = getopt(args, spec);
        if (error) return reply(state, '', `${this.utility}: ${error}\nTry '${this.utility} --help' for more information.\n`, 2);
        const sectionOpt = (opts.get('s') ?? opts.get('S')) as string | undefined;
        let sections = sectionOpt ? sectionOpt.split(/[:,]/).filter(Boolean) : null;

        if (this.mode === 'apropos' || opts.has('k')) return this.apropos(state, operands, sections, opts);
        if (this.mode === 'whatis' || opts.has('f')) return this.whatis(state, operands, sections);

        let names = operands;
        if (!sections && names.length > 1 && /^([0-9n]|[0-9][a-z]+)$/.test(names[0])) {
            sections = [names[0]];
            names = names.slice(1);
        }
        if (names.length === 0) {
            const msg = sections ? `No manual entry for ${sections[0]}\n` : "What manual page do you want?\nFor example, try 'man man'.\n";
            return reply(state, '', msg, sections ? NOT_FOUND : 1);
        }

        const columns = parseInt(context.env.MANWIDTH ?? '', 10) || (context.stdoutIsTty !== false ? parseInt(context.env.COLUMNS ?? '', 10) || 80 : 80);
        let out = '', err = '';
        for (const name of names) {
            const found = findPages(name, sections);
            if (!found.length) {
                err += sections ? `No manual entry for ${name} in section ${sections.join(':')}\n` : `No manual entry for ${name}\n`;
                continue;
            }
            const chosen = opts.has('a') ? found : [found[0]];
            for (const p of chosen) out += opts.has('w') ? manualPath(p) + '\n' : renderPage(p, columns);
        }
        return reply(state, out, err, err ? NOT_FOUND : 0);
    }

    private whatis(state: TerminalState, names: string[], sections: string[] | null): CommandResponse {
        if (!names.length) return reply(state, '', `${this.mode === 'man' ? 'man' : 'whatis'}: what?\n`, 1);
        let out = '', err = '';
        for (const name of names) {
            const found = findPages(name, sections);
            if (!found.length) err += `${name}: nothing appropriate.\n`;
            for (const p of found) out += summaryLine(p.names.find(n => n.toLowerCase() === name.toLowerCase()) ?? name, p) + '\n';
        }
        return reply(state, out, err, err ? NOT_FOUND : 0);
    }

    private apropos(state: TerminalState, keywords: string[], sections: string[] | null, opts: Map<string, string | true>): CommandResponse {
        if (!keywords.length) return reply(state, '', `${this.mode === 'man' ? 'man' : 'apropos'}: what?\n`, 1);
        const matcher = (kw: string): ((s: string) => boolean) => {
            if (opts.has('e')) return s => s.toLowerCase().split(/[^a-z0-9_[-]+/i).includes(kw.toLowerCase());
            if (opts.has('w')) {
                const re = new RegExp('^' + kw.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
                return s => re.test(s);
            }
            try {
                const re = new RegExp(kw, 'i');
                return s => re.test(s);
            } catch {
                return s => s.toLowerCase().includes(kw.toLowerCase());
            }
        };
        const tests = keywords.map(k => ({ k, test: matcher(k) }));
        const hits: { name: string; page: ManualPage }[] = [];
        const matched = new Set<string>();
        for (const page of MANUAL_PAGES) {
            if (!inSection(page, sections)) continue;
            for (const name of page.names) {
                const ok = tests.filter(t => t.test(name) || (!opts.has('w') && t.test(page.summary)));
                ok.forEach(t => matched.add(t.k));
                if (opts.has('a') ? ok.length === tests.length : ok.length > 0) hits.push({ name, page });
            }
        }
        hits.sort((a, b) => a.name.localeCompare(b.name) || sectionRank(a.page.section) - sectionRank(b.page.section));
        const out = hits.map(h => summaryLine(h.name, h.page) + '\n').join('');
        const err = opts.has('a')
            ? (hits.length ? '' : `${keywords.join(' ')}: nothing appropriate.\n`)
            : keywords.filter(k => !matched.has(k)).map(k => `${k}: nothing appropriate.\n`).join('');
        return reply(state, out, err, hits.length && !err ? 0 : NOT_FOUND);
    }
}
