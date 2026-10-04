/**
 * nohup - invoke a utility immune to hangups (POSIX): `nohup utility [argument...]`.
 * If standard output is a terminal, output is appended to nohup.out.
 * Exit status: the utility's, 126 if not executable, 127 if not found or no utility.
 */
import { CommandResponse } from '../ICommand';
import { ProcessContext } from '../../entities/ProcessContext';
import { TerminalState } from '../../entities/TerminalState';
import { FileSystemService } from '../../services/FileSystemService';
import { Utility } from '../shared/Utility';

export class NohupCommand extends Utility {
    readonly utility = 'nohup';

    constructor(private fs?: FileSystemService) { super(); }

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const argv = args[0] === '--' ? args.slice(1) : args;
        if (!argv.length) return this.usage(state, 'missing operand', 127);
        if (context.stdoutIsTty !== false) {
            // Run with output captured, then append it to nohup.out like the real thing.
            const fs = context.fileSystemService;
            const target = fs.resolveAbsolutePath('nohup.out', context.cwd);
            const quoted = argv.map(a => `'${a.replace(/'/g, `'\\''`)}'`).join(' ');
            const status = await context.spawn!(['sh', '-c', `exec ${quoted} >> '${target}' 2>&1`]);
            return this.respond(state, '', ["ignoring input and appending output to 'nohup.out'"], status);
        }
        const status = await context.spawn!(argv);
        return this.respond(state, '', [], status);
    }
}
