/**
 * Differential cases for m4 and the internationalisation utilities
 * (gettext, ngettext, msgfmt, xgettext, locale, localedef, gencat),
 * recorded against GNU m4, GNU gettext and glibc on the host.
 * Scripts must stay inside the scratch directory (relative paths only).
 */
import { DifferentialCase } from './differential';

/** Runs an m4 program given on stdin (here-document) and prints the status. */
/** A clean locale environment (the simulator's login shell exports LANG). */
const E = 'env -i PATH="$PATH"';
const ALL_CATS = 'LC_CTYPE LC_NUMERIC LC_TIME LC_COLLATE LC_MONETARY LC_MESSAGES LC_PAPER LC_NAME LC_ADDRESS LC_TELEPHONE LC_MEASUREMENT LC_IDENTIFICATION';
/** Keywords modelled for compiled locales (excludes glibc-internal LC_CTYPE/LC_COLLATE tables). */
const MODELLED = 'LC_NUMERIC LC_MONETARY LC_MESSAGES LC_PAPER LC_NAME LC_ADDRESS LC_TELEPHONE LC_MEASUREMENT charmap abday day abmon mon am_pm d_t_fmt d_fmt t_fmt t_fmt_ampm date_fmt first_weekday week-1stday title language territory revision';
const compile = (loc: string, cm = 'UTF-8') => `mkdir -p loc; localedef -f ${cm} -i ${loc} "$PWD/loc/${loc}.${cm}"; echo st=$?; `;

