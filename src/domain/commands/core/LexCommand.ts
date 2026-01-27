import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file LexCommand.ts
 * @description The 'lex' command. Generate programs for lexical tasks.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class LexCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        let file = '';
        let output = 'lex.yy.c';

        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-t') {
                output = ''; // stdout
            } else if (args[i] === '-v') {
                // verbose
            } else if (!args[i].startsWith('-')) {
                file = args[i];
            }
        }

        if (!file) {
            return { output: 'lex: no input file', newState: state, exitCode: 1 };
        }

        const fs = context.fileSystemService;
        const node = fs.resolve(file, state.currentDirectory);
        if (!node || fs.isDirectory(node)) {
            return { output: `lex: ${file}: No such file or directory`, newState: state, exitCode: 1 };
        }

        // Generate Dummy C code
        const cCode = `
#include <stdio.h>
#include <stdlib.h>

int yylex(void) {
    return 0;
}

int main(int argc, char **argv) {
    yylex();
    return 0;
}
`;

        if (output) {
            fs.writeFile(state.currentDirectory + '/' + output, cCode, 'w', undefined, undefined, state.currentDirectory);
            return { output: '', newState: state, exitCode: 0 };
        } else {
            return { output: cCode, newState: state, exitCode: 0 };
        }
    }
}
