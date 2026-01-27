import { getStdinAsString } from '../../entities/ProcessContext';
/**
 * @file YaccCommand.ts
 * @description The 'yacc' command. Yet Another Compiler Compiler.
 */
import { ICommand, CommandResponse } from '../ICommand';
import { ProcessContext } from '../../../domain/entities/ProcessContext';
import { FileSystemService } from '../../../domain/services/FileSystemService';
import { TerminalState } from '../../entities/TerminalState';

export class YaccCommand implements ICommand {
    async execute(args: string[], context: ProcessContext, state: TerminalState): Promise<CommandResponse> {
        const input = getStdinAsString(context);
        let file = '';
        let prefix = 'y';
        let header = false;
        let graph = false;

        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-d') header = true;
            else if (args[i] === '-g') graph = true;
            else if (args[i] === '-b') {
                if (i + 1 < args.length) prefix = args[++i];
            } else if (!args[i].startsWith('-')) {
                file = args[i];
            }
        }

        if (!file) {
            return { output: 'yacc: no input file', newState: state, exitCode: 1 };
        }

        const fs = context.fileSystemService;
        const node = fs.resolve(file, state.currentDirectory);
        if (!node || fs.isDirectory(node)) {
            return { output: `yacc: ${file}: No such file or directory`, newState: state, exitCode: 1 };
        }

        const cCode = `
#include <stdio.h>
int yyparse(void) { return 0; }
        `;
        const hCode = `#ifndef _Y_TAB_H\n#define _Y_TAB_H\n#endif`;

        fs.writeFile(state.currentDirectory + '/' + prefix + '.tab.c', cCode, 'w', undefined, undefined, state.currentDirectory);
        if (header) {
            fs.writeFile(state.currentDirectory + '/' + prefix + '.tab.h', hCode, 'w', undefined, undefined, state.currentDirectory);
        }
        if (graph) {
            fs.writeFile(state.currentDirectory + '/' + prefix + '.dot', 'digraph {}', 'w', undefined, undefined, state.currentDirectory);
        }

        return { output: '', newState: state, exitCode: 0 };
    }
}
