/**
 * Utility conformance cases, differential against the host's GNU/POSIX tools.
 * Scripts must stay inside the scratch directory (relative paths only).
 */
import { DifferentialCase } from './differential';

const SAMPLE = `printf 'hello\\tworld\\n\\001\\377ABC' > s; `;
const REPEAT = `printf 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab' > r; `;

export const UTILITY_CASES: DifferentialCase[] = [
    // od
    ...['', '-c', '-b', '-x', '-d', '-s', '-o', '-t x1', '-t d1', '-t u4', '-t o4', '-t x8', '-t f4', '-t f8', '-a',
        '-An -tx1', '-Ad -tx2', '-Ax -c', '-c -tx1', '-j3 -N4 -c', '-tx1z', '-w4 -tx1', '-t d2 -t c', '-v -c', '-t u1 -t a']
        .map((opts, i) => ({ name: `od/${i}:${opts || 'default'}`, script: `${SAMPLE}${REPEAT}od ${opts} s; od ${opts} r` })),
    { name: 'od/stdin', script: `printf 'xyz' | od -c` },
    { name: 'od/empty', script: `: > e; od e; od -c < e` },
    { name: 'od/missing', script: `od nofile; echo st=$?` },
    { name: 'od/two-files', script: `printf ab > 1; printf cd > 2; od -c 1 2` },
    // cmp
    { name: 'cmp/same', script: `printf 'abc\\n' > a; printf 'abc\\n' > b; cmp a b; echo st=$?` },
    { name: 'cmp/differ', script: `printf 'line1\\nabc\\n' > a; printf 'line1\\nabd\\n' > b; cmp a b; echo st=$?` },
    { name: 'cmp/silent', script: `printf 'x' > a; printf 'y' > b; cmp -s a b; echo st=$?` },
    { name: 'cmp/list', script: `printf 'abcd' > a; printf 'abXY' > b; cmp -l a b; echo st=$?` },
    { name: 'cmp/eof', script: `printf 'ab' > a; printf 'abc' > b; cmp a b 2>&1; echo st=$?; : > e; cmp e b 2>&1; echo st=$?` },
    { name: 'cmp/skip', script: `printf 'xa' > a; printf 'ya' > b; cmp a b 1 1; echo st=$?; cmp -i 1 a b; echo st=$?` },
    { name: 'cmp/limit', script: `printf 'ab' > a; printf 'ac' > b; cmp -n 1 a b; echo st=$?` },
    { name: 'cmp/stdin', script: `printf 'q' > b; printf 'q' | cmp - b; echo st=$?` },
    { name: 'cmp/missing', script: `cmp nope b 2>/dev/null; echo st=$?` },
    // wc
    { name: 'wc/default', script: `printf 'one two\\nthree\\n' > f; wc f; wc < f; wc -l f; wc -w < f; wc -c f` },
    { name: 'wc/multi', script: `printf 'a\\n' > x; printf 'b c\\nd\\n' > y; wc x y; wc -l x y` },
    { name: 'wc/chars', script: `printf 'h\\303\\251llo\\n' > u; wc -c u; wc -m u` },
    { name: 'wc/stdin-pipe', script: `printf 'a b c' | wc; printf '' | wc -l` },
    // cksum
    { name: 'cksum/basic', script: `printf 'hello\\n' > h; cksum h; printf '' | cksum; printf 'x' | cksum; seq 1 1000 > s 2>/dev/null || printf '1\\n2\\n' > s; cksum s` },
    // nl
    { name: 'nl/default', script: `printf 'a\\n\\nb\\n' | nl` },
    { name: 'nl/all', script: `printf 'a\\n\\nb\\n' | nl -ba` },
    { name: 'nl/opts', script: `printf 'a\\nb\\nc\\n' | nl -i 2 -v 10 -w 3 -s ': ' -n rz` },
    { name: 'nl/ln', script: `printf 'a\\nb\\n' | nl -n ln` },
    { name: 'nl/pattern', script: `printf 'apple\\nbanana\\ncherry\\n' | nl -b pa` },
    { name: 'nl/pages', script: `printf '\\\\:\\\\:\\\\:\\nhead\\n\\\\:\\\\:\\nbody1\\nbody2\\n\\\\:\\nfoot\\n' | nl -ha -fa` },
    { name: 'nl/join', script: `printf 'a\\n\\n\\n\\n\\nb\\n' | nl -ba -l 2` },
    // strings
    { name: 'strings/basic', script: `printf 'abc\\000hello\\001\\002world!\\377xy\\ttabbed\\n' > b; strings b; strings -n 2 b; strings -t x b; strings -t d -n 6 b` },
    { name: 'strings/stdin', script: `printf 'zz\\000longer\\000' | strings` },
    // expand / unexpand
    { name: 'expand/default', script: `printf 'a\\tb\\t\\tc\\n\\tx\\n' | expand | od -c` },
    { name: 'expand/t4', script: `printf 'a\\tb\\n12345\\tc\\n' | expand -t 4` },
    { name: 'expand/list', script: `printf 'a\\tb\\tc\\td\\n' | expand -t 3,7,12` },
    { name: 'unexpand/leading', script: `printf '        a       b\\n    c\\n' | unexpand | od -c` },
    { name: 'unexpand/all', script: `printf '        a       b\\n' | unexpand -a | od -c` },
    { name: 'unexpand/t4', script: `printf '    x   y\\n' | unexpand -t 4 | od -c` },
    // fold
    { name: 'fold/width', script: `printf 'abcdefghij\\nshort\\n' | fold -w 4` },
    { name: 'fold/spaces', script: `echo "a b c d" | fold -w 3 -s; echo "the quick brown fox jumps" | fold -s -w 10` },
    { name: 'fold/tabs', script: `printf 'a\\tbcdefghijk\\n' | fold -w 10 | od -c` },
    { name: 'fold/bytes', script: `printf 'abcdef\\n' | fold -b -w 2` },
    { name: 'fold/zero', script: `echo x | fold -w 0; echo st=$?` },
    // tsort
    { name: 'tsort/basic', script: `printf 'a b\\nb c\\na d\\nd c\\ne e\\n' | tsort` },
    { name: 'tsort/chain', script: `echo 'shirt tie tie jacket belt jacket pants shoes pants belt socks shoes' | tsort` },
    { name: 'tsort/cycle', script: `printf 'a b\\nb a\\n' | tsort 2>/dev/null; echo st=$?` },
    { name: 'tsort/odd', script: `echo 'a b c' | tsort 2>/dev/null; echo st=$?` },
];
