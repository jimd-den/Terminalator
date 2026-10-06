"""Summarise failing legacy POSIX suite tests (command, expectation, actual) by utility."""
import re, sys
rep = open('comprehensive_compliance_report.txt').read()
src = open('scripts/posix_comprehensive_suite.ts').read()
want = set(a.upper() for a in sys.argv[1:])
for tid, desc, detail in re.findall(r'^\[FAIL\] (\w+): (.*?)\n((?:\s+.*\n)*?)(?=\[|UTILITY|\Z)', rep, re.M):
    if want and tid.rsplit('_', 1)[0] not in want:
        continue
    m = re.search(r"\{ id: '" + tid + r"'.*", src)
    line = m.group(0) if m else ''
    cmd = re.search(r"command: ('(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"|`[^`]*`)", line)
    exp = re.search(r"expect: (\{.*\})", line)
    setup = re.search(r"setup: (.*?), command:", line)
    print(f"## {tid} {desc}\n  setup: {setup.group(1)[:160] if setup else ''}\n  cmd: {cmd.group(1) if cmd else '?'}\n  exp: {exp.group(1)[:160] if exp else ''}\n{detail.rstrip()[:400]}\n")
