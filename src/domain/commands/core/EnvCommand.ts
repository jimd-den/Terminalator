/**
 * env - set the environment for command invocation (POSIX):
 * `env [-i] [-u name]... [name=value]... [utility [argument...]]`.
 * Without a utility, writes the resulting environment.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';

export class EnvCommand extends Utility {
    readonly utility = 'env';

    constructor(private fs?: FileSystemService) { super(); }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        let env: Record<string, string> = { ...context.env };
        let i = 0;
        for (; i < args.length; i++) {
            const a = args[i];
            if (a === '-i' || a === '-') { env = {}; continue; }
            if (a === '-u') { delete env[args[++i]]; continue; }
            if (a.startsWith('-u') && a.length > 2) { delete env[a.substring(2)]; continue; }
            if (a === '--') { i++; break; }
            if (a.startsWith('-') && a.length > 1) return this.usage(state, `invalid option -- '${a.substring(1)}'`, 125);
            break;
        }
        for (; i < args.length && /^[^=]+=/.test(args[i]); i++) {
            const eq = args[i].indexOf('=');
            env[args[i].substring(0, eq)] = args[i].substring(eq + 1);
        }
        const argv = args.slice(i);
        if (argv.length === 0) {
            const text = Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n');
            return this.respond(state, text ? text + '\n' : '');
        }
        if (!context.spawn) return this.usage(state, 'cannot run utilities here', 126);
        const status = await context.spawn(argv, { env });
        return { output: '', exitCode: status, newState: state };
    }
}
