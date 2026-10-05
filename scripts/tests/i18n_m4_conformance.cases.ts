/**
 * Differential cases for m4 and the internationalisation utilities
 * (gettext, ngettext, msgfmt, xgettext, locale, localedef, gencat),
 * recorded against GNU m4, GNU gettext and glibc on the host.
 * Scripts must stay inside the scratch directory (relative paths only).
 */
import { DifferentialCase } from './differential';

/** Runs an m4 program given on stdin (here-document) and prints the status. */
const m4 = (name: string, program: string, opts = '') =>
    ({ name: `m4/${name}`, script: `m4 ${opts} <<'EOF'\n${program}\nEOF\necho st=$?` });

export const I18N_M4_CASES: DifferentialCase[] = [
    // ---- m4 ----
    m4('define', "define(`X',`Y')X define(`a',`$1+$2')a(1,2) a(  x,  y  ) a((1,2),3)"),
    m4('args', "define(`t',`$# [$*] [$@] `$0' $10')t(a,b,c,d,e,f,g,h,i,j,k)\nt\nt()"),
    m4('quotes', "`quoted' ``nested'' `a`b'c' define(`q',`$1')q(`(')q(`,')"),
    m4('changequote', "changequote([,])[x] define([y],[Y])y changequote`'`x' changequote(<<,>>)<<hi>> <<a<<b>>c>>changequote\n`back'"),
    m4('changequote-one', "changequote([)[x' y\nchangequote(`')`x'"),
    m4('comments', "# define(`x',`y') x\nchangecom(/*,*/)/* x */ # x\nchangecom\n# x"),
    m4('dnl', "a dnl comment\nb\ndefine(`x',`1')dnl\nx"),
    m4('undefine', "define(`x',`1')x undefine(`x')x undefine(`nosuch')"),
    m4('defn', "define(`d',`hello $1')defn(`d') define(`L',defn(`len'))L(abcd) defn(`nosuch')x"),
    m4('pushdef', "define(`x',`1')pushdef(`x',`2')x popdef(`x')x popdef(`x')x pushdef(`n',`a')pushdef(`n',`b')n popdef(`n')n"),
    m4('ifdef', "ifdef(`len',yes,no) ifdef(`zz',yes,no) ifdef(`zz',yes)."),
    m4('ifelse', "ifelse(a,b,c,d,d,yes,no) ifelse(a) ifelse(a,a,1) ifelse(x,y,z). ifelse(a,b,c,d,e,f,g)"),
    m4('shift', "shift(a,b,c) shift(a) shift() define(`last',`ifelse($#,1,$1,`last(shift($@))')')last(1,2,3)"),
    m4('divert', "divnum divert(1)one divert(2)two divert divnum undivert(2) and divert(-1)gone divert(0)end"),
    m4('undivert-all', "divert(3)three\ndivert(1)one\ndivert(2)two\ndivert(0)undivert\ndone"),
    m4('divert-end', "divert(2)two\ndivert(1)one\ndivert(0)zero"),
    m4('incr', "incr(5) decr(0) incr(-3) incr(2147483647) decr(`  7')"),
    m4('incr-bad', "incr(`x') incr()"),
    m4('eval', "eval(1+2*3) eval((1+2)*3) eval(-7/2) eval(-7%2) eval(1<<31) eval(0x10) eval(0b101) eval(010) eval(0r36:zz) eval(2**3**2) eval(-2**2) eval(!0+~0) eval(1==1&&2>1||0) eval(5&3|8^1)"),
    m4('eval-radix', "eval(10,16) eval(10,2,8) eval(-10,16) eval(255,36) eval(5,1) eval(5,1,8) eval(1,,3) eval(0 && 1/0)"),
    m4('eval-errors', "eval(1/0)\neval(1+)\neval(1 2)\neval(a)\neval()\neval(3%0)\neval(5,37)\neval(5,10,-1)\neval(0**-1)"),
    m4('len-index', "len() len(abc) index(hello,l) index(hello,z) index(hello,) index(hello)"),
    m4('substr', "substr(hello,1) substr(hello,1,2) substr(hello,-1) substr(hello,9) substr(hello,0,0) substr(hello)"),
    m4('translit', "translit(hello,a-z,A-Z) translit(hello,lo) translit(abc,a-c,z) translit(abc,c-a,123) translit(a-b,-) translit(hello)"),
    m4('regexp', "regexp(`GNUs not Unix', `\\<[a-z]\\w+') regexp(`GNUs not Unix', `\\(\\w+\\) not', `\\1!') regexp(abc,x) regexp(abc,x,y). regexp(abc,b+,<\\&>)"),
    m4('patsubst', "patsubst(`GNUs not Unix', `\\w+', `<\\&>') patsubst(aaa,a*,x) patsubst(hello,l) patsubst(`a b  c',` +',`_') patsubst(abc,^,>)"),
    m4('format', "format(`%5d|%-5s|%x|%c|%.2f|%05d|%+d|%o|%X|%%', 42, ab, 255, 65, 3.14159, 7, 3, 8, 255) format(`%s and %s', x)"),
    m4('builtin-indir', "define(`f',`[$1]')indir(`f',x) builtin(`len',abc) indir(`nosuch')"),
    m4('sysval', "syscmd(`echo hi')sysval syscmd(`exit 3')sysval esyscmd(`printf abc')"),
    m4('syscmd-order', "before\ndivert(1)diverted\ndivert(0)syscmd(`echo cmd')after"),
    m4('errprint', "errprint(`to stderr\n')x"),
    m4('m4exit', "a\ndivert(1)b\ndivert(0)m4exit(3)c"),
    m4('m4exit-plain', "a m4exit b"),
    m4('m4wrap', "m4wrap(`w1 ')m4wrap(`w2 ')m4wrap(`w3', `w4 ')start\n"),
    m4('file-line', "__file__ __line__\n__line__ __program__ __gnu__ __unix__ unix"),
    m4('blind', "define len index eval(\n) define()"),
    m4('nested-calls', "define(`twice',`$1$1')define(`x',`y')twice(x) twice(`x') twice(twice(ab))"),
    m4('recursion', "define(`count',`ifelse($1,0,done,`$1 count(decr($1))')')count(5)"),
    m4('forloop', "define(`forloop',`pushdef(`$1',`$2')_forloop($@)popdef(`$1')')define(`_forloop',`$4`'ifelse($1,`$3',`',`define(`$1',incr($1))$0($@)')')forloop(`i',1,5,`i,')"),
    m4('eof-string', "`abc"),
    m4('eof-args', "define(`f',`[$1]')f(a"),
    m4('dumpdef', "define(`x',`y')dumpdef(`x',`len')dumpdef(`nosuch')ok"),
    m4('opt-D', "A B C", '-DA=1 -D B -DC=x=y'),
    m4('opt-U', "len(abc) define(z)", '-Ulen'),
    m4('opt-P', "len(abc) m4_len(abc) m4_define(`x',`1')x", '-P'),
    m4('opt-G', "format(`%d',1) len(ab) unix __gnu__", '-G'),
    m4('opt-Q', "eval()", '-Q'),
    { name: 'm4/files', script: `printf 'define(A,B)A\\n' > f; printf 'A\\n' > g; m4 f g; echo st=$?; m4 f nofile g 2>/dev/null; echo st=$?` },
    { name: 'm4/include', script: `printf 'inc __file__ __line__\\n' > inc.m4; printf 'include(inc.m4)sinclude(nope)x\\ninclude(nope)y\\n' > main; m4 main 2>/dev/null; echo st=$?` },
    { name: 'm4/include-path', script: `mkdir d; printf 'from d\\n' > d/lib.m4; echo 'include(lib.m4)' | m4 -I d; echo st=$?` },
    { name: 'm4/undivert-file', script: `printf 'raw define(x)\\n' > r; echo 'undivert(r)undivert(nope)z' | m4 2>/dev/null; echo st=$?` },
    { name: 'm4/mkstemp', script: `echo 'define(f,mkstemp(fooXXXXXX))f' | m4 > out; test -f "$(cat out)" && echo created; cat out | cut -c1-3` },
    { name: 'm4/stdin-dash', script: `printf 'define(x,1)' > a; echo x | m4 a -; echo st=$?` },
    { name: 'm4/bad-option', script: `m4 -z </dev/null 2>/dev/null; echo st=$?; m4 --version | head -1; m4 --nosuch </dev/null 2>/dev/null; echo st=$?` },
    { name: 'm4/synclines', script: `printf 'a\\nb\\n' | m4 -s; echo st=$?` },
];
