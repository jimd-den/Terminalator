"""
Corrects legacy POSIX suite test definitions in place.
Usage (from python): patch('WC_01', cmd="'wc /f'", expect="{ exitCode: 0 }", setup="(fs) => ...")
Each argument replaces that field verbatim (TypeScript source text).
"""
import re, sys

PATH = 'scripts/posix_comprehensive_suite.ts'

def _field_span(line, key):
    i = line.find(key + ': ')
    if i < 0:
        return None
    j = i + len(key) + 2
    depth = 0
    quote = None
    k = j
    while k < len(line):
        c = line[k]
        if quote:
            if c == '\\':
                k += 2
                continue
            if c == quote:
                quote = None
        elif c in '\'"`':
            quote = c
        elif c in '({[':
            depth += 1
        elif c in ')}]':
            if depth == 0:
                break
            depth -= 1
        elif c == ',' and depth == 0:
            break
        k += 1
    return i, k

def patch_source(src, tid, **fields):
    m = re.search(r"\{ id: '" + tid + r"',.*", src)
    if not m:
        raise KeyError(tid)
    line = m.group(0)
    new = line
    for key in ('setup', 'command', 'expect'):
        if key not in fields:
            continue
        span = _field_span(new, key)
        value = fields[key]
        if span:
            new = new[:span[0]] + (f'{key}: {value}' if value is not None else '') + new[span[1]:]
            new = new.replace(', , ', ', ')
        elif value is not None:
            k = new.find('command: ')
            new = new[:k] + f'{key}: {value}, ' + new[k:]
    return src.replace(line, new, 1)

def patch_many(changes):
    src = open(PATH).read()
    for tid, fields in changes.items():
        src = patch_source(src, tid, **fields)
    open(PATH, 'w').write(src)
