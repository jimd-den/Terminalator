/**
 * val - validate SCCS files (POSIX):
 *   val -
 *   val [-s] [-m name] [-r SID] [-y type] file...
 *
 * Checks that each file is an intact s-file (magic number, structure,
 * checksum) and optionally that a SID exists and that %M% / %Y% match.
 * With "-", each line of standard input is a separate argument list.
 * Diagnostics go to standard output ("file: message") unless -s. The exit
 * status ORs together, over all files:
 *   0x80 missing file argument      0x40 unknown or duplicate keyletter
 *   0x20 corrupted SCCS file        0x10 cannot open file or not SCCS
 *   0x08 SID invalid or ambiguous   0x04 SID does not exist
 *   0x02 %Y% / -y mismatch          0x01 %M% / -m mismatch
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext, getStdinAsString } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { Utility } from '../shared/Utility';
import { statPath, canAccess } from '../shared/FileInfo';
import { parseSFile } from './sccs/SFile';
import { Sid } from './sccs/Sid';
import { SccsEnv, sccsOptions } from './sccs/SccsSupport';

export const VAL_EXIT = {
    MISSING_FILE: 0x80,
    BAD_KEYLETTER: 0x40,
    CORRUPTED: 0x20,
    CANNOT_OPEN: 0x10,
    SID_INVALID: 0x08,
    SID_MISSING: 0x04,
    TYPE_MISMATCH: 0x02,
    NAME_MISMATCH: 0x01,
} as const;

export class ValCommand extends Utility {
    readonly utility = 'val';

    execute(args: string[], context: ProcessContext, state: TerminalState): CommandResponse {
        const env = new SccsEnv(context, state);
        let out = '';
        let status = 0;
        if (args.length === 1 && args[0] === '-') {
            const lines = (getStdinAsString(context) ?? '').split('\n').filter(l => l.trim());
            for (const line of lines) {
                const r = this.validate(line.trim().split(/\s+/), env, context);
                out += r.out;
                status |= r.status;
            }
        } else {
            const r = this.validate(args, env, context);
            out = r.out;
            status = r.status;
        }
        return { output: out, exitCode: status, newState: state };
    }

    private validate(args: string[], env: SccsEnv, context: ProcessContext): { out: string; status: number } {
        const o = sccsOptions(args, 'sm:r:y:');
        const silent = o.opts.has('s') || args.includes('-s');
        let out = '';
        const say = (msg: string) => { if (!silent) out += `${msg}\n`; };
        if (o.error) { say(`val: ${o.error}`); return { out, status: VAL_EXIT.BAD_KEYLETTER }; }
        const dup = [...o.opts.entries()].find(([, v]) => v.length > 1);
        if (dup) { say(`val: duplicate keyletter -- '${dup[0]}'`); return { out, status: VAL_EXIT.BAD_KEYLETTER }; }
        if (!o.operands.length) { say('val: missing file argument'); return { out, status: VAL_EXIT.MISSING_FILE }; }

        const rText = o.opts.get('r')?.[0];
        const sid = rText !== undefined ? Sid.parse(rText) : null;
        let status = 0;
        for (const path of o.operands) {
            const fail = (bit: number, msg: string) => { status |= bit; say(`${path}: ${msg}`); };
            if (!SccsEnv.isSccsName(path)) { fail(VAL_EXIT.CANNOT_OPEN, 'not an SCCS file'); continue; }
            const info = statPath(context, path);
            if (!info || info.kind === 'directory' || !canAccess(context, info, 4)) { fail(VAL_EXIT.CANNOT_OPEN, 'cannot open file'); continue; }
            const parsed = parseSFile(env.read(path) ?? '');
            if (!parsed.ok) { fail(VAL_EXIT.CORRUPTED, parsed.error); continue; }
            const file = parsed.file;
            if (!file.checksumOk) fail(VAL_EXIT.CORRUPTED, 'corrupted SCCS file (bad checksum)');
            if (rText !== undefined) {
                if (!sid || (sid.depth !== 2 && sid.depth !== 4)) fail(VAL_EXIT.SID_INVALID, `invalid or ambiguous SID '${rText}'`);
                else if (!file.live.some(d => d.sid.equals(sid))) fail(VAL_EXIT.SID_MISSING, `SID ${sid} does not exist`);
            }
            const y = o.opts.get('y')?.[0];
            if (y !== undefined && y !== (file.flags.get('t') ?? '')) fail(VAL_EXIT.TYPE_MISMATCH, `%Y%, -y mismatch`);
            const m = o.opts.get('m')?.[0];
            if (m !== undefined && m !== file.moduleName(SccsEnv.gName(path))) fail(VAL_EXIT.NAME_MISMATCH, `%M%, -m mismatch`);
        }
        return { out, status };
    }
}
