/**
 * Charmaps (XBD 6.4) installed in /usr/share/i18n/charmaps, and the
 * generic locale sources (POSIX, i18n, iso14651_t1) that locale sources
 * `copy`. The character tables are abbreviated; localedef only needs the
 * header (code set name, aliases, mb_cur_max).
 */

function charmap(name: string, aliases: string[], mbMax: number, rows: string): string {
    return `<code_set_name> ${name}\n<comment_char> %\n<escape_char> /\n<mb_cur_min> 1\n<mb_cur_max> ${mbMax}\n` +
        aliases.map(a => `% alias ${a}\n`).join('') + `CHARMAP\n${rows}END CHARMAP\n`;
}

const ASCII_ROWS = '<U0000>     /x00         NULL\n<U0020>     /x20         SPACE\n<U0030>     /x30         DIGIT ZERO\n' +
    '<U0041>     /x41         LATIN CAPITAL LETTER A\n<U0061>     /x61         LATIN SMALL LETTER A\n<U007F>     /x7f         DELETE\n';

export const CHARMAPS: Record<string, string> = {
    'UTF-8': charmap('UTF-8', ['ISO-10646/UTF-8', 'ISO-10646/UTF8', 'UTF8'], 6,
        ASCII_ROWS + '<U00E9>     /xc3/xa9     LATIN SMALL LETTER E WITH ACUTE\n<U20AC>     /xe2/x82/xac EURO SIGN\n'),
    'ANSI_X3.4-1968': charmap('ANSI_X3.4-1968', ['ISO-IR-6', 'ANSI_X3.4-1986', 'ISO_646.IRV:1991', 'ASCII', 'ISO646-US', 'US-ASCII', 'US', 'IBM367', 'CP367', 'CSASCII'], 1, ASCII_ROWS),
    'ISO-8859-1': charmap('ISO-8859-1', ['ISO-IR-100', 'ISO_8859-1:1987', 'ISO_8859-1', 'LATIN1', 'L1', 'IBM819', 'CP819', 'CSISOLATIN1'], 1,
        ASCII_ROWS + '<U00E9>     /xe9         LATIN SMALL LETTER E WITH ACUTE\n'),
    'ISO-8859-15': charmap('ISO-8859-15', ['ISO_8859-15', 'LATIN-9', 'LATIN9'], 1,
        ASCII_ROWS + '<U20AC>     /xa4         EURO SIGN\n'),
};

const section = (cat: string, body = '') => `${cat}\n${body}END ${cat}\n\n`;

export const GENERIC_SOURCES: Record<string, string> = {
    POSIX: 'comment_char %\nescape_char /\n\n% The POSIX locale (XBD 7.2): every category has its built-in values.\n\n' +
        ['LC_CTYPE', 'LC_COLLATE', 'LC_MONETARY', 'LC_NUMERIC', 'LC_TIME', 'LC_MESSAGES', 'LC_PAPER', 'LC_NAME', 'LC_ADDRESS',
            'LC_TELEPHONE', 'LC_MEASUREMENT', 'LC_IDENTIFICATION'].map(c => section(c)).join(''),
    i18n: 'comment_char %\nescape_char /\n\n% Generic character classes (ISO/IEC 14652 i18n FDCC-set).\n\n' +
        section('LC_CTYPE', '% upper, lower, alpha, digit, ... (built in)\n'),
    iso14651_t1: 'comment_char %\nescape_char /\n\n% Common template table for collation (ISO/IEC 14651).\n\n' +
        section('LC_COLLATE', '% collating elements and weights (built in)\n'),
};
