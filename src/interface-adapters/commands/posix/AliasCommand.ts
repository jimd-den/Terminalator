
import { ICommand, CommandResponse } from '../../../domain/entities/Command';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { TerminalState } from '../../../domain/entities/TerminalState';

export class AliasCommand implements ICommand {
    name = 'alias';
    description = 'Define or display aliases';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        // 1. List aliases if no args
        if (args.length === 0) {
            const aliases = state.aliases || {};
            const lines = Object.entries(aliases).map(([name, val]) => `alias ${name}='${val}'`);
            return {
                output: lines.length > 0 ? lines.join('\n') : '',
                exitCode: 0
            };
        }

        // 2. Set alias
        // format: name=value
        // We need to handle multiple args if they are quoted?
        // simple parsing for name=value strings
        // "alias foo='bar baz'" comes in as args ["foo=bar baz"] if quoted properly by shell,
        // but our shell split is simple. "foo=bar", "baz" ??
        // Let's assume the shell parser kept quotes or we need to rejoin.
        // Current shell `executeSingleCommand` splits by space.
        // So `alias foo='ls -l'` -> args: ["foo='ls", "-l'"]
        // We need to rejoin args to handle value with spaces? 
        // Or assume user types `alias foo="ls -l"` and shell handles quotes?
        // Our shell (ExecuteCommand) is naive split.
        // So we join args back together somewhat?
        // Actually, let's implement basic support: `alias name=value` (no spaces) works.
        // If spaces, we try to reconstruct.

        const fullArg = args.join(' ');
        const equalsIndex = fullArg.indexOf('=');

        if (equalsIndex === -1) {
            // Check if looking up alias: `alias name`
            const name = args[0];
            const aliases = state.aliases || {};
            if (aliases[name]) {
                return { output: `alias ${name}='${aliases[name]}'`, exitCode: 0 };
            }
            return { output: `alias: ${name}: not found`, exitCode: 1 };
        }

        const name = fullArg.substring(0, equalsIndex).trim();
        let value = fullArg.substring(equalsIndex + 1).trim();

        // Strip quotes if present
        if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
            value = value.substring(1, value.length - 1);
        }

        const newAliases = { ...(state.aliases || {}) };
        newAliases[name] = value;

        return {
            output: '',
            exitCode: 0,
            newState: { aliases: newAliases }
        };
    }
}

export class UnaliasCommand implements ICommand {
    name = 'unalias';
    description = 'Remove aliases';

    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        if (args.length === 0) {
            return { output: 'unalias: usage: unalias name [name ...]', exitCode: 1 };
        }

        const newAliases = { ...(state.aliases || {}) };
        let exitCode = 0;
        let output = '';

        for (const name of args) {
            if (newAliases[name]) {
                delete newAliases[name];
            } else {
                output += `unalias: ${name}: not found\n`;
                exitCode = 1;
            }
        }

        return {
            output: output.trim(),
            exitCode: exitCode,
            newState: { aliases: newAliases }
        };
    }
}
