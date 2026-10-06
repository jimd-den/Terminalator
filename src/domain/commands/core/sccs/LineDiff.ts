/**
 * LineDiff - a minimal longest-common-subsequence line diff, producing the
 * edit hunks delta weaves into the s-file and prints with `delta -p`.
 */

/** Replace old[oldStart, oldEnd) by new[newStart, newEnd). */
export interface Hunk {
    oldStart: number;
    oldEnd: number;
    newStart: number;
    newEnd: number;
}

export function diffLines(a: string[], b: string[]): Hunk[] {
    let pre = 0;
    while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
    let suf = 0;
    while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
    const x = a.slice(pre, a.length - suf);
    const y = b.slice(pre, b.length - suf);

    // LCS table over the differing middle section.
    const n = x.length, m = y.length;
    const table: Uint32Array[] = [];
    for (let i = 0; i <= n; i++) table.push(new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
            table[i][j] = x[i] === y[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
        }
    }

    const hunks: Hunk[] = [];
    let i = 0, j = 0;
    let open: Hunk | null = null;
    const flush = () => { if (open) { hunks.push(open); open = null; } };
    while (i < n || j < m) {
        if (i < n && j < m && x[i] === y[j]) { flush(); i++; j++; continue; }
        if (!open) open = { oldStart: pre + i, oldEnd: pre + i, newStart: pre + j, newEnd: pre + j };
        if (j < m && (i >= n || table[i][j + 1] >= table[i + 1][j])) { j++; open.newEnd = pre + j; }
        else { i++; open.oldEnd = pre + i; }
    }
    flush();
    return hunks;
}

/** Renders hunks in the default diff(1) output format ("2c2", "< old", "---", "> new"). */
export function normalDiff(a: string[], b: string[], hunks: Hunk[]): string {
    const range = (s: number, e: number) => (e - s <= 1 ? String(Math.max(s, e)) : `${s + 1},${e}`);
    let out = '';
    for (const h of hunks) {
        const dels = h.oldEnd - h.oldStart, adds = h.newEnd - h.newStart;
        if (!dels) out += `${h.oldStart}a${range(h.newStart, h.newEnd)}\n`;
        else if (!adds) out += `${range(h.oldStart, h.oldEnd)}d${h.newStart}\n`;
        else out += `${range(h.oldStart, h.oldEnd)}c${range(h.newStart, h.newEnd)}\n`;
        for (let k = h.oldStart; k < h.oldEnd; k++) out += `< ${a[k]}\n`;
        if (dels && adds) out += '---\n';
        for (let k = h.newStart; k < h.newEnd; k++) out += `> ${b[k]}\n`;
    }
    return out;
}
