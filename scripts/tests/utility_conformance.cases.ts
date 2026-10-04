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
    // ln / link / unlink / readlink / realpath / mkfifo
    { name: 'ln/hard', script: `echo x > f; ln f h; ls -i f h | awk '{print $1}' | uniq | wc -l; cat h` },
    { name: 'ln/symlink', script: `echo x > f; ln -s f s; readlink s; cat s; ln -s nowhere dangling; readlink dangling; cat dangling 2>/dev/null; echo st=$?` },
    { name: 'ln/exists', script: `touch a b; ln a b 2>&1; echo st=$?; ln -f a b; echo st=$?` },
    { name: 'ln/into-dir', script: `touch f1 f2; mkdir d; ln f1 f2 d; ls d; ln -s ../f1 d/sl; cat d/sl; echo ok` },
    { name: 'ln/dir-hard', script: `mkdir d; ln d d2 2>&1; echo st=$?` },
    { name: 'ln/multi-not-dir', script: `touch a b c; ln a b c 2>&1; echo st=$?` },
    { name: 'link/basic', script: `echo y > f; link f g; cat g; link f g 2>/dev/null; echo st=$?; link f 2>/dev/null; echo st=$?` },
    { name: 'unlink/basic', script: `touch f; unlink f; [ -e f ] || echo gone; unlink f 2>/dev/null; echo st=$?; mkdir d; unlink d 2>/dev/null; echo st=$?; touch a b; unlink a b 2>/dev/null; echo st=$?` },
    { name: 'readlink/canon', script: `mkdir -p a/b; touch a/b/f; ln -s a/b lb; ln -s lb/f lf; readlink lf; readlink -f lf | sed "s|$PWD|PWD|"; readlink -e nope; echo st=$?; readlink -m nope/x | sed "s|$PWD|PWD|"; readlink -f nope | sed "s|$PWD|PWD|"; readlink -f nope/x; echo st=$?` },
    { name: 'readlink/plain', script: `touch f; readlink f; echo st=$?; ln -s f l; readlink -n l; echo; readlink l l` },
    { name: 'realpath/basic', script: `mkdir -p x/y; touch x/y/f; ln -s x/y ly; realpath ly/f | sed "s|$PWD|PWD|"; realpath -s ly/f | sed "s|$PWD|PWD|"; realpath . | sed "s|$PWD|PWD|"; realpath missing | sed "s|$PWD|PWD|"; realpath -e missing 2>/dev/null; echo st=$?; realpath -m a/../b/c | sed "s|$PWD|PWD|"` },
    { name: 'mkfifo/basic', script: `mkfifo p; ls -l p | cut -c1; mkfifo p 2>/dev/null; echo st=$?; mkfifo -m 600 q; ls -l q | cut -c1-10; [ -p q ] && echo fifo` },
    // sed
    { name: 'sed/subst', script: `printf 'hello world\\nfoo bar\\n' > f; sed 's/o/0/' f; sed 's/o/0/g' f; sed 's/o/0/2' f; sed -n 's/foo/X/p' f` },
    { name: 'sed/multi-e', script: `echo a | sed -e 's/a/b/' -e 's/b/c/'; echo a | sed 's/a/b/;s/b/d/'` },
    { name: 'sed/addresses', script: `printf '1\\n2\\n3\\n4\\n5\\n' > n; sed -n '2,4p' n; sed '3d' n; sed -n '/3/,$p' n; sed '$d' n; sed -n '1~2p' n 2>/dev/null; sed '2!d' n` },
    { name: 'sed/regex', script: `echo 'abc123def' | sed 's/[0-9]\\{2\\}/X/'; echo 'aaa' | sed 's/a*/X/'; echo 'hello' | sed 's/\\(h\\)\\(e\\)/\\2\\1/'; echo 'path/to/x' | sed 's|/|:|g'; echo 'one two' | sed -E 's/(\\w+) (\\w+)/\\2 \\1/'` },
    { name: 'sed/amp-case', script: `echo hello | sed 's/l*/[&]/g'; echo Hello | sed 's/hello/X/I'` },
    { name: 'sed/commands', script: `printf 'a\\nb\\nc\\n' > f; sed '2i\\
inserted' f; sed '2a\\
appended' f; sed '2c\\
changed' f; sed -n '$=' f; sed 'y/abc/xyz/' f` },
    { name: 'sed/hold', script: `printf '1\\n2\\n3\\n' | sed -n '1!G;h;$p'; printf 'a\\nb\\n' | sed 'N;s/\\n/,/'` },
    { name: 'sed/inplace', script: `printf 'x\\n' > f; sed -i 's/x/y/' f; cat f` },
    { name: 'sed/quit', script: `printf '1\\n2\\n3\\n' | sed 2q; printf '1\\n2\\n' | sed -n '/2/{p;q;}'` },
    { name: 'sed/script-file', script: `printf 's/a/b/\\ns/b/c/\\n' > s.sed; echo a | sed -f s.sed` },
    // tr
    { name: 'tr/basic', script: `echo hello | tr a-z A-Z; echo hello | tr -d l; echo 'aabbcc' | tr -s abc; echo hello | tr -c le x; echo hello | tr -cd l; echo 'a b' | tr ' ' '\\n'` },
    { name: 'tr/classes', script: `echo 'Hello World 123' | tr '[:lower:]' '[:upper:]'; echo 'Hello 123' | tr -d '[:digit:]'; echo 'a  b   c' | tr -s '[:space:]'; echo abc | tr 'abc' 'x'; echo abcd | tr 'a-d' '[x*]'` },
    { name: 'tr/escapes', script: `printf 'a\\tb\\n' | tr '\\t' ' '; echo abc | tr '\\141' 'z'` },
    // split / csplit
    { name: 'split/lines', script: `seq 1 25 > f; split -l 10 f; ls x*; cat xab; split -l 10 -a 3 f p.; ls p.*` },
    { name: 'split/bytes', script: `printf '1234567' > f; split -b 3 f; for x in xa*; do printf '%s:' $x; cat $x; echo; done` },
    { name: 'split/default', script: `seq 1 2500 > f; split f; wc -l xa*` },
    { name: 'split/stdin-prefix', script: `seq 1 4 | split -l 2 - part; cat partaa; ls part*` },
    { name: 'split/numeric', script: `seq 1 4 > f; split -d -l 1 f; ls x*` },
    { name: 'csplit/line', script: `printf 'a\\nb\\nc\\n' > f; csplit f 2; cat xx00; echo --; cat xx01` },
    { name: 'csplit/regex', script: `printf 'h1\\nx\\nh2\\ny\\nh3\\n' > f; csplit -s f '/^h/' '{*}'; ls xx*; cat xx02` },
    { name: 'csplit/opts', script: `seq 1 6 > f; csplit -f part -n 3 f 3 5; ls part*; csplit -k f 99 2>/dev/null; echo st=$?; ls xx* 2>/dev/null | wc -l` },
    { name: 'csplit/offset', script: `seq 1 8 > f; csplit -s f '/4/+1' '%7%'; cat xx00; echo --; cat xx01` },
    { name: 'csplit/missing', script: `csplit nofile 1 2>/dev/null; echo st=$?` },
    // paste / join / comm
    { name: 'paste/basic', script: `printf '1\\n2\\n3\\n' > a; printf 'x\\ny\\n' > b; paste a b; paste -d, a b; paste -s a b; paste -s -d ':;' a; paste -d ':;' a b a` },
    { name: 'paste/stdin', script: `printf '1\\n2\\n3\\n4\\n' | paste - -; printf 'a\\nb\\n' | paste -s -` },
    { name: 'join/basic', script: `printf '1 a\\n2 b\\n3 c\\n' > f1; printf '1 x\\n3 z\\n4 w\\n' > f2; join f1 f2; join -a 1 f1 f2; join -v 2 f1 f2; join -o 1.2,2.2 f1 f2; join -o 0,2.2 -a1 -e NONE f1 f2` },
    { name: 'join/fields', script: `printf 'a:1\\nb:2\\n' > f1; printf '1:x\\n2:y\\n' > f2; join -t: -1 2 -2 1 f1 f2` },
    { name: 'comm/basic', script: `printf 'a\\nb\\nd\\n' > x; printf 'b\\nc\\nd\\n' > y; comm x y; comm -12 x y; comm -3 x y; echo b | comm - y` },
    // uname / sleep / pathchk / dirname
    { name: 'uname/errors', script: `uname -z 2>/dev/null; echo st=$?; uname extra 2>/dev/null; echo st=$?; uname -s | wc -l` },
    { name: 'sleep/errors', script: `sleep -1 2>/dev/null; echo st=$?; sleep x 2>/dev/null; echo st=$?; sleep 0 0; echo st=$?; sleep; echo st=$?` },
    { name: 'pathchk/basic', script: `pathchk a/b; echo st=$?; pathchk ''; echo st=$?; pathchk -p 'a b'; echo st=$?; pathchk -p 'ok_name'; echo st=$?; pathchk $(printf '%0300d' 0); echo st=$?` },
    { name: 'dirname/multi', script: `dirname a/b c/d /x` },
    // iconv
    { name: 'iconv/basic', script: `printf 'caf\\303\\251\\n' | iconv -f UTF-8 -t ISO-8859-1 | od -An -tx1; printf 'caf\\351\\n' | iconv -f ISO-8859-1 -t UTF-8; iconv -f JUNK -t ASCII /dev/null 2>/dev/null; echo st=$?; printf 'x\\n' | iconv -f ascii -t utf-8` },
];