/** A C source exercising xgettext's default keywords, comments and wrapping. */
const C_SRC = `cat > a.c <<'EOF'
#include <stdio.h>
/* TRANSLATORS: greeting */
int main() {
    printf(gettext("Hello, %s!\\n"), "x");
    puts(_("underscore"));
    puts(gettext("Hello, %s!\\n"));
    printf(ngettext("%d file", "%d files", n), n);
    puts(pgettext("menu", "Open"));
    puts(gettext("a very long message that goes on and on and on and on and on and on and on and on and on"));
    puts(gettext("multi\\nline\\ntext"));
    puts(gettext("tab\\there \\"quoted\\" back\\\\slash"));
    puts(gettext("concat" "enated"));
    puts(dgettext("dom", "domained"));
    // comment for next
    puts(gettext_noop("noop"));
    puts(gettext(""));
    printf(gettext("100% sure %q")); printf(gettext("50%% off"));
    puts(N_("nn")); x = gettext(variable);
}
EOF
`;
const SH_SRC = `cat > s.sh <<'EOF'
#!/bin/sh
gettext "shell msg"; echo
echo "$(gettext 'single quoted')"
ngettext "one" "many" $n
eval_gettext "Value \\$x"
echo $"dollar quoted"
gettext -n "with option"
EOF
`;
const NO_DATE = `grep -v POT-Creation-Date`;
/** A French catalog compiled with msgfmt into ./fr/LC_MESSAGES/app.mo. */
const FR_PO = `cat > fr.po <<'EOF'
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Plural-Forms: nplurals=2; plural=(n > 1);\\n"

msgid "hello"
msgstr "bonjour"

msgid "file"
msgid_plural "files"
msgstr[0] "fichier"
msgstr[1] "fichiers"

msgctxt "menu"
msgid "Open"
msgstr "Ouvrir"

msgid "a\\tb"
msgstr "A\\tB"

#, fuzzy
msgid "fz"
msgstr "flou"

msgid "untranslated"
msgstr ""
EOF
mkdir -p fr/LC_MESSAGES de/LC_MESSAGES; msgfmt -o fr/LC_MESSAGES/app.mo fr.po; `;
/** gettext with the French locale compiled into LOCPATH and catalogs under $PWD. */
const FR_ENV = `${'env -i PATH="$PATH"'} LOCPATH="$PWD/loc" TEXTDOMAINDIR="$PWD"`;
const FR_LOCALE = `mkdir -p loc; localedef -f UTF-8 -i fr_FR "$PWD/loc/fr_FR.UTF-8"; `;

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

    // ---- xgettext ----
    { name: 'xgettext/c-default', script: `${C_SRC}xgettext -o - a.c | ${NO_DATE}; echo st=$?` },
    { name: 'xgettext/c-keywords-comments', script: `${C_SRC}xgettext -k_ -kN_ -c -o - --omit-header a.c; echo st=$?` },
    { name: 'xgettext/c-tag-nolocation', script: `${C_SRC}xgettext -cTRANSLATORS: -o - --omit-header --no-location a.c` },
    { name: 'xgettext/c-sort-width', script: `${C_SRC}xgettext -s -o - --omit-header a.c; xgettext -o - --omit-header -w 30 a.c` },
    { name: 'xgettext/files', script: `${C_SRC}echo 'int x;' > none.c; xgettext none.c 2>/dev/null; echo st=$?; ls; xgettext -d mydom a.c 2>/dev/null; echo st=$?; ls; ${NO_DATE} mydom.po | head -30` },
    { name: 'xgettext/default-output', script: `printf 'gettext("msg");' > f.c; xgettext f.c; echo st=$?; ${NO_DATE} messages.po; xgettext -o out.po f.c; ls; printf 'gettext("two");' > g.c; xgettext -j g.c 2>/dev/null; echo st=$?; ${NO_DATE} messages.po | tail -8` },
    { name: 'xgettext/errors', script: `printf 'gettext("msg");' > f.c; xgettext missing 2>/dev/null; echo st=$?; xgettext 2>/dev/null; echo st=$?; xgettext -k _ f.c 2>/dev/null; echo st=$?; xgettext --nosuch f.c 2>/dev/null; echo st=$?; xgettext -L Klingon f.c 2>/dev/null; echo st=$?; ls` },
    { name: 'xgettext/shell', script: `${SH_SRC}xgettext -o - --omit-header s.sh 2>/dev/null; echo st=$?` },
    { name: 'xgettext/keyword-spec', script: `printf 'tr("a", "b");\\nmy_ngettext(1, "one", "many");\\nctx("c", "m");\\n' > k.c; xgettext -k -ktr:2 -kmy_ngettext:2,3 -kctx:1c,2 --omit-header -o - k.c` },
    { name: 'xgettext/non-ascii', script: `printf 'gettext("caf\\303\\251");' > u.c; xgettext -o - u.c >/dev/null 2>&1; echo st=$?; xgettext --from-code=UTF-8 -o - u.c | ${NO_DATE}` },
    // ---- msgfmt ----
    { name: 'msgfmt/empty', script: `: > f.po; msgfmt f.po; echo st=$?; ls; msgfmt -o out.mo f.po; echo st=$?; ls` },
    { name: 'msgfmt/header-only', script: `printf 'msgid ""\\nmsgstr "Content-Type: text/plain; charset=UTF-8\\\\n"\\n' > h.po; msgfmt h.po; echo st=$?; od -An -tx1 messages.mo` },
    { name: 'msgfmt/catalog', script: `${FR_PO}echo st=$?; od -An -tx1 fr/LC_MESSAGES/app.mo; msgfmt --no-hash -o - fr.po | od -An -tx1; msgfmt -f -o - fr.po | od -An -c | tail -4` },
    { name: 'msgfmt/statistics', script: `${FR_PO}msgfmt --statistics -o x.mo fr.po 2>&1; msgfmt -v -o x.mo fr.po 2>&1; msgfmt -f --statistics -o x.mo fr.po 2>&1; echo st=$?` },
    { name: 'msgfmt/check', script: `${FR_PO}msgfmt -c -o x.mo fr.po 2>/dev/null; echo st=$?; printf 'msgid "a\\\\n"\\nmsgstr "b"\\n' > bad.po; msgfmt -c bad.po 2>/dev/null; echo st=$?; msgfmt bad.po; echo st=$?` },
    { name: 'msgfmt/errors', script: `msgfmt missing 2>/dev/null; echo st=$?; msgfmt 2>/dev/null; echo st=$?; echo x > b.po; msgfmt b.po 2>/dev/null; echo st=$?; msgfmt a b 2>/dev/null; echo st=$?; : > f.po; msgfmt --java f.po 2>/dev/null; echo st=$?; msgfmt -z f.po 2>/dev/null; echo st=$?; printf 'msgid "a"\\nmsgstr "b"\\nmsgid "a"\\nmsgstr "c"\\n' > d.po; msgfmt d.po 2>/dev/null; echo st=$?; printf 'msgid "a"\\n' > m.po; msgfmt m.po 2>/dev/null; echo st=$?; ls` },
    { name: 'msgfmt/stdin-multi', script: `printf 'msgid "a"\\nmsgstr "A"\\n' > 1.po; printf 'msgid "b"\\nmsgstr "B"\\n' | msgfmt -o - 1.po - | od -An -c` },
    // ---- gettext / ngettext ----
    { name: 'gettext/untranslated', script: `gettext msg; echo; gettext -d dom msg; echo; gettext -c LC_MESSAGES msg; echo st=$?; gettext ""; echo st=$?; gettext "'v'"; echo; TEXTDOMAIN=d gettext msg; echo` },
    { name: 'gettext/args', script: `gettext 2>/dev/null; echo st=$?; gettext a b c 2>/dev/null; echo st=$?; gettext -s; echo st=$?; gettext -n -s a b; echo "|"; gettext -s a b c; gettext -z x 2>/dev/null; echo st=$?; gettext dom msg; echo; gettext msg -d dom; echo; gettext -- -x; echo` },
    { name: 'gettext/escapes', script: `gettext -e 'a\\nb'; echo "|"; gettext -e 'x\\cy\\n'; echo "|"; gettext -s -e 'x\\ny' 'z\\c' w; echo "|"; gettext -E 'x\\ny'; echo "|"; gettext -e '\\101\\0102\\\\\\q' | od -c` },
    { name: 'ngettext/untranslated', script: `for n in 1 2 0 100 -1 1x '' ' 1' +1 18446744073709551616; do ngettext s p "$n"; echo; done; ngettext -d d s p 1; echo; ngettext d s p 1; echo; ngettext -e 'a\\n' b 1 | od -c` },
    { name: 'ngettext/args', script: `ngettext 2>/dev/null; echo st=$?; ngettext a b 2>/dev/null; echo st=$?; ngettext a b 1 2 3 2>/dev/null; echo st=$?` },
    { name: 'gettext/catalog-C', script: `${FR_PO}${FR_ENV} LC_ALL=C LANGUAGE=fr gettext -d app hello; echo; ${FR_ENV} LC_ALL=C.UTF-8 LANGUAGE=fr gettext -d app hello; echo; ${FR_ENV} LC_ALL=fr_FR.UTF-8 gettext -d app hello; echo` },
    { name: 'gettext/catalog-fr', script: `${FR_PO}${FR_LOCALE}for lang in "" fr fr_FR de:fr de C:fr fr_CA.UTF-8; do echo "== $lang"; ${FR_ENV} LC_ALL=fr_FR.UTF-8 LANGUAGE=$lang gettext -d app hello; echo; ${FR_ENV} LC_ALL=fr_FR.UTF-8 LANGUAGE=$lang TEXTDOMAIN=app gettext -s hello world fz untranslated; done` },
    { name: 'gettext/catalog-features', script: `${FR_PO}${FR_LOCALE}F="${FR_ENV} LC_ALL=fr_FR.UTF-8"; $F gettext app hello; echo; $F gettext -d app -c menu Open; echo; $F gettext -d app Open; echo; $F gettext -d app -e 'a\\tb'; echo; $F gettext -d nodomain hello; echo; for n in 0 1 2 5; do $F ngettext -d app file files $n; echo; done; $F ngettext -d app nope nopes 1; echo; LANG=fr_FR.UTF-8 $F gettext -d app hello; echo` },
    { name: 'gettext/catalog-variants', script: `${FR_PO}${FR_LOCALE}mkdir -p fr_FR/LC_MESSAGES; printf 'msgid "hello"\\nmsgstr "salut"\\n' > v.po; msgfmt -o fr_FR/LC_MESSAGES/app.mo v.po; ${FR_ENV} LC_ALL=fr_FR.UTF-8 gettext -d app hello; echo; ${FR_ENV} LC_ALL=fr_FR.UTF-8 gettext -d app file; echo; ${FR_ENV} LC_MESSAGES=fr_FR.UTF-8 LANGUAGE=fr gettext -d app hello; echo` },
    // ---- gencat ----
    { name: 'gencat/basic', script: `printf '1 quote' > m; gencat cat m; echo st=$?; od -An -tx1 cat` },
    { name: 'gencat/sets-quotes', script: `printf '$set 2\\n5 hello\\n7 world\\n$set 3\\n1 a\\\\\\nb\\n$quote "\\n2 "quoted msg"   \\n3\\n4 \\n$ comment\\n' > m2; gencat --new c m2; echo st=$?; od -An -tx1 c` },
    { name: 'gencat/escapes', script: `printf '$quote "\\n1 tab\\\\there\\\\nnl \\\\101\\\\0102 \\\\q \\\\\\\\ \\\\"x\\\\" end\\n2 "unterminated\\n' > e; gencat c e 2>/dev/null; echo st=$?; od -An -c c | tail -3` },
    { name: 'gencat/symbolic-header', script: `printf 'FOO hello\\n$set BAR\\nBAZ x\\n2 two\\nQUX y\\n$set 5\\nSYM z\\n' > m3; gencat -H h.h c m3; echo st=$?; od -An -tx1 c; cat h.h; gencat -H - -o - m3 | od -An -c | tail -8` },
    { name: 'gencat/merge', script: `printf '1 one\\n2 two\\n3 three\\n' > a; printf '2 TWO\\n3\\n4 four\\n' > b; gencat c a; gencat c b; echo st=$?; od -An -c c | tail -3; gencat --new c b; od -An -c c | tail -2` },
    { name: 'gencat/delset', script: `printf '$set 1\\n1 a\\n$set 2\\n1 b\\n$delset 1\\n' > d; gencat c d 2>/dev/null; echo st=$?; od -An -c c | tail -2` },
    { name: 'gencat/errors', script: `gencat c missing 2>/dev/null; echo st=$?; ls; printf '1 a\\n1 b\\n' > dup; gencat c dup 2>/dev/null; echo st=$?; printf '%%x\\n$bogus\\n$set\\n' > bad; gencat c2 bad 2>/dev/null; echo st=$?; echo x | gencat c3 -; echo st=$?; od -An -c c3; gencat -z c 2>/dev/null; echo st=$?` },
    { name: 'gencat/stdout-stdin', script: `gencat < /dev/null | od -An -tx1; echo st=$?; echo '1 q' | gencat - | od -An -c; printf '1 m\\n' > m; gencat c m m 2>/dev/null; echo st=$?` },
    { name: 'gencat/old-not-catalog', script: `printf 'junk' > c; printf '1 a\\n' > m; gencat c m 2>/dev/null; echo st=$?; : > e; gencat e m 2>/dev/null; echo st=$?` },
    // ---- locale ----
    { name: 'locale/env-C', script: `${E} LC_ALL=C locale; echo st=$?` },
    { name: 'locale/env-unset', script: `${E} locale` },
    { name: 'locale/env-mixed', script: `${E} LANG=C.UTF-8 LC_TIME=POSIX LANGUAGE=fr locale` },
    { name: 'locale/env-invalid', script: `${E} LANG=xx_YY.UTF-8 LC_NUMERIC=C locale 2>/dev/null; echo st=$?; ${E} LC_ALL=xx_YY locale decimal_point 2>/dev/null` },
    { name: 'locale/k-C', script: `${E} LC_ALL=C locale -k ${ALL_CATS}` },
    { name: 'locale/k-C.UTF-8', script: `${E} LC_ALL=C.UTF-8 locale -k ${ALL_CATS}` },
    { name: 'locale/k-POSIX', script: `${E} LC_ALL=POSIX locale -ck LC_TIME LC_MONETARY` },
    { name: 'locale/plain', script: `${E} LC_ALL=C locale LC_NUMERIC; locale -c LC_PAPER abday era ctype-class-names alt_digits grouping conversion_rate charmap height` },
    { name: 'locale/keywords', script: `${E} LC_ALL=C locale -k decimal_point thousands_sep grouping LC_PAPER; ${E} LC_ALL=C locale -c decimal_point LC_MEASUREMENT` },
    { name: 'locale/unknown', script: `${E} LC_ALL=C locale decimal_point nosuch LC_NUMERIC 2>&1; echo st=$?; locale LANG 2>&1; echo st=$?; locale -k LC_ALL 2>&1; echo st=$?` },
    { name: 'locale/bad-option', script: `locale -z 2>/dev/null; echo st=$?; locale --nosuch 2>/dev/null; echo st=$?` },
    { name: 'locale/list', script: `locale -a; locale -a -m; locale -a extra; locale -m | grep -c UTF-8` },
    { name: 'locale/utf8-charmap', script: `${E} LC_ALL=C.UTF-8 locale charmap; ${E} LC_ALL=C locale charmap; ${E} LC_ALL=C.utf8 locale -c LC_IDENTIFICATION | head -3` },
    // ---- localedef (compiled into a LOCPATH directory, so no root is needed) ----
    ...['fr_FR', 'de_DE', 'en_US', 'ja_JP'].map(loc => ({
        name: `localedef/${loc}`,
        script: `${compile(loc)}ls loc/${loc}.UTF-8; ${E} LOCPATH="$PWD/loc" LC_ALL=${loc}.UTF-8 locale -k ${MODELLED}`,
    })),
    { name: 'localedef/locale-name-normalised', script: `${compile('fr_FR')}${E} LOCPATH="$PWD/loc" LC_ALL=fr_FR.utf8 locale charmap 2>/dev/null; ${E} LOCPATH="$PWD/loc" LC_ALL=fr_FR.UTF-8 locale yesstr` },
    { name: 'localedef/latin1', script: `${compile('en_US', 'ISO-8859-1')}${E} LOCPATH="$PWD/loc" LC_ALL=en_US.ISO-8859-1 locale -k charmap LC_NUMERIC LC_MONETARY d_fmt` },
    { name: 'localedef/charmap-alias', script: `localedef -f UTF8 -i de_DE "$PWD/de" 2>/dev/null; echo st=$?; localedef -f ISO-8859-15 -i de_DE "$PWD/de15"; echo st=$?; ls de15 | wc -l` },
    { name: 'localedef/partial-stdin', script: `printf 'LC_TIME\ncopy "POSIX"\nEND LC_TIME\nLC_NUMERIC\ndecimal_point "<U002C>"\nthousands_sep "."\ngrouping 3;3\nEND LC_NUMERIC\n' > src; localedef -f UTF-8 "$PWD/y" < src 2>/dev/null; echo st=$?; ls y; localedef -c "$PWD/y2" < src 2>/dev/null; echo st=$?` },
    { name: 'localedef/copy', script: `printf 'comment_char %%\nLC_MONETARY\ncopy "fr_FR"\nEND LC_MONETARY\n' > src; localedef -i src -f UTF-8 "$PWD/c" 2>/dev/null; echo st=$?; ls c` },
    { name: 'localedef/errors', script: `localedef </dev/null 2>/dev/null; echo st=$?; localedef a b </dev/null 2>/dev/null; echo st=$?; localedef -i missing "$PWD/x" 2>/dev/null; echo st=$?; localedef -f nomap -i fr_FR "$PWD/x" 2>/dev/null; echo st=$?; localedef -i src "$PWD/x" 2>/dev/null; echo st=$?; localedef --help | head -1; localedef -z x 2>/dev/null; echo st=$?; ls` },
];
