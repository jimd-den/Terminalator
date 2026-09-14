/**
 * CommandFamily.ts - Presentation Layer
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * Visual Variety With A Job To Do
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Every result card rendered in the same colour with the same glyph, so a
 * scrollback of twenty commands was a wall of identical boxes and finding the
 * scan you ran four commands ago meant reading all of them.
 *
 * Sorting commands into families and giving each its own accent and sigil
 * makes the history skimmable at a glance -- you look for the shape, not the
 * text. This is variety in the Nintendo sense: not decoration for its own
 * sake, but distinct visual identities that make different things easy to
 * tell apart at speed.
 *
 * Colours come from the active theme rather than being hardcoded, so every
 * theme keeps its own palette.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export type Family = 'network' | 'filesystem' | 'economy' | 'system' | 'text' | 'error';

interface FamilyLook {
    /** Single-glyph sigil shown in the card header. */
    sigil: string;
    /** Which theme colour carries the accent. */
    tone: 'primary' | 'secondary' | 'warning' | 'success' | 'error';
    label: string;
}

const LOOKS: Record<Family, FamilyLook> = {
    network:    { sigil: '⇄', tone: 'secondary', label: 'NET' },
    filesystem: { sigil: '▤', tone: 'primary',   label: 'FS'  },
    economy:    { sigil: '◈', tone: 'warning',   label: 'ECO' },
    text:       { sigil: '✎', tone: 'success',   label: 'TXT' },
    system:     { sigil: '⚙', tone: 'primary',   label: 'SYS' },
    error:      { sigil: '✕', tone: 'error',     label: 'ERR' }
};

// Membership is by leading utility, so `net-scan -d 3 | grep srv` is still a
// network command -- the verb the player typed is what they will look for.
const MEMBERS: Record<Exclude<Family, 'error'>, string[]> = {
    network: [
        'net-scan', 'net-link', 'net-conf', 'gen', 'nmap', 'ssh', 'ping',
        'bypass.sh', 'autopwn.sh', 'connect', 'transfer', 'scp'
    ],
    filesystem: [
        'ls', 'cd', 'pwd', 'cat', 'mkdir', 'rm', 'rmdir', 'cp', 'mv', 'ln',
        'touch', 'find', 'stat', 'du', 'df', 'chmod', 'chown', 'chgrp', 'tree'
    ],
    economy: ['wallet', 'mine', 'buy', 'sell', 'balance', 'ledger', 'shop'],
    text:    ['grep', 'sed', 'awk', 'vim', 'vi', 'echo', 'head', 'tail', 'sort', 'uniq', 'wc', 'diff'],
    system:  ['ps', 'kill', 'jobs', 'env', 'export', 'man', 'help', 'clear', 'history', 'mail', 'mailx', 'irc', 'archive']
};

const INDEX: Map<string, Family> = (() => {
    const m = new Map<string, Family>();
    (Object.keys(MEMBERS) as Array<Exclude<Family, 'error'>>).forEach(fam => {
        MEMBERS[fam].forEach(cmd => m.set(cmd, fam));
    });
    return m;
})();

/**
 * Classifies a command line. A non-zero exit always reads as an error,
 * whatever the verb -- a failure is the thing you are scanning for.
 */
export const classify = (commandLine: string, exitCode: number): Family => {
    if (exitCode !== 0) return 'error';
    const verb = (commandLine || '').trim().split(/\s+/)[0]?.toLowerCase() ?? '';
    return INDEX.get(verb) ?? 'system';
};

export const lookFor = (family: Family): FamilyLook => LOOKS[family];

/** Resolves a family's accent against the active theme's palette. */
export const accentColor = (family: Family, colors: any): string =>
    colors[LOOKS[family].tone] ?? colors.primary;
