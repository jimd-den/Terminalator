/**
 * SccsKeywords - identification keyword expansion done by get (and prs
 * :GB:, val -m/-y defaults):
 *
 *   %M% module   %I% SID      %R% %L% %B% %S% SID components
 *   %D% today yy/mm/dd   %H% today mm/dd/yy   %T% now hh:mm:ss
 *   %E% newest applied delta's date yy/mm/dd   %G% mm/dd/yy   %U% its time
 *   %Y% t flag   %F% s-file name   %P% s-file full path   %Q% q flag
 *   %C% line number   %Z% "@(#)"   %W% = %Z%%M%<tab>%I%   %A% = %Z%%Y% %M% %I%%Z%
 */
import { SFile, Delta } from './SFile';
import { Stamp } from './SccsSupport';

export interface KeywordContext {
    file: SFile;
    delta: Delta;
    gname: string;
    sname: string;
    spath: string;
    now: Stamp;
}

const american = (date: string) => {
    const [y, m, d] = date.split('/');
    return `${m}/${d}/${y.slice(-2)}`;
};

export function keywordValue(letter: string, line: number, k: KeywordContext): string | undefined {
    const sid = k.delta.sid;
    const module = k.file.moduleName(k.gname);
    switch (letter) {
        case 'M': return module;
        case 'I': return sid.toString();
        case 'R': return String(sid.rel);
        case 'L': return String(sid.lev);
        case 'B': return String(sid.br);
        case 'S': return String(sid.seq);
        case 'D': return k.now.date;
        case 'H': return american(k.now.date);
        case 'T': return k.now.time;
        case 'E': return k.delta.date;
        case 'G': return american(k.delta.date);
        case 'U': return k.delta.time;
        case 'Y': return k.file.flags.get('t') ?? '';
        case 'F': return k.sname;
        case 'P': return k.spath;
        case 'Q': return k.file.flags.get('q') ?? '';
        case 'C': return String(line);
        case 'Z': return '@(#)';
        case 'W': return `@(#)${module}\t${sid}`;
        case 'A': return `@(#)${k.file.flags.get('t') ?? ''} ${module} ${sid}@(#)`;
        default: return undefined;
    }
}

/** Expands the keywords of one line (1-based number `line`); reports whether any were present. */
export function expandKeywords(text: string, line: number, k: KeywordContext): { text: string; found: boolean } {
    let found = false;
    const out = text.replace(/%([A-Z])%/g, (all, letter: string) => {
        const v = keywordValue(letter, line, k);
        if (v === undefined) return all;
        found = true;
        return v;
    });
    return { text: out, found };
}

/** Whether text holds any identification keyword. */
export function hasKeywords(text: string): boolean {
    return /%[MIRLBSDHTEGUYFPQCZWA]%/.test(text);
}

/** Expands every line of a retrieved version; reports whether any keyword was found. */
export function expandAll(lines: string[], k: KeywordContext): { lines: string[]; found: boolean } {
    let found = false;
    const out = lines.map((line, i) => {
        const r = expandKeywords(line, i + 1, k);
        found ||= r.found;
        return r.text;
    });
    return { lines: out, found };
}
